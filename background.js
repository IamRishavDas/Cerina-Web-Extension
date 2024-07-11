chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.local.set({summaryCount: 0, subscribed: false});
  });
  