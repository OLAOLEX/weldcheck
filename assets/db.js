/* Fresh v3 learning-cycle store. Earlier WeldCheck databases remain untouched. */
(function () {
  "use strict";
  var NAME = "weldcheck-db-v3", VERSION = 1, promise;
  function open() {
    if (promise) return promise;
    promise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains("jobs")) {
          var jobs = db.createObjectStore("jobs", { keyPath: "id" }); jobs.createIndex("createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains("attempts")) {
          var attempts = db.createObjectStore("attempts", { keyPath: "id" }); attempts.createIndex("jobId", "jobId"); attempts.createIndex("createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains("inspections")) {
          var inspections = db.createObjectStore("inspections", { keyPath: "id" }); inspections.createIndex("jobId", "jobId"); inspections.createIndex("createdAt", "createdAt");
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return promise;
  }
  function request(store, mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = fn(db.transaction(store, mode).objectStore(store));
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }
  function put(store, value) { return request(store, "readwrite", function (s) { return s.put(value); }).then(function () { return value; }); }
  function get(store, id) { return request(store, "readonly", function (s) { return s.get(id); }).then(function (v) { return v || null; }); }
  function all(store) { return request(store, "readonly", function (s) { return s.getAll(); }).then(function (v) { return v || []; }); }
  function remove(store, id) { return request(store, "readwrite", function (s) { return s.delete(id); }); }
  function inspectionsFor(jobId) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = db.transaction("inspections").objectStore("inspections").index("jobId").getAll(jobId);
        req.onsuccess = function () { resolve((req.result || []).sort(function (a, b) { return b.createdAt - a.createdAt; })); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }
  function attemptsFor(jobId) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = db.transaction("attempts").objectStore("attempts").index("jobId").getAll(jobId);
        req.onsuccess = function () { resolve((req.result || []).sort(function (a, b) { return b.attemptNo - a.attemptNo; })); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }
  window.WcLocal = {
    putJob: function (v) { return put("jobs", v); }, getJob: function (id) { return get("jobs", id); },
    allJobs: function () { return all("jobs").then(function (v) { return v.sort(function (a, b) { return b.createdAt - a.createdAt; }); }); },
    removeJob: function (id) { return remove("jobs", id); },
    putAttempt: function (v) { return put("attempts", v); }, getAttempt: function (id) { return get("attempts", id); },
    allAttempts: function () { return all("attempts"); }, attemptsFor: attemptsFor,
    removeAttempt: function (id) { return remove("attempts", id); },
    putInspection: function (v) { return put("inspections", v); }, getInspection: function (id) { return get("inspections", id); },
    allInspections: function () { return all("inspections"); }, inspectionsFor: inspectionsFor,
    removeInspection: function (id) { return remove("inspections", id); }
  };
})();
