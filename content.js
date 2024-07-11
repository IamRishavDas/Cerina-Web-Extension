// Function to get video details
function getVideoDetails() {
    const videoId = new URL(window.location.href).searchParams.get("v");
    const videoTitle = document.querySelector('h1.title').innerText;
    
    return { videoId, videoTitle };
  }
  
  // Function to inject button for fetching summary
  function injectSummaryButton() {
    // Ensure we are on a YouTube video page
    if (window.location.pathname === "/watch") {
      const buttonContainer = document.querySelector('#top-level-buttons-computed');
      
      if (buttonContainer) {
        const summaryButton = document.createElement('button');
        summaryButton.innerText = 'Get Summary';
        summaryButton.style.cssText = `
          background-color: #ff0000;
          color: #fff;
          border: none;
          padding: 10px;
          margin-left: 10px;
          cursor: pointer;
        `;
        
        summaryButton.addEventListener('click', () => {
          chrome.runtime.sendMessage({ action: 'fetchSummary', videoDetails: getVideoDetails() }, (response) => {
            if (response.summary) {
              alert(response.summary);
            } else {
              alert('Failed to fetch summary.');
            }
          });
        });
        
        buttonContainer.appendChild(summaryButton);
      }
    }
  }
  
  // Run the inject function when the content script is loaded
  injectSummaryButton();
  