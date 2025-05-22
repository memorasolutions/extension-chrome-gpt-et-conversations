chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);
});

