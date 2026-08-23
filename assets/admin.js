(function () {
  "use strict";
  var overview = null;
  function fmt(value) { return value ? Wc.fmtDate(value, true) : "—"; }
  function showGate(title, text, google, home) { Wc.$("gate").hidden = false; Wc.$("adminView").hidden = true; Wc.$("gateLoader").hidden = true; Wc.$("gateTitle").textContent = title; Wc.$("gateText").textContent = text; Wc.$("gateText").hidden = !text; Wc.$("adminGoogle").hidden = !google; Wc.$("homeLink").hidden = !home; }
  function statusLabel(value) { return { acceptable: "Acceptable", visible_issues: "Visible issues", retake: "Retake photo" }[value] || value; }
  function renderUsers() {
    var q = Wc.$("userSearch").value.toLowerCase().trim();
    var users = overview.users.filter(function (u) { return !q || [u.email, u.accountType, u.workflowStage].join(" ").toLowerCase().indexOf(q) >= 0; });
    Wc.$("userRows").innerHTML = users.length ? users.map(function (u) { return '<tr><td><b>' + Wc.esc(u.email) + '</b><small>' + Wc.esc(u.accountType) + '</small></td><td>' + Wc.esc(fmt(u.joinedAt)) + '</td><td>' + Wc.esc(fmt(u.lastActiveAt)) + '</td><td>' + u.jobs + '</td><td>' + u.attempts + '</td><td><span class="wc-admin-stage">' + Wc.esc(u.workflowStage) + '</span></td></tr>'; }).join("") : '<tr><td colspan="6" class="sel-empty">No accounts match this search.</td></tr>';
  }
  function render(data) {
    overview = data; var t = data.totals;
    Wc.$("aUsers").textContent = t.users; Wc.$("aGoogle").textContent = t.googleUsers; Wc.$("aGuests").textContent = t.guestUsers; Wc.$("aJobs").textContent = t.attempts; Wc.$("aInspections").textContent = t.inspections; Wc.$("aActive").textContent = t.activeSevenDays;
    renderUsers();
    Wc.$("recentJobs").innerHTML = data.recentAttempts.length ? data.recentAttempts.map(function (a) { return '<div class="sel-row"><div class="sel-row__body"><div class="sel-row__title">Attempt ' + a.attemptNo + '</div><div class="sel-row__sub">' + Wc.esc(fmt(a.updatedAt)) + ' · ' + Wc.esc(a.readinessStatus.replace("_"," ")) + ' · ' + Wc.esc(a.supervisorStatus.replace("_"," ")) + '</div></div></div>'; }).join("") : '<p class="sel-empty">No attempts yet.</p>';
    Wc.$("recentInspections").innerHTML = data.recentInspections.length ? data.recentInspections.map(function (i) { return '<div class="sel-row"><div class="sel-row__body"><div class="sel-row__title">' + Wc.esc(statusLabel(i.status)) + '</div><div class="sel-row__sub">' + Wc.esc(fmt(i.createdAt)) + ' · ' + i.conditions.length + ' condition(s) · ' + i.responseTimeMs + ' ms</div></div></div>'; }).join("") : '<p class="sel-empty">No inspections yet.</p>';
    Wc.$("generatedAt").textContent = "Last refreshed " + fmt(data.generatedAt) + "."; Wc.$("gate").hidden = true; Wc.$("adminView").hidden = false; Wc.$("refreshBtn").hidden = false;
  }
  function load() {
    Wc.$("refreshBtn").disabled = true;
    return WcCloud.token().then(function (token) { return fetch("/api/admin-overview", { headers: { Authorization: "Bearer " + token } }); }).then(async function (response) {
      var body = await response.json().catch(function () { return {}; });
      if (response.status === 503) return showGate("Admin setup is incomplete", "Add the server-only admin environment variables, then redeploy WeldCheck.", false, true);
      if (response.status === 401) return showGate("Google sign-in required", body.error || "Sign in with your allowed Google account.", true, true);
      if (response.status === 403) return showGate("Access not allowed", body.error || "This account is not on the admin list.", true, true);
      if (!response.ok) throw new Error(body.error || "Admin data could not be loaded.");
      render(body);
    }).catch(function (error) { showGate("Could not load admin", error.message, false, true); }).finally(function () { Wc.$("refreshBtn").disabled = false; });
  }
  Wc.$("adminGoogle").onclick = function () { var button = this; button.disabled = true; button.classList.add("is-loading"); button.setAttribute("aria-busy", "true"); button.setAttribute("aria-label", "Opening Google"); WcCloud.google("/admin").catch(function (error) { button.disabled = false; button.classList.remove("is-loading"); button.removeAttribute("aria-busy"); button.removeAttribute("aria-label"); showGate("Google sign-in could not start", error.message, true, true); }); };
  Wc.$("refreshBtn").onclick = load; Wc.$("userSearch").addEventListener("input", renderUsers);
  WcCloud.init().then(function (state) { if (!state.configured) return showGate("Cloud access is unavailable", "WeldCheck cannot check admin access right now.", false, true); return WcCloud.currentUser().then(function (user) { if (!user || user.is_anonymous) showGate("Google sign-in required", "Admin access uses an allowed Google account. Guest sessions cannot open this page.", true, true); else load(); }); });
})();
