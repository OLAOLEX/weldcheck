/* Shared workflow definitions for job records, quick checks and guided practice. */
(function () {
  "use strict";

  var TYPES = {
    job: { label: "Welding job", short: "Job", icon: "i-clipboard" },
    quick_check: { label: "Completed weld check", short: "Quick check", icon: "i-camera" },
    practice: { label: "Guided practice", short: "Practice", icon: "i-zap" }
  };

  var PREPARATION_CHECKS = [
    { key: "joint_arrangement", text: "Joint arrangement and fit-up are confirmed.", why: "Check the joint against the applicable drawing, procedure or exercise." },
    { key: "surface_clean", text: "The plate and weld area are clean.", why: "Remove loose scale, oil, paint and other visible contamination." },
    { key: "electrode_confirmed", text: "Electrode classification, diameter and condition are confirmed.", why: "Check the electrode against the applicable requirement and its handling instructions." },
    { key: "machine_confirmed", text: "Machine current and polarity are confirmed.", why: "Record the actual current and follow the applicable procedure and equipment instructions." },
    { key: "connections_secure", text: "Holder, leads and work return clamp are secure.", why: "Damaged or loose connections require correction before work begins." },
    { key: "ppe_ready", text: "Required welding PPE is ready and correctly worn.", why: "Follow the workshop procedure for helmet, gloves, clothing and other protection." },
    { key: "area_safe", text: "The work area is arranged for safe welding.", why: "Follow workshop controls for ventilation, fire prevention, screens and nearby people." }
  ];

  function type(job) {
    return (job && (job.workflowType || (job.exerciseSnapshot && job.exerciseSnapshot.workflowType))) || "practice";
  }
  function info(jobOrType) {
    var key = typeof jobOrType === "string" ? jobOrType : type(jobOrType);
    return TYPES[key] || TYPES.practice;
  }
  function isQuick(job) { return type(job) === "quick_check"; }
  function isPractice(job) { return type(job) === "practice"; }
  function recordName(job) {
    if (!job) return "Weld record";
    if (isPractice(job)) return (job.exerciseSnapshot && job.exerciseSnapshot.name) || "Practice exercise";
    return job.jobName || (isQuick(job) ? "Completed weld check" : "Welding job");
  }

  window.WcWorkflow = { TYPES: TYPES, PREPARATION_CHECKS: PREPARATION_CHECKS, type: type, info: info, isQuick: isQuick, isPractice: isPractice, recordName: recordName };
})();
