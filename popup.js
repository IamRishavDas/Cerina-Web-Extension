


let videoId = "";
let summaryCount = 0;
const FREE_LIMIT = 2;
const OPENAI_API_KEY = 'sk-proj-TmD7dqNk4l0Al1IHc1ufT3BlbkFJDsIxPiLY27v7SSmIyGkQ';
const RAPIDAPI_KEY_SUMMARY = '089cd241f5msh667559377056ecep194c13jsn017d474e34bf';
const RAPIDAPI_HOST_SUMMARY = 'yt-api.p.rapidapi.com';
const RAPIDAPI_KEY_TRANSCRIPT = '8dac6764bemshdf021d22c47d915p18f214jsn0c07e1cd4fe5';
// '43e75b6581msh0296fd5efec27f9p1d06dcjsnc2a33fd03964';
// '394fc35840msh120a1f47e581ba7p13d724jsn95cbbc302270';
// '089cd241f5msh667559377056ecep194c13jsn017d474e34bf';
const RAPIDAPI_HOST_TRANSCRIPT = 'youtube-transcriptor.p.rapidapi.com';

document.addEventListener('DOMContentLoaded', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        let url = new URL(tabs[0].url);
        // console.log("Current URL:", url.href);

        if (url.hostname === "www.youtube.com" && url.pathname === "/watch") {
            videoId = url.searchParams.get("v");
            // console.log("Video ID:", videoId);
            fetchTranscript(videoId)
            // fetchSummary(videoId);
            fetchNotes(videoId);
        } else {
            // document.getElementById("summary").innerText = "Please navigate to a YouTube video.";
        }
    });
});


async function fetchTranscript(videoId) {

    chrome.storage.local.get(['summaryCount'], async function (result) {
        summaryCount = result.summaryCount || 0;
        if (summaryCount < FREE_LIMIT) {
            try {
                const transcript = await getTranscriptFromRapidAPI(videoId);
                document.getElementById('transcript').innerText = transcript;
                chrome.storage.local.set({ ['transcript_' + videoId]: transcript });

                summaryCount++;
                chrome.storage.local.set({ summaryCount: summaryCount });
            } catch (error) {
                console.error('Error fetching transcript:', error);
                document.getElementById('transcript').innerText = "Error fetching transcript.";
            }
        } else {
            document.getElementById('transcript').innerText = "You have reached the free Transcript limit. Please subscribe.";
            document.getElementById('summary').innerText = "You have reached the free summary limit. Please subscribe.";
            showSubscriptionOption();
        }
    });
}


async function getTranscriptFromRapidAPI(videoId) {
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': RAPIDAPI_KEY_TRANSCRIPT,
            'X-RapidAPI-Host': RAPIDAPI_HOST_TRANSCRIPT
        }
    };

    try {
        const requestURL = `https://${RAPIDAPI_HOST_TRANSCRIPT}/transcript?video_id=${videoId}&lang=en`;
        // console.log("Trasncript request URL: ", requestURL);
        const response = await fetch(requestURL, options);
        // console.log("Trasncript respone: ", response);
        if (!response.ok) {
            throw new Error(`Error fetching transcript: ${response.statusText}`);
        }
        const data = await response.json();
        // console.log("JSON Data: ", data)
        // console.log("data.transcription: ", data.transcription)
        return extractTranscript(data) || "No transcript available for this video.";
    } catch (error) {
        console.error("Error fetching transcript from RapidAPI: ", error);
        throw error;
    }
}

async function extractTranscript(data) {
    let str = "";
    let transcriptAsText = data[0].transcriptionAsText;
    fetchSummaryFromOpenAiAPI(transcriptAsText);
    for (let i = 0; i < data[0].transcription.length; i++) {
        str += data[0].transcription[i].start + ' - ' + data[0].transcription[i].dur + ' ' + data[0].transcription[i].subtitle + '  \n';
    }
    return str;
}


async function fetchSummaryFromOpenAiAPI(transcriptAsText) {
    chrome.storage.local.get(['summaryCount'], async function (result) {
        summaryCount = result.summaryCount || 0;

        if (summaryCount < FREE_LIMIT) {
            try {
                // console.log("summary called");

                let summary = await getSummaryFromOpenAiApi(transcriptAsText);
                // console.log("fetchSummary: ", summary);

                document.getElementById('summary').innerText = summary;
                chrome.storage.local.set({ ['summary_' + videoId]: summary });

                summaryCount++;
                chrome.storage.local.set({ summaryCount: summaryCount });
            } catch (error) {
                console.error("Error fetching summary: ", error);
                document.getElementById('summary').innerText = "Error fetching summary.";
            }
        } else {
            document.getElementById('summary').innerText = "You have reached the free summary limit. Please subscribe.";
            showSubscriptionOption();
        }
    });
}

