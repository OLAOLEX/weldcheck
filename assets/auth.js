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
    button.setAttribute("aria-busy", "true");
    button.setAttribute("aria-label", "Opening Google");
    if (note) note.textContent = "";
    WcCloud.google().catch(function (e) {
      button.classList.remove("is-loading"); button.disabled = false;
      button.removeAttribute("aria-busy"); button.removeAttribute("aria-label");
      if (note) note.textContent = e.message || "Google sign-in could not start.";
      else Wc.toast(e.message || "Google sign-in could not start.");
    });
  }
  function setWelcomeHandled() {
    try { localStorage.setItem("wcWelcomedV2", "1"); } catch (e) {}
  }
  function welcomeWasHandled() {
    try { return localStorage.getItem("wcWelcomedV2") === "1"; } catch (e) { return false; }
  }
  function shouldShowWelcome(state, handled) {
    return !!(state.configured && state.user && state.isGuest && !handled);
  }
  function manageWelcome(state) {
    var modal = document.getElementById("welcomeModal"), google, guest, note;
    if (!modal) return;
    google = document.getElementById("googleBtn"); guest = document.getElementById("guestBtn"); note = document.getElementById("authNote");
    function hide(remember) {
      if (remember) setWelcomeHandled();
      modal.classList.remove("is-in"); modal.hidden = true;
    }
    if (google) google.onclick = function () {
      setWelcomeHandled();
      startGoogle(google, note);
    };
    if (guest) guest.onclick = function () { hide(true); };

    /* Wait for the restored Supabase session before deciding whether onboarding is
       needed. A returning Google user must never be sent through sign-in again. */
    if (state.configured && state.user && !state.isGuest) {
      hide(true);
    } else if (shouldShowWelcome(state, welcomeWasHandled())) {
      modal.hidden = false;
      requestAnimationFrame(function () { modal.classList.add("is-in"); });
    } else {
      hide(false);
    }
  }
  function oauthError() {
    var search = new URLSearchParams(location.search), hash = new URLSearchParams(location.hash.replace(/^#/, ""));
    return { code: search.get("error_code") || hash.get("error_code") || "", description: search.get("error_description") || hash.get("error_description") || "" };
  }
  function showIdentityRecovery(modal, opener) {
    var error = oauthError(), card, title, copy, actions;
    if (error.code !== "identity_already_exists") return;
    card = modal.querySelector(".wc-account-card"); title = modal.querySelector("#accountTitle"); copy = title.nextElementSibling; actions = modal.querySelector("#accountActions");
    title.textContent = "Google account already exists";
    copy.textContent = "This Google account already has a WeldCheck workspace. Your current guest records remain in this separate guest workspace unless you choose the existing account.";
    actions.innerHTML = '<button class="sel-btn sel-btn--google sel-btn--block" id="useExistingGoogle">' + googleMark() + '<span>Open existing Google workspace</span></button><button class="sel-btn sel-btn--ghost sel-btn--block" id="keepGuest">Keep current guest workspace</button><p class="wc-auth-help">Opening the existing account does not merge this guest workspace.</p>';
    actions.querySelector("#keepGuest").onclick = function () { closePanel(modal, opener); };
    actions.querySelector("#useExistingGoogle").onclick = function () { var button = this; button.classList.add("is-loading"); button.disabled = true; WcCloud.googleExisting().catch(function (failure) { button.classList.remove("is-loading"); button.disabled = false; modal.querySelector("#accountNote").textContent = failure.message || "The existing Google workspace could not be opened."; }); };
    history.replaceState({}, "", location.pathname);
    openPanel(modal);
  }
  function buildAccount(nav, state) {
    var copy = accountCopy(state), btn = document.createElement("button");
    if (!nav.querySelector('[data-nav="guide"]')) {
      var help = document.createElement("a");
      help.href = "/guide"; help.dataset.nav = "guide";
      help.innerHTML = icon("i-info") + '<span class="wc-navlabel">Help</span>';
      nav.insertBefore(help, document.getElementById("themeBtn"));
    }
    btn.type = "button"; btn.id = "accountBtn"; btn.className = "sel-account";
    btn.setAttribute("aria-haspopup", "dialog");
    btn.innerHTML = '<span class="wc-account-dot' + (state.configured ? " is-online" : "") + '"></span>' + icon("i-user") + '<span>' + Wc.esc(copy.label) + '</span>';
    btn.title = state.isGuest ? "Sign in or manage guest access" : "Open account settings";
    nav.insertBefore(btn, document.getElementById("themeBtn"));

    var modal = document.createElement("div");
    modal.className = "sel-modal wc-account-modal"; modal.id = "accountModal"; modal.hidden = true;
    modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-labelledby", "accountTitle");
    var actions = state.isGuest ?
      '<button class="sel-btn sel-btn--google sel-btn--block" id="accountGoogle">' + googleMark() + '<span>Continue with Google</span></button><p class="wc-auth-help">Google signs you in and keeps your guest records.</p>' :
      '<button class="sel-btn sel-btn--ghost sel-btn--block" id="accountSignOut">' + icon("i-log-out") + '<span>Sign out on this device</span></button>';
    if (!state.configured) actions = '<div class="sel-note sel-note--warn">' + icon("i-alert") + '<span>Cloud access is temporarily unavailable. You can continue with local drafts.</span></div>';
    modal.innerHTML = '<div class="sel-modal__card wc-account-card"><button class="wc-modal-close" id="accountClose" type="button" aria-label="Close account panel">' + icon("i-close") + '</button><span class="sel-modal__ic">' + icon(state.isGuest ? "i-user" : "i-cloud") + '</span><p class="wc-overline">Account</p><h2 id="accountTitle">' + Wc.esc(copy.title) + '</h2><p>' + Wc.esc(copy.sub) + '</p><div class="wc-sync-status"><span class="wc-account-dot' + (state.configured ? " is-online" : "") + '"></span><div><b>' + (state.configured ? "Cloud connected" : "Local only") + '</b><span>' + (state.configured ? "Private to your account" : "Not syncing") + '</span></div></div><div id="accountActions">' + actions + '</div><p class="wc-tiny" id="accountNote" aria-live="polite"></p></div>';
    document.body.appendChild(modal);
    btn.addEventListener("click", function () { openPanel(modal); });
    modal.querySelector("#accountClose").onclick = function () { closePanel(modal, btn); };
    modal.addEventListener("click", function (e) { if (e.target === modal) closePanel(modal, btn); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closePanel(modal, btn); });
    var google = modal.querySelector("#accountGoogle");
    if (google) google.onclick = function () { startGoogle(google, modal.querySelector("#accountNote")); };
    var signOut = modal.querySelector("#accountSignOut");
    if (signOut) signOut.onclick = function () { signOut.classList.add("is-loading"); signOut.setAttribute("aria-busy", "true"); signOut.setAttribute("aria-label", "Signing out"); WcCloud.signOut().then(function () { location.reload(); }); };
    if (state.configured && state.isGuest) showIdentityRecovery(modal, btn);
    window.WcAuth = { open: function () { openPanel(modal); }, google: function (button, note) { startGoogle(button, note); }, state: state };
  }
  function buildMobile(header, nav) {
    var toggle = document.createElement("button");
    toggle.type = "button"; toggle.className = "wc-menu-toggle"; toggle.id = "menuToggle";
    toggle.setAttribute("aria-label", "Open navigation"); toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-controls", "mobileNav");
    toggle.innerHTML = icon("i-menu"); nav.parentNode.insertBefore(toggle, nav);
    var drawer = document.createElement("nav"); drawer.className = "wc-mobile-nav"; drawer.id = "mobileNav"; drawer.hidden = true; drawer.setAttribute("aria-label", "Mobile navigation");
    var accountLabel = !authState || !authState.configured ? "Access status" : (authState.isGuest ? "Sign in with Google" : "Account and sync");
    var accountSub = !authState || !authState.configured ? "Local drafts only" : (authState.isGuest ? "Keep guest records across devices" : "Manage this device session");
    drawer.innerHTML = '<div class="sel-wrap wc-mobile-nav__inner"><a href="/">' + icon("i-home") + '<span><b>Home</b><small>Overview and recent work</small></span></a><a href="/new-job">' + icon("i-plus") + '<span><b>New work</b><small>Job, quick check or guided practice</small></span></a><a href="/history">' + icon("i-history") + '<span><b>Dashboard</b><small>History, reports and downloads</small></span></a><a href="/guide">' + icon("i-info") + '<span><b>Help and guide</b><small>Choose the right workflow</small></span></a><button type="button" id="mobileAccount">' + icon("i-user") + '<span><b>' + accountLabel + '</b><small>' + accountSub + '</small></span></button></div>';
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
      authState = state; buildAccount(nav, state); buildMobile(header, nav); manageWelcome(state);
      setTimeout(function () {
        var text = document.getElementById("accessText"), status = document.getElementById("accessState"), action = document.querySelector("#heroAccountBtn span:last-child");
        if (!text && !status && !action) return;
        if (!state.configured) {
          if (text) text.textContent = "Drafts stay on this device.";
          if (status) status.textContent = "Local mode";
          if (action) action.textContent = "Access status";
        } else if (state.isGuest) {
          if (text) text.textContent = "Guest mode. Connect Google anytime.";
          if (status) status.textContent = "Guest mode";
          if (action) action.textContent = "Continue with Google";
        } else {
          if (text) text.textContent = "Synced with Google.";
          if (status) status.textContent = "Synced";
          if (action) action.textContent = "Account";
        }
      }, 100);
      document.documentElement.classList.add("wc-auth-ready");
    }).catch(function () { document.documentElement.classList.add("wc-auth-ready"); });
  }
  window.WcAuthRules = { shouldShowWelcome: shouldShowWelcome };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addChrome); else addChrome();
})();
