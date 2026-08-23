/* Local-first data service with optional Supabase synchronization. */
(function () {
  "use strict";
  var readyPromise;
  function localOwner() { try { return localStorage.getItem("wcLastUserId") || "local"; } catch (e) { return "local"; } }
  function ready() {
    if (!readyPromise) readyPromise = WcCloud.init().then(function (state) {
      if (!state.configured) return { cloud: false, user: null };
      return WcCloud.ensureSession().then(function (session) { try { localStorage.setItem("wcLastUserId", session.user.id); } catch (e) {} return { cloud: true, user: session.user }; });
    }).catch(function () { return { cloud: false, user: null }; });
    return readyPromise;
  }
  function jobToRow(j, userId) {
    return { id: j.id, user_id: userId, sample_no: j.sampleNo, job_name: j.jobName || null, material: "Mild steel", joint_type: j.jointType, plate_thickness_mm: Number(j.plateThickness), electrode_classification: j.electrodeClassification, electrode_size_mm: Number(j.electrodeSize), welding_position: j.weldingPosition, current_amp: Number(j.currentAmp), operator_name: j.operator || null, job_date: j.date || null, note: j.note || null, checklist_json: j.checks || {}, status: j.status || "draft", created_at: new Date(j.createdAt).toISOString(), updated_at: new Date(j.updatedAt || Date.now()).toISOString() };
  }
  function rowToJob(r) {
    return { id: r.id, ownerId: r.user_id, sampleNo: r.sample_no, jobName: r.job_name || "", material: r.material, jointType: r.joint_type, plateThickness: r.plate_thickness_mm, electrodeClassification: r.electrode_classification, electrodeSize: r.electrode_size_mm, weldingPosition: r.welding_position, currentAmp: r.current_amp, operator: r.operator_name || "", date: r.job_date, note: r.note || "", checks: r.checklist_json || {}, status: r.status, createdAt: Date.parse(r.created_at), updatedAt: Date.parse(r.updated_at) };
  }
  function inspectionToRow(i, userId) {
    return { id: i.id, job_id: i.jobId, user_id: userId, image_path: i.imagePath || null, status: i.status, confidence_level: i.confidenceLevel, confidence_reason: i.confidenceReason, image_quality_status: i.imageQualityStatus, image_quality_issues: i.imageQualityIssues || [], summary: i.summary, conditions: i.conditions || [], observations: i.observations || [], assessment_reason: i.assessmentReason, possible_causes: i.possibleCauses || [], recommended_actions: i.recommendedActions || [], limitations: i.limitations || [], metrics_json: i.metrics || {}, engine: i.engine || "ai", response_time_ms: i.responseTimeMs || 0, human_verdict: i.humanVerdict || null, corrected_conditions: i.correctedConditions || [], reference_conditions: i.referenceConditions || [], comparison_result: i.comparisonResult || null, created_at: new Date(i.createdAt).toISOString(), updated_at: new Date(i.updatedAt || Date.now()).toISOString() };
  }
  function rowToInspection(r) {
    return { id: r.id, ownerId: r.user_id, jobId: r.job_id, imagePath: r.image_path, status: r.status, confidenceLevel: r.confidence_level, confidenceReason: r.confidence_reason, imageQualityStatus: r.image_quality_status, imageQualityIssues: r.image_quality_issues || [], summary: r.summary, conditions: r.conditions || [], observations: r.observations || [], assessmentReason: r.assessment_reason, possibleCauses: r.possible_causes || [], recommendedActions: r.recommended_actions || [], limitations: r.limitations || [], metrics: r.metrics_json || {}, engine: r.engine, responseTimeMs: r.response_time_ms, humanVerdict: r.human_verdict, correctedConditions: r.corrected_conditions || [], referenceConditions: r.reference_conditions || [], comparisonResult: r.comparison_result, createdAt: Date.parse(r.created_at), updatedAt: Date.parse(r.updated_at) };
  }
  function enrich(jobs, inspections) {
    jobs.forEach(function (job) {
      var mine = inspections.filter(function (i) { return i.jobId === job.id; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
      if (mine[0]) { job.latestInspectionId = mine[0].id; job.latestStatus = mine[0].status; job.inspectionCount = mine.length; }
    });
    return jobs.sort(function (a, b) { return b.createdAt - a.createdAt; });
  }
  function putJob(job) {
    job.updatedAt = Date.now();
    return ready().then(function (state) {
      job.ownerId = state.cloud ? state.user.id : localOwner();
      return WcLocal.putJob(job).then(function () {
        if (!state.cloud) return job;
        return WcCloud.query("jobs").upsert(jobToRow(job, state.user.id)).then(function (r) { if (r.error) throw r.error; return job; });
      });
    }).catch(function () { job.syncPending = true; return WcLocal.putJob(job); });
  }
  function allJobs() {
    return Promise.all([WcLocal.allJobs(), WcLocal.allInspections(), ready()]).then(function (v) {
      var state = v[2], owner = state.cloud ? state.user.id : localOwner();
      var localJobs = v[0].filter(function (j) { var o = j.ownerId || "local"; return o === owner || (state.cloud && o === "local"); });
      var localInspections = v[1].filter(function (i) { return (i.ownerId || "local") === owner; });
      if (!state.cloud) return enrich(localJobs, localInspections);
      var syncDrafts = localJobs.filter(function (j) { return j.syncPending || (j.ownerId || "local") === "local"; }).map(function (j) {
        j.ownerId = state.user.id; delete j.syncPending;
        return WcCloud.query("jobs").upsert(jobToRow(j, state.user.id)).then(function (r) { if (r.error) throw r.error; return WcLocal.putJob(j); });
      });
      return Promise.all(syncDrafts).then(function () { return Promise.all([WcCloud.query("jobs").select("*").order("created_at", { ascending: false }), WcCloud.query("inspections").select("*").order("created_at", { ascending: false })]); }).then(function (r) {
        if (r[0].error || r[1].error) throw r[0].error || r[1].error;
        var cloudJobs = r[0].data.map(rowToJob), cloudInspections = r[1].data.map(rowToInspection), jobs = {}, inspections = {};
        localJobs.concat(cloudJobs).forEach(function (j) { jobs[j.id] = j; });
        localInspections.concat(cloudInspections).forEach(function (i) { inspections[i.id] = i; });
        return Promise.all(cloudJobs.map(WcLocal.putJob).concat(cloudInspections.map(WcLocal.putInspection))).then(function () { return enrich(Object.values(jobs), Object.values(inspections)); });
      }).catch(function () { return enrich(localJobs, localInspections); });
    });
  }
  function getJob(id) { return allJobs().then(function (jobs) { return jobs.find(function (j) { return j.id === id; }) || null; }); }
  function saveInspection(inspection, file) {
    inspection.updatedAt = Date.now(); inspection.image = file;
    return ready().then(function (state) {
      inspection.ownerId = state.cloud ? state.user.id : localOwner();
      if (!state.cloud) return WcLocal.putInspection(inspection);
      var ext = ((file.type || "image/jpeg").split("/")[1] || "jpg").replace("jpeg", "jpg");
      var path = state.user.id + "/" + inspection.jobId + "/" + inspection.id + "." + ext;
      return WcCloud.upload(path, file).then(function (up) {
        if (up.error) throw up.error;
        inspection.imagePath = path;
        return WcCloud.query("inspections").insert(inspectionToRow(inspection, state.user.id)).then(function (r) { if (r.error) throw r.error; return WcLocal.putInspection(inspection); });
      });
    });
  }
  function updateInspection(inspection) {
    inspection.updatedAt = Date.now();
    return WcLocal.putInspection(inspection).then(ready).then(function (state) {
      if (!state.cloud) return inspection;
      return WcCloud.query("inspections").update(inspectionToRow(inspection, state.user.id)).eq("id", inspection.id).then(function (r) { if (r.error) throw r.error; return inspection; });
    });
  }
  function inspectionsFor(jobId) {
    return ready().then(function (state) {
      var owner = state.cloud ? state.user.id : localOwner();
      if (!state.cloud) return WcLocal.inspectionsFor(jobId).then(function (list) { return list.filter(function (i) { return (i.ownerId || "local") === owner; }); });
      return WcCloud.query("inspections").select("*").eq("job_id", jobId).order("created_at", { ascending: false }).then(function (r) {
        if (r.error) throw r.error;
        var list = r.data.map(rowToInspection);
        return Promise.all(list.map(WcLocal.putInspection)).then(function () { return list; });
      }).catch(function () { return WcLocal.inspectionsFor(jobId); });
    });
  }
  function getInspection(id) {
    return WcLocal.getInspection(id).then(function (local) {
      return ready().then(function (state) {
        var owner = state.cloud ? state.user.id : localOwner();
        if (local && (local.ownerId || "local") === owner) return local;
        if (!state.cloud) return null;
        return WcCloud.query("inspections").select("*").eq("id", id).single().then(function (r) { return r.error ? null : rowToInspection(r.data); });
      });
    });
  }
  function imageUrl(inspection) {
    if (inspection.image) return Promise.resolve(URL.createObjectURL(inspection.image));
    return ready().then(function (state) { return state.cloud ? WcCloud.signedUrl(inspection.imagePath) : null; });
  }
  function removeJob(id) {
    return ready().then(function (state) {
      return WcLocal.inspectionsFor(id).then(function (list) {
        var paths = list.map(function (i) { return i.imagePath; }).filter(Boolean);
        var cloudDelete = state.cloud ? WcCloud.removeFiles(paths).then(function () { return WcCloud.query("jobs").delete().eq("id", id); }) : null;
        return Promise.all([WcLocal.removeJob(id), Promise.all(list.map(function (i) { return WcLocal.removeInspection(i.id); })), cloudDelete]);
      });
    });
  }
  function allInspections() { return Promise.all([allJobs(), ready()]).then(function (v) { var owner = v[1].cloud ? v[1].user.id : localOwner(); return WcLocal.allInspections().then(function (list) { return list.filter(function (i) { return (i.ownerId || "local") === owner; }); }); }); }
  function authState() { return ready().then(function (s) { return { configured: s.cloud, user: s.user, isGuest: !!(s.user && s.user.is_anonymous) }; }); }
  window.WcData = { ready: ready, putJob: putJob, getJob: getJob, allJobs: allJobs, saveInspection: saveInspection, updateInspection: updateInspection, inspectionsFor: inspectionsFor, getInspection: getInspection, allInspections: allInspections, imageUrl: imageUrl, removeJob: removeJob, authState: authState };
  window.WcDb = { put: putJob, get: getJob, all: allJobs, remove: removeJob };
})();
