/* db.js: IndexedDB job store for WeldCheck. window.WcDb. No login and no server: every job
 * record (details, checklist state, weld photo blob, appearance result) lives in the browser.
 * Promise-based, classic browser script. */
(function () {
  "use strict";
  var DB_NAME = "weldcheck-db", DB_VER = 1, STORE = "jobs";
  var dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function tx(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode);
        var store = t.objectStore(STORE);
        var out = fn(store);
        t.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : undefined); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }

  function put(job) { return tx("readwrite", function (s) { s.put(job); }).then(function () { return job; }); }
  function get(id) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = db.transaction(STORE).objectStore(STORE).get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }
  function all() {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = db.transaction(STORE).objectStore(STORE).getAll();
        req.onsuccess = function () {
          var list = req.result || [];
          list.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
          resolve(list);
        };
        req.onerror = function () { reject(req.error); };
      });
    });
  }
  function remove(id) { return tx("readwrite", function (s) { s.delete(id); }); }

  window.WcDb = { put: put, get: get, all: all, remove: remove };
})();
