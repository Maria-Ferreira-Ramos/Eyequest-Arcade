// Player profiles, saved in this browser on this computer (localStorage).
// Nothing is sent anywhere. If the browser won't let us save (some private windows),
// everything still works for this visit and is simply forgotten afterwards.
(function (exports) {
  "use strict";

  const KEY = "eyequest-arcade-v1";

  function blankData() {
    return { version: 1, profiles: {}, current: null };
  }

  function newProfile(name, guest = false) {
    return {
      id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      name,
      guest,
      onboarded: false,
      weakEye: "unknown",
      goalXp: 20,
      xp: 0,
      streak: 0,
      bestStreak: 0,
      freezes: 0,
      lastActive: null,
      lessons: {},         // lesson id -> best stars
      sessions: [],        // every finished lesson
      badges: {},          // badge id -> day earned
      created: Date.now(),
    };
  }

  function load(storage) {
    try {
      const raw = storage.getItem(KEY);
      const data = raw ? JSON.parse(raw) : null;
      if (data && data.profiles) return data;
    } catch {
      // Unreadable or blocked storage: start fresh rather than break.
    }
    return blankData();
  }

  function makeStore(storage) {
    let data = load(storage);
    let saving = true;
    // If the browser refuses to save, the data simply stays in memory for this visit.
    const persist = () => {
      try {
        storage.setItem(KEY, JSON.stringify(data));
        saving = true;
      } catch {
        saving = false;
      }
      return saving;
    };
    return {
      profiles: () => Object.values(data.profiles).sort((a, b) => a.created - b.created),
      current: () => (data.current && data.profiles[data.current]) || null,
      create(name, guest = false) {
        const profile = newProfile(name, guest);
        data.profiles[profile.id] = profile;
        data.current = profile.id;
        persist();
        return profile;
      },
      select(id) {
        if (data.profiles[id]) data.current = id;
        persist();
      },
      signOut() {
        data.current = null;
        persist();
      },
      remove(id) {
        delete data.profiles[id];
        if (data.current === id) data.current = null;
        persist();
      },
      nameTaken(name, exceptId = null) {
        const wanted = name.trim().toLowerCase();
        return Object.values(data.profiles).some((p) => p.id !== exceptId && p.name.toLowerCase() === wanted);
      },
      // Call after changing the current profile.
      save: persist,
      exportJson: () => JSON.stringify(data, null, 2),
      // False when the browser won't keep progress (some private windows).
      isSaving: () => saving,
    };
  }

  exports.makeStore = makeStore;
  exports.newProfile = newProfile;
  exports.KEY = KEY;
})(typeof module !== "undefined" ? module.exports : (window.Store = {}));
