function send(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}
function bearer(req) {
  var header = String(req.headers.authorization || "");
  return /^Bearer\s+(.+)$/i.test(header) ? header.replace(/^Bearer\s+/i, "") : "";
}
function adminEmails() {
  return String(process.env.ADMIN_EMAILS || "").split(",").map(function (v) { return v.trim().toLowerCase(); }).filter(Boolean);
}
async function verifyUser(token) {
  var response = await fetch(process.env.SUPABASE_URL + "/auth/v1/user", { headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY, Authorization: "Bearer " + token } });
  return response.ok ? response.json() : null;
}
async function serviceFetch(path) {
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  var response = await fetch(process.env.SUPABASE_URL + path, { headers: { apikey: key, Authorization: "Bearer " + key } });
  if (!response.ok) throw new Error("Supabase admin request failed: " + response.status);
  return response.json();
}
function checklistCount(value) {
  if (!value || typeof value !== "object") return 0;
  return Object.keys(value).reduce(function (n, key) { return n + (value[key] ? 1 : 0); }, 0);
}
function provider(user) {
  if (user.is_anonymous) return "Guest";
  var names = (user.identities || []).map(function (identity) { return identity.provider; });
  return names.indexOf("google") >= 0 ? "Google" : (names[0] || "Account");
}
function stage(userJobs, userInspections) {
  if (userInspections.length) return "Result reviewed";
  if (!userJobs.length) return "No job started";
  var latest = userJobs.slice().sort(function (a, b) { return new Date(b.updated_at) - new Date(a.updated_at); })[0];
  var done = checklistCount(latest.checklist_json);
  if (done >= 9) return "Ready for photograph";
  if (done) return "Checklist " + done + "/9";
  return "Job details saved";
}
module.exports = async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Use GET." });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY || !adminEmails().length) return send(res, 503, { error: "Admin access is not configured." });
  var token = bearer(req);
  if (!token) return send(res, 401, { error: "Sign in with an allowed Google account." });
  try {
    var signedIn = await verifyUser(token);
    var email = signedIn && String(signedIn.email || "").toLowerCase();
    if (!signedIn || signedIn.is_anonymous || adminEmails().indexOf(email) < 0) return send(res, 403, { error: "This Google account does not have admin access." });
    var data = await Promise.all([
      serviceFetch("/auth/v1/admin/users?page=1&per_page=1000"),
      serviceFetch("/rest/v1/jobs?select=id,user_id,sample_no,job_name,status,checklist_json,created_at,updated_at&order=created_at.desc&limit=1000"),
      serviceFetch("/rest/v1/inspections?select=id,job_id,user_id,status,conditions,human_verdict,comparison_result,response_time_ms,created_at&order=created_at.desc&limit=1000")
    ]);
    var users = data[0].users || [], jobs = data[1] || [], inspections = data[2] || [], now = Date.now(), week = 7 * 86400000;
    var rows = users.map(function (user) {
      var mineJobs = jobs.filter(function (job) { return job.user_id === user.id; });
      var mineInspections = inspections.filter(function (inspection) { return inspection.user_id === user.id; });
      var last = [user.last_sign_in_at, user.updated_at].concat(mineJobs.map(function (j) { return j.updated_at; }), mineInspections.map(function (i) { return i.created_at; })).filter(Boolean).sort().pop() || user.created_at;
      return { id: user.id, email: user.email || "Guest account", accountType: provider(user), joinedAt: user.created_at, lastActiveAt: last, jobs: mineJobs.length, inspections: mineInspections.length, workflowStage: stage(mineJobs, mineInspections) };
    }).sort(function (a, b) { return new Date(b.lastActiveAt) - new Date(a.lastActiveAt); });
    return send(res, 200, {
      generatedAt: new Date().toISOString(),
      totals: { users: rows.length, googleUsers: rows.filter(function (u) { return u.accountType === "Google"; }).length, guestUsers: rows.filter(function (u) { return u.accountType === "Guest"; }).length, jobs: jobs.length, inspections: inspections.length, activeSevenDays: rows.filter(function (u) { return now - new Date(u.lastActiveAt).getTime() <= week; }).length },
      users: rows,
      recentJobs: jobs.slice(0, 12).map(function (j) { return { id: j.id, sampleNo: j.sample_no, jobName: j.job_name || "", status: j.status, checklistDone: checklistCount(j.checklist_json), createdAt: j.created_at, updatedAt: j.updated_at }; }),
      recentInspections: inspections.slice(0, 12).map(function (i) { return { id: i.id, jobId: i.job_id, status: i.status, conditions: i.conditions || [], humanVerdict: i.human_verdict, comparisonResult: i.comparison_result, responseTimeMs: i.response_time_ms, createdAt: i.created_at }; })
    });
  } catch (error) {
    console.error("admin-overview failed", error);
    return send(res, 502, { error: "Admin data could not be loaded right now." });
  }
};
