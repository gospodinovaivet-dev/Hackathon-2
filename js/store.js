// Saved app state: who is signed in, which fridge is paired, and the food list.
// Always kept in this browser. On the shared claude.ai link it is also synced live between your
// devices (same Claude account), so a photo taken on the phone updates the list on the computer.
const Store = (() => {
  const KEY = "chillcheck.v1";
  // eaten: [{ name, date }] for the "Food & your body" page, newest last
  const empty = () => ({ user: null, device: null, items: [], lastScan: null, eaten: [] });
  const state = empty();
  try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { /* start empty */ }

  let ref = null;           // this user's private document in the artifact's database
  let synced = false;
  let writing = false, writeAgain = false;
  let lastWriteId = null;   // to recognise our own writes when they come back
  const listeners = [];

  const saveLocal = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage blocked: keep working in memory */ }
  };

  // One write at a time; if more changes come in meanwhile, send the latest once it's done
  async function push() {
    if (!ref) return;
    if (writing) { writeAgain = true; return; }
    writing = true;
    lastWriteId = Math.random().toString(36).slice(2);
    try {
      await ref.set(JSON.parse(JSON.stringify({ ...state, writeId: lastWriteId })));
    } catch { /* offline or not allowed: this device keeps its own copy */ }
    writing = false;
    if (writeAgain) { writeAgain = false; push(); }
  }

  async function connect() {
    try {
      const [db, user] = await Promise.all([window.claude?.use?.("db"), window.claude?.use?.("user")]);
      const uid = db && user ? await user.id() : null;
      if (!uid) return false;
      ref = db.doc(`data/users/${uid}/fridge`);
    } catch {
      return false;
    }
    synced = true;
    ref.onSnapshot(snap => {
      if (snap.metadata.hasPendingWrites) return;
      if (!snap.exists) { push(); return; }           // first device to connect uploads what it has
      const remote = JSON.parse(JSON.stringify(snap.data()));
      if (remote.writeId === lastWriteId) return;      // our own write coming back
      delete remote.writeId;
      Object.assign(state, empty(), remote);
      saveLocal();
      listeners.forEach(fn => fn());
    }, () => { synced = false; });
    return true;
  }

  return {
    get: () => state,
    isSynced: () => synced,
    connect,
    onRemoteChange: fn => listeners.push(fn),
    save() { saveLocal(); push(); },
    reset() { Object.assign(state, empty()); this.save(); }
  };
})();
