// Tiny IndexedDB wrapper so recordings survive a page reload (this browser only).
window.Store = (() => {
  const DB = "final-form", OS = "recordings";
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(OS);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(OS, mode), req = fn(t.objectStore(OS));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
    });
  }
  const safe = (p, fallback) => p.catch(() => fallback);
  return {
    get: key => safe(tx("readonly", s => s.get(key)), undefined),
    set: (key, blob) => safe(tx("readwrite", s => s.put(blob, key)), undefined),
    del: key => safe(tx("readwrite", s => s.delete(key)), undefined),
    clear: () => safe(tx("readwrite", s => s.clear()), undefined),
  };
})();
