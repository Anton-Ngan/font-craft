// content/content-iframe-bridge.js
// Injected into the TOP-LEVEL frame only (all_frames: false).
// Relays settings to child iframes via postMessage for cross-origin frames
// that have the content script injected but can't receive chrome.runtime messages directly.

(() => {
  const BRIDGE_MSG_TYPE = 'FA_BRIDGE_SETTINGS';

  // When settings change (via storage), broadcast to all child frames
  chrome.storage.onChanged.addListener(async (changes) => {
    if (!changes[STORAGE_KEYS.SETTINGS] && !changes[STORAGE_KEYS.SITE_MODE] && !changes[STORAGE_KEYS.SITE_LIST]) return;

    const settings = await FontStorage.getSettings();
    broadcastToFrames(settings);
  });

  function broadcastToFrames(settings) {
    try {
      const frames = window.frames;
      for (let i = 0; i < frames.length; i++) {
        try {
          frames[i].postMessage({ type: BRIDGE_MSG_TYPE, settings }, '*');
        } catch {
          // Cross-origin postMessage to sandboxed frames may throw; ignore
        }
      }
    } catch { /* ignore */ }
  }

  // Also listen for iframe bridge messages coming UP (e.g. inspector results from within a frame)
  window.addEventListener('message', (e) => {
    if (!e.data || e.data.type !== 'FA_INSPECTOR_RESULT_FROM_FRAME') return;
    // Forward to extension popup via runtime message
    try {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.INSPECTOR_RESULT,
        result: e.data.result,
        fromFrame: true,
      });
    } catch { /* ignore */ }
  });
})();
