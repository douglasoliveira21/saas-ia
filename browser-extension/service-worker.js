chrome.runtime.onInstalled.addListener(() => chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }));
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "capture") {
    chrome.tabs.captureVisibleTab(undefined, { format: "png" }).then((dataUrl) => sendResponse({ dataUrl })).catch((error) => sendResponse({ error: error.message }));
    return true;
  }
});
