// background/service-worker.js (MV3 Service Worker)
// Handles: badge updates, icon state, message routing.
// NO in-memory state — SW may be terminated and restarted at any time.

// Storage key constants (inlined — SW can't use content-script shared files)
const SK_SETTINGS = "settings";
const SK_SITE_MODE = "siteMode";
const SK_SITE_LIST = "siteList";

const BADGE_ON = { text: "ON", color: "#16a34a" };
const BADGE_OFF = { text: "", color: "#6b7280" };

// ---------- badge helpers ----------

async function updateBadgeForTab(tabId, tabUrl) {
  try {
    const url = new URL(tabUrl);
    const hostname = url.hostname;
    if (!hostname) {
      clearBadge(tabId);
      return;
    }

    // Single batched read — one round-trip instead of three
    const stored = await chrome.storage.sync.get([
      SK_SETTINGS,
      SK_SITE_MODE,
      SK_SITE_LIST,
    ]);
    const siteMode = stored[SK_SITE_MODE] || "global";
    const siteList = stored[SK_SITE_LIST] || [];
    const settings = stored[SK_SETTINGS] || {};
    const enabled = settings.enabled !== false;

    let siteActive;
    switch (siteMode) {
      case "whitelist":
        siteActive = siteList.some(
          (s) => hostname === s || hostname.endsWith("." + s),
        );
        break;
      case "blacklist":
        siteActive = !siteList.some(
          (s) => hostname === s || hostname.endsWith("." + s),
        );
        break;
      default:
        siteActive = true;
    }

    if (enabled && siteActive) {
      await chrome.action.setBadgeText({ text: BADGE_ON.text, tabId });
      await chrome.action.setBadgeBackgroundColor({
        color: BADGE_ON.color,
        tabId,
      });
    } else {
      await chrome.action.setBadgeText({ text: BADGE_OFF.text, tabId });
    }
  } catch {
    clearBadge(tabId);
  }
}

async function clearBadge(tabId) {
  try {
    await chrome.action.setBadgeText({ text: "", tabId });
  } catch {
    /* ignore */
  }
}

// ---------- tab listeners ----------

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    updateBadgeForTab(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url) updateBadgeForTab(tabId, tab.url);
  } catch {
    /* ignore */
  }
});

// ---------- storage change → update badge on active tab ----------

chrome.storage.onChanged.addListener(async (changes) => {
  const relevantKeys = ["settings", "siteMode", "siteList"];
  if (!relevantKeys.some((k) => k in changes)) return;
  try {
    const tabs = await chrome.tabs.query({ active: true });
    for (const tab of tabs) {
      if (tab.id && tab.url) updateBadgeForTab(tab.id, tab.url);
    }
  } catch {
    /* ignore */
  }
});

// ---------- message routing ----------
// Relay messages from popup/options to the active content script tab

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_BADGE") {
    // Sent by content script to update badge for that tab
    if (sender.tab?.id && sender.tab?.url) {
      updateBadgeForTab(sender.tab.id, sender.tab.url);
    }
    sendResponse({ ok: true });
    return false;
  }
});

// ---------- install / update ----------

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === "install") {
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  }
});