const maxTokens = 4096;
const maxPromptTokens = maxTokens - 500; 


async function getSummaryFromOpenAiApi(transcriptAsText) {
    const apiKey = OPENAI_API_KEY;

    console.log("before truncate: ", transcriptAsText)

    const estimatedTokens = Math.ceil(transcriptAsText.length/4);
    if(estimatedTokens> maxPromptTokens){
        const maxLength = Math.floor(maxPromptTokens * 4);
        transcriptAsText =  transcriptAsText.slice(0, maxLength);
    }
    
    console.log("after truncate: ", transcriptAsText);
    if (summaryCount < FREE_LIMIT) {
        try {
            const response = await fetch('https://api.openai.com/v1/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo-instruct', // maxTokens = 4096
                    prompt: `Summarize the following transcript:\n\n${transcriptAsText}`,
                    max_tokens: 100,
                    temperature: 0.7
                })
            });

            const data = await response.json();
            console.log(data)
            const summary = data.choices[0].text.trim();
            return summary;
        } catch (error) {
            console.error('Error fetching summary from OpenAI:', error);
            return 'Error fetching summary.';
        }
    } else {
        document.getElementById('summary').innerText = "You have reached the free summary limit. Please subscribe.";
        showSubscriptionOption();
    }
}

async function fetchSummary(videoId) {
    chrome.storage.local.get(['summaryCount'], async function (result) {
        summaryCount = result.summaryCount || 0;

        if (summaryCount < FREE_LIMIT) {
            try {
                // console.log("summary called");

                let summary = await getSummaryFromRapidAPI(videoId);
                // console.log("fetchSummary: ", summary);

                document.getElementById('summary').innerText = summary;
                chrome.storage.local.set({ ['summary_' + videoId]: summary });

                summaryCount++;
                chrome.storage.local.set({ summaryCount: summaryCount });
            } catch (error) {
                console.error("Error fetching summary: ", error);
                document.getElementById('summary').innerText = "Error fetching summary.";
            }
        } else {
            document.getElementById('summary').innerText = "You have reached the free summary limit. Please subscribe.";
            showSubscriptionOption();
        }
    });
}

async function getSummaryFromRapidAPI(videoId) {
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': RAPIDAPI_KEY_SUMMARY,
            'X-RapidAPI-Host': RAPIDAPI_HOST_SUMMARY
        }
    };

    try {
        const targetURL = `https://yt-api.p.rapidapi.com/dl?id=${videoId}`;
        // console.log(targetURL)
        const response = await fetch(targetURL, options);
        // console.log(response);
        if (!response.ok) {
            throw new Error(`Error fetching summary: ${response.statusText}`);
        }
        const data = await response.json();
        return data.description || "No summary available for this video.";
    } catch (error) {
        console.error("Error fetching summary from RapidAPI: ", error);
        throw error;
    }
}

function fetchNotes(videoId) {
    chrome.storage.local.get(['notes_' + videoId], function (result) {
        let notes = result['notes_' + videoId];
        if (notes) {
            document.getElementById('notes').value = notes;
        }
    });
}

function saveNotes() {
    let notes = document.getElementById('notes').value;
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        let url = new URL(tabs[0].url);
        let videoId = url.searchParams.get("v");
        chrome.storage.local.set({ ['notes_' + videoId]: notes }, function () {
            alert("Notes saved.");
        });
    });
}

function checkSubscription() {
    chrome.storage.local.get(['subscribed'], function (result) {
        if (!result.subscribed) {
            showSubscriptionOption();
        }
    });
}

function showSubscriptionOption() {
    let subscriptionDiv = document.getElementById('subscription');
    subscriptionDiv.innerHTML = `
      <button id="subscribe">Subscribe</button>
    `;
    document.getElementById('subscribe').addEventListener('click', function () {
        const amount = 500; //  amount in paise (₹5.00)
        const email = 'user@example.com';

        const paymentUrl = `https://razorpay.com/`;

        // Open payment link in a new tab
        window.open(paymentUrl, '_blank');
    });
}

chrome.runtime.onInstalled.addListener(function () {
    chrome.storage.local.set({ summaryCount: 0, subscribed: false });
});
