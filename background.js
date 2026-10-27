chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === "toggle-panel") {
    await chrome.sidePanel.open({
      windowId: tab.windowId,
    });
  }
});
