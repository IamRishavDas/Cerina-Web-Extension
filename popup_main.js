let videoId = "";
let summaryCount = 0;
const FREE_LIMIT = 2;

document.addEventListener('DOMContentLoaded', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        let url = new URL(tabs[0].url);
        // console.log("Current URL:", url.href); 

        if (url.hostname === "www.youtube.com" && url.pathname === "/watch") {
            let videoId = url.searchParams.get("v");
            // console.log("Video ID:", videoId); 
            fetchSummary(videoId);
            fetchNotes(videoId);

        } else {
            document.getElementById("summary").innerText = "Please navigate to a YouTube video.";
        }
    });
});



async function fetchSummary(videoId) {
    chrome.storage.local.get(['summaryCount'], async function (result) {
        summaryCount = result.summaryCount || 0;

        if (summaryCount < FREE_LIMIT) {
            try {
                console.log("summary called")

                let transcript = await fetchTranscript(videoId);
                console.log("fetchSummary: ", transcript)
                let summary = await generateSummary(transcript);

                console.log("fetchSummary: ", summary)

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


async function fetchTranscript(videoId) {
    try {
        const accessToken = await getAccessToken();
        // console.log(accessToken)
        const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}`;
        // console.log(captionsUrl)

        const response = await fetch(captionsUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch captions from YouTube Data API');
        }

        const data = await response.json();
        const captionTrack = data.items.find(item => item.snippet.trackKind === 'asr' && item.snippet.language === 'en');
        if (!captionTrack) {
            throw new Error('No suitable captions found for the video');
        }

        const captionText = await fetchCaptionText(captionTrack.id, accessToken);
        return captionText;
    } catch (error) {
        console.error('Error fetching transcript:', error);
        throw error;
    }
}


function getAccessToken() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, token => {
            if (chrome.runtime.lastError) {
                console.error('Error during getAuthToken:', chrome.runtime.lastError.message);
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            console.log('Token received:', token);
            resolve(token);
        });
    });
}

async function fetchCaptionText(captionId, accessToken) {
    const captionUrl = `https://www.googleapis.com/youtube/v3/captions/${captionId}`;

    try {
        const response = await fetch(captionUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch caption text from YouTube Data API: ${response.status} ${response.statusText}`);
        }

        const data = await response.text();
        return data;
    } catch (error) {
        console.error('Error fetching caption text:', error);
        throw error;
    }
}


  

async function pollTranscript(apiKey, transcriptId) {
    while (true) {
        const response = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
            headers: {
                'authorization': apiKey
            }
        });

        if (response.status === 200) {
            const transcriptData = response.data;
            if (transcriptData.status === 'completed') {
                return transcriptData.text;
            } else if (transcriptData.status === 'failed') {
                throw new Error("Failed to transcribe the video");
            }
        } else {
            throw new Error("Error polling transcript");
        }

        // Wait for a few seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

async function generateSummary(transcript) {
    const openaiApiKey = 'sk-proj-ZX74Oqqygr72bnm1c7vrT3BlbkFJmYttysriRoFQPVvrBJSw';
    const apiUrl = 'https://api.openai.com/v1/engines/davinci-codex/completions';

    const response = await axios.post(apiUrl, {
        prompt: `Summarize the following transcript:\n\n${transcript}\n\nSummary:`,
        max_tokens: 150,
        temperature: 0.7,
    }, {
        headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
        }
    });

    if (response.status === 200) {
        console.log(response.data.choices[0].text.trim());
        return response.data.choices[0].text.trim();
    } else {
        throw new Error("Failed to generate summary");
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

        window.open(paymentUrl, '_blank');
    });
}

