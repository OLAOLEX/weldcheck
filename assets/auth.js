/* Shared account control: anonymous guest sessions can be linked to Google. */
(function () {
  "use strict";
  function addButton() {
    var nav = document.querySelector(".wc-topnav");
    if (!nav || document.getElementById("accountBtn")) return;
    var btn = document.createElement("button");
    btn.type = "button"; btn.id = "accountBtn"; btn.className = "sel-account";
    btn.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-user"></use></svg><span>Guest</span>';
    nav.insertBefore(btn, document.getElementById("themeBtn"));
    WcData.authState().then(function (state) {
      var label = state.configured ? (state.isGuest ? "Guest" : ((state.user.user_metadata && (state.user.user_metadata.full_name || state.user.user_metadata.name)) || state.user.email || "Account")) : "Local";
      btn.querySelector("span").textContent = label;
      btn.title = state.configured ? (state.isGuest ? "Link guest records to Google" : "Signed in with Google") : "Cloud is not configured";
      btn.addEventListener("click", function () {
        if (!state.configured) { Wc.toast("Cloud access is not configured on this deployment."); return; }
        if (!state.isGuest) { if (confirm("Sign out of WeldCheck on this device?")) WcCloud.signOut().then(function () { location.reload(); }); return; }
        btn.classList.add("is-loading");
        WcCloud.google().catch(function (e) { btn.classList.remove("is-loading"); Wc.toast(e.message || "Google sign-in could not start."); });
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addButton); else addButton();
})();
