/* Supabase auth + cloud adapter. Loads the browser client when /api/config is configured. */
(function () {
  "use strict";
  var client = null, initPromise = null;
  function loadLibrary() {
    if (window.supabase) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
      script.onload = resolve; script.onerror = reject; document.head.appendChild(script);
    });
  }
  function init() {
    if (initPromise) return initPromise;
    initPromise = fetch("/api/config").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }).then(function (cfg) {
      if (!cfg.supabaseUrl || !cfg.supabasePublishableKey) return { configured: false };
      try { localStorage.setItem("wcCloudConfig", JSON.stringify(cfg)); } catch (e) {}
      return loadLibrary().then(function () {
        client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
        return { configured: true };
      });
    });
    return initPromise;
  }
  function session() { return init().then(function () { return client ? client.auth.getSession().then(function (r) { return r.data.session; }) : null; }); }
  function ensureSession() {
    return session().then(function (s) {
      if (s || !client) return s;
      return client.auth.signInAnonymously().then(function (r) { if (r.error) throw r.error; try { localStorage.setItem("wcLastUserId", r.data.session.user.id); } catch (e) {} return r.data.session; });
    });
  }
  function currentUser() { return ensureSession().then(function (s) { return s && s.user; }); }
  function google(redirectPath) {
    return currentUser().then(function (user) {
      if (!client) throw new Error("Cloud access is not configured.");
      var path = redirectPath || "/";
      if (path.charAt(0) !== "/") path = "/" + path;
      var options = { redirectTo: location.origin + path };
      return user && user.is_anonymous ? client.auth.linkIdentity({ provider: "google", options: options }) : client.auth.signInWithOAuth({ provider: "google", options: options });
    });
  }
  function token() { return ensureSession().then(function (s) { return s && s.access_token; }); }
  function signedUrl(path) {
    if (!path || !client) return Promise.resolve(null);
    return client.storage.from("weld-images").createSignedUrl(path, 3600).then(function (r) { return r.error ? null : r.data.signedUrl; });
  }
  window.WcCloud = {
    init: init, ensureSession: ensureSession, currentUser: currentUser, google: google,
    signOut: function () { try { localStorage.removeItem("wcLastUserId"); } catch (e) {} return client ? client.auth.signOut() : Promise.resolve(); }, token: token,
    query: function (table) { return client.from(table); },
    upload: function (path, file) { return client.storage.from("weld-images").upload(path, file, { upsert: false, contentType: file.type || "image/jpeg" }); },
    removeFiles: function (paths) { return !client || !paths.length ? Promise.resolve() : client.storage.from("weld-images").remove(paths); },
    signedUrl: signedUrl,
    get client() { return client; }
  };
})();
