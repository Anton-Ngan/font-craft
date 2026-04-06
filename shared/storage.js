// shared/storage.js
// Tiered chrome.storage abstraction: sync for settings/profiles/whitelist,
// local for custom font binaries. Falls back to local if sync unavailable.

const FontStorage = (() => {
  // ---------- helpers ----------

  function mergeWithDefaults(stored) {
    return Object.assign({}, DEFAULT_SETTINGS, stored || {});
  }

  // ---------- settings ----------

  async function getSettings() {
    // Local is always written first (reliable, no rate limits) — prefer it.
    const localResult = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    if (localResult[STORAGE_KEYS.SETTINGS] !== undefined) {
      return mergeWithDefaults(localResult[STORAGE_KEYS.SETTINGS]);
    }
    // Local empty: fresh install or different device — fall back to sync.
    try {
      const syncResult = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
      return mergeWithDefaults(syncResult[STORAGE_KEYS.SETTINGS]);
    } catch {
      return mergeWithDefaults(undefined);
    }
  }

  async function saveSettings(settings) {
    const merged = Object.assign({}, DEFAULT_SETTINGS, settings);
    // Always write to local first: reliable and not rate-limited.
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: merged });
    // Best-effort sync write for cross-device support (may be rate-limited; ignored on failure).
    chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: merged }).catch(() => {});
    return merged;
  }

  // ---------- site list ----------

  async function getSiteConfig() {
    try {
      const result = await chrome.storage.sync.get([STORAGE_KEYS.SITE_MODE, STORAGE_KEYS.SITE_LIST]);
      return {
        siteMode: result[STORAGE_KEYS.SITE_MODE] || SITE_MODES.GLOBAL,
        siteList: result[STORAGE_KEYS.SITE_LIST] || [],
      };
    } catch {
      const result = await chrome.storage.local.get([STORAGE_KEYS.SITE_MODE, STORAGE_KEYS.SITE_LIST]);
      return {
        siteMode: result[STORAGE_KEYS.SITE_MODE] || SITE_MODES.GLOBAL,
        siteList: result[STORAGE_KEYS.SITE_LIST] || [],
      };
    }
  }

  async function saveSiteConfig(siteMode, siteList) {
    const data = {
      [STORAGE_KEYS.SITE_MODE]: siteMode,
      [STORAGE_KEYS.SITE_LIST]: siteList,
    };
    try {
      await chrome.storage.sync.set(data);
    } catch {
      await chrome.storage.local.set(data);
    }
  }

  // ---------- profiles ----------
  // Primary store: chrome.storage.local. Also reads sync as fallback for profiles
  // saved before the local-only migration, merging indexes on first access.

  async function getProfileIndex() {
    try {
      const localRes = await chrome.storage.local.get(STORAGE_KEYS.PROFILE_INDEX);
      const localIndex = localRes[STORAGE_KEYS.PROFILE_INDEX] || [];
      try {
        const syncRes = await chrome.storage.sync.get(STORAGE_KEYS.PROFILE_INDEX);
        const syncIndex = syncRes[STORAGE_KEYS.PROFILE_INDEX] || [];
        const merged = [...new Set([...localIndex, ...syncIndex])];
        if (merged.length !== localIndex.length) {
          // Migrate: save merged index to local so future reads are local-only
          await chrome.storage.local.set({ [STORAGE_KEYS.PROFILE_INDEX]: merged });
        }
        return merged;
      } catch {
        return localIndex;
      }
    } catch {
      return [];
    }
  }

  async function getProfile(id) {
    // Try local first (current store), then sync (pre-migration fallback)
    const localRes = await chrome.storage.local.get(`profile_${id}`);
    if (localRes[`profile_${id}`]) return localRes[`profile_${id}`];
    try {
      const syncRes = await chrome.storage.sync.get(`profile_${id}`);
      return syncRes[`profile_${id}`] || null;
    } catch {
      return null;
    }
  }

  async function getAllProfiles() {
    const index = await getProfileIndex();
    const results = await Promise.all(index.map(id => getProfile(id)));
    return results
      .map((p, i) => p ? { id: index[i], ...p } : null)
      .filter(Boolean);
  }

  async function saveProfile(name, settings) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const profile = { name, created: Date.now(), settings: Object.assign({}, settings) };
    const index = await getProfileIndex();
    index.push(id);
    await chrome.storage.local.set({
      [STORAGE_KEYS.PROFILE_INDEX]: index,
      [`profile_${id}`]: profile,
    });
    return { id, ...profile };
  }

  async function deleteProfile(id) {
    const index = await getProfileIndex();
    const newIndex = index.filter(i => i !== id);
    await chrome.storage.local.remove(`profile_${id}`);
    await chrome.storage.local.set({ [STORAGE_KEYS.PROFILE_INDEX]: newIndex });
  }

  async function renameProfile(id, newName) {
    const res = await chrome.storage.local.get(`profile_${id}`);
    const profile = res[`profile_${id}`];
    if (!profile) return null;
    const updated = { ...profile, name: newName };
    await chrome.storage.local.set({ [`profile_${id}`]: updated });
    return { id, ...updated };
  }

  async function exportProfile(id) {
    const profile = await getProfile(id);
    if (!profile) return null;
    return JSON.stringify({ version: 1, profile }, null, 2);
  }

  async function importProfile(jsonStr) {
    const data = JSON.parse(jsonStr);
    if (!data.profile || !data.profile.name || !data.profile.settings) {
      throw new Error('Invalid profile format');
    }
    return saveProfile(data.profile.name + ' (imported)', data.profile.settings);
  }

  // ---------- custom fonts ----------

  async function getCustomFontsMeta() {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEYS.CUSTOM_FONTS_META);
      return result[STORAGE_KEYS.CUSTOM_FONTS_META] || [];
    } catch {
      const result = await chrome.storage.local.get(STORAGE_KEYS.CUSTOM_FONTS_META);
      return result[STORAGE_KEYS.CUSTOM_FONTS_META] || [];
    }
  }

  async function saveCustomFont(name, dataUrl, format) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const meta = await getCustomFontsMeta();
    meta.push({ id, name, format, source: 'upload' });
    // Binary data to local, metadata to sync
    await chrome.storage.local.set({ [`customFont_${id}`]: dataUrl });
    try {
      await chrome.storage.sync.set({ [STORAGE_KEYS.CUSTOM_FONTS_META]: meta });
    } catch {
      await chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_FONTS_META]: meta });
    }
    return { id, name, format };
  }

  async function saveGoogleFont(name, url) {
    const id = `gf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const meta = await getCustomFontsMeta();
    meta.push({ id, name, url, source: 'google' });
    try {
      await chrome.storage.sync.set({ [STORAGE_KEYS.CUSTOM_FONTS_META]: meta });
    } catch {
      await chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_FONTS_META]: meta });
    }
    return { id, name, url };
  }

  async function getCustomFontData(id) {
    const result = await chrome.storage.local.get(`customFont_${id}`);
    return result[`customFont_${id}`] || null;
  }

  async function deleteCustomFont(id) {
    const meta = await getCustomFontsMeta();
    const newMeta = meta.filter(f => f.id !== id);
    await chrome.storage.local.remove(`customFont_${id}`);
    try {
      await chrome.storage.sync.set({ [STORAGE_KEYS.CUSTOM_FONTS_META]: newMeta });
    } catch {
      await chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_FONTS_META]: newMeta });
    }
  }

  async function renameCustomFont(id, newName) {
    const meta = await getCustomFontsMeta();
    const idx = meta.findIndex(f => f.id === id);
    if (idx === -1) return null;
    meta[idx] = { ...meta[idx], name: newName };
    try {
      await chrome.storage.sync.set({ [STORAGE_KEYS.CUSTOM_FONTS_META]: meta });
    } catch {
      await chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_FONTS_META]: meta });
    }
    return meta[idx];
  }

  return {
    getSettings, saveSettings,
    getSiteConfig, saveSiteConfig,
    getProfileIndex, getProfile, getAllProfiles, saveProfile, deleteProfile, renameProfile,
    exportProfile, importProfile,
    getCustomFontsMeta, saveCustomFont, saveGoogleFont, getCustomFontData, deleteCustomFont, renameCustomFont,
  };
})();
