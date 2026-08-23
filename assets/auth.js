/* Shared responsive navigation and account centre. */
(function () {
  "use strict";
  var authState = null;

  function icon(name) { return '<svg class="ic" aria-hidden="true"><use href="#' + name + '"></use></svg>'; }
  function googleMark() { return '<span class="wc-google-mark" aria-hidden="true">G</span>'; }
  function closePanel(panel, opener) {
    panel.classList.remove("is-in");
    setTimeout(function () { panel.hidden = true; }, 180);
    if (opener) opener.focus();
  }
  function openPanel(panel) {
    panel.hidden = false;
    requestAnimationFrame(function () { panel.classList.add("is-in"); });
    setTimeout(function () { var focusable = panel.querySelector("button"); if (focusable) focusable.focus(); }, 40);
  }
  function accountCopy(state) {
    if (!state.configured) return { label: "Local mode", title: "Cloud unavailable", sub: "Drafts remain on this device until cloud access is restored." };
    if (state.isGuest) return { label: "Sign in", title: "Guest workspace", sub: "Your records are private. Connect Google to keep this same workspace across devices." };
    var meta = state.user.user_metadata || {};
    return { label: meta.full_name || meta.name || state.user.email || "Account", title: meta.full_name || meta.name || "Google account", sub: state.user.email || "Cloud records are synchronized." };
  }
  function startGoogle(button, note) {
    button.classList.add("is-loading");
    button.disabled = true;
    if (note) note.textContent = "Opening Google securely…";
    WcCloud.google().catch(function (e) {
      button.classList.remove("is-loading"); button.disabled = false;
      if (note) note.textContent = e.message || "Google sign-in could not start.";
      else Wc.toast(e.message || "Google sign-in could not start.");
    });
  }
  function buildAccount(nav, state) {
    var copy = accountCopy(state), btn = document.createElement("button");
    btn.type = "button"; btn.id = "accountBtn"; btn.className = "sel-account";
    btn.setAttribute("aria-haspopup", "dialog");
    btn.innerHTML = '<span class="wc-account-dot' + (state.configured ? " is-online" : "") + '"></span>' + icon("i-user") + '<span>' + Wc.esc(copy.label) + '</span>';
    btn.title = state.isGuest ? "Sign in or manage guest access" : "Open account settings";
    nav.insertBefore(btn, document.getElementById("themeBtn"));

    var modal = document.createElement("div");
    modal.className = "sel-modal wc-account-modal"; modal.id = "accountModal"; modal.hidden = true;
    modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-labelledby", "accountTitle");
    var actions = state.isGuest ?
      '<button class="sel-btn sel-btn--google sel-btn--block" id="accountGoogle">' + googleMark() + '<span>Continue with Google</span></button><p class="wc-auth-help">New here? Google creates your account. Returning user? It signs you back in. Your guest records stay with you.</p>' :
      '<button class="sel-btn sel-btn--ghost sel-btn--block" id="accountSignOut">' + icon("i-log-out") + '<span>Sign out on this device</span></button>';
    if (!state.configured) actions = '<div class="sel-note sel-note--warn">' + icon("i-alert") + '<span>Cloud access is temporarily unavailable. You can continue with local drafts.</span></div>';
    modal.innerHTML = '<div class="sel-modal__card wc-account-card"><button class="wc-modal-close" id="accountClose" type="button" aria-label="Close account panel">' + icon("i-close") + '</button><span class="sel-modal__ic">' + icon(state.isGuest ? "i-user" : "i-cloud") + '</span><p class="wc-overline">Account and sync</p><h2 id="accountTitle">' + Wc.esc(copy.title) + '</h2><p>' + Wc.esc(copy.sub) + '</p><div class="wc-sync-status"><span class="wc-account-dot' + (state.configured ? " is-online" : "") + '"></span><div><b>' + (state.configured ? "Cloud connected" : "Local only") + '</b><span>' + (state.configured ? "Private records protected by your account" : "Cloud records cannot sync right now") + '</span></div></div>' + actions + '<p class="wc-tiny" id="accountNote" aria-live="polite"></p></div>';
    document.body.appendChild(modal);
    btn.addEventListener("click", function () { openPanel(modal); });
    modal.querySelector("#accountClose").onclick = function () { closePanel(modal, btn); };
    modal.addEventListener("click", function (e) { if (e.target === modal) closePanel(modal, btn); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closePanel(modal, btn); });
    var google = modal.querySelector("#accountGoogle");
    if (google) google.onclick = function () { startGoogle(google, modal.querySelector("#accountNote")); };
    var signOut = modal.querySelector("#accountSignOut");
    if (signOut) signOut.onclick = function () { signOut.classList.add("is-loading"); WcCloud.signOut().then(function () { location.reload(); }); };
    window.WcAuth = { open: function () { openPanel(modal); }, google: function (button, note) { startGoogle(button, note); }, state: state };
  }
  function buildMobile(header, nav) {
    var toggle = document.createElement("button");
    toggle.type = "button"; toggle.className = "wc-menu-toggle"; toggle.id = "menuToggle";
    toggle.setAttribute("aria-label", "Open navigation"); toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-controls", "mobileNav");
    toggle.innerHTML = icon("i-menu"); nav.parentNode.insertBefore(toggle, nav);
    var drawer = document.createElement("nav"); drawer.className = "wc-mobile-nav"; drawer.id = "mobileNav"; drawer.hidden = true; drawer.setAttribute("aria-label", "Mobile navigation");
    drawer.innerHTML = '<div class="sel-wrap wc-mobile-nav__inner"><a href="/">' + icon("i-home") + '<span><b>Home</b><small>Overview and recent jobs</small></span></a><a href="/new-job">' + icon("i-plus") + '<span><b>New inspection</b><small>Start a guided SMAW check</small></span></a><a href="/history">' + icon("i-history") + '<span><b>Dashboard</b><small>History, reports and exports</small></span></a><button type="button" id="mobileAccount">' + icon("i-user") + '<span><b>' + (authState && authState.isGuest ? "Sign in with Google" : "Account and sync") + '</b><small>' + (authState && authState.isGuest ? "Keep guest records across devices" : "Manage this device session") + '</small></span></button></div>';
    header.appendChild(drawer);
    function close() { drawer.hidden = true; toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-label", "Open navigation"); }
    toggle.onclick = function () { var opening = drawer.hidden; drawer.hidden = !opening; toggle.setAttribute("aria-expanded", String(opening)); toggle.setAttribute("aria-label", opening ? "Close navigation" : "Open navigation"); };
    drawer.querySelector("#mobileAccount").onclick = function () { close(); if (window.WcAuth) window.WcAuth.open(); };
    document.addEventListener("click", function (e) { if (!drawer.hidden && !header.contains(e.target)) close(); });
  }
  function addChrome() {
    var nav = document.querySelector(".wc-topnav"), header = document.querySelector(".sel-header");
    if (!nav || !header || document.getElementById("accountBtn")) return;
    WcData.authState().then(function (state) {
      authState = state; buildAccount(nav, state); buildMobile(header, nav);
      if (!state.configured) setTimeout(function () {
        var text = document.getElementById("accessText"), status = document.getElementById("accessState"), action = document.querySelector("#heroAccountBtn span:last-child");
        if (text) text.textContent = "You can continue with drafts on this device while cloud access is unavailable.";
        if (status) status.textContent = "Local mode";
        if (action) action.textContent = "View local access status";
      }, 0);
      document.documentElement.classList.add("wc-auth-ready");
    }).catch(function () { document.documentElement.classList.add("wc-auth-ready"); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addChrome); else addChrome();
})();
