/* Local-first learning-cycle data service with optional Supabase sync. */
(function () {
  "use strict";
  var readyPromise, CACHE_KEY = "wcExerciseTemplatesV3";
  function owner() { try { return localStorage.getItem("wcLastUserId") || "local"; } catch (e) { return "local"; } }
  function ready() {
    if (!readyPromise) readyPromise = WcCloud.init().then(function (s) {
      if (!s.configured) return { cloud: false, user: null };
      return WcCloud.ensureSession().then(function (session) {
        try { localStorage.setItem("wcLastUserId", session.user.id); } catch (e) {}
        return { cloud: true, user: session.user };
      });
    }).catch(function () { return { cloud: false, user: null }; });
    return readyPromise;
  }
  function iso(n) { return new Date(n || Date.now()).toISOString(); }
  function time(s) { return s ? Date.parse(s) : Date.now(); }
  function templateFrom(r) {
    return { id:r.id, code:r.code, name:r.name, description:r.description||"", objective:r.description||"", difficulty:"School exercise", material:r.material, jointType:r.joint_type,
      thicknessMin:Number(r.plate_thickness_min_mm), thicknessMax:Number(r.plate_thickness_max_mm), electrodeClassification:r.electrode_classification,
      electrodeSize:Number(r.electrode_size_mm), currentMin:Number(r.current_min_amp), currentMax:Number(r.current_max_amp),
      weldingPosition:r.welding_position, preparationChecks:r.preparation_checks||[], expectedAppearance:r.expected_appearance||[],
      sourceReference:r.source_reference, version:r.version, active:r.active, workflowType:"practice", instructions:[], commonChecks:[], photoInstruction:"" };
  }
  function cachedTemplates(v) {
    try { if (v) localStorage.setItem(CACHE_KEY, JSON.stringify(v)); return JSON.parse(localStorage.getItem(CACHE_KEY)||"[]"); } catch (e) { return []; }
  }
  function allTemplates() {
    return ready().then(function (s) {
      var builtIn = window.WcBuiltinExercises || [];
      if (!s.cloud) return builtIn.concat(cachedTemplates().filter(function (x) { return !x.builtIn; }));
      return WcCloud.query("exercise_templates").select("*").eq("active", true).order("name").then(function (r) {
        if (r.error) throw r.error; return builtIn.concat(cachedTemplates((r.data||[]).map(templateFrom)));
      }).catch(function () { return builtIn.concat(cachedTemplates()); });
    });
  }
  function jobRow(j, uid) {
    var x=j.exerciseSnapshot||{};
    return { id:j.id,user_id:uid,sample_no:j.sampleNo,job_name:j.jobName||null,material:x.material||j.material||"Mild steel",
      joint_type:x.jointType||j.jointType,plate_thickness_mm:Number(x.thicknessMin||j.plateThickness),electrode_classification:x.electrodeClassification||j.electrodeClassification,
      electrode_size_mm:Number(x.electrodeSize||j.electrodeSize),welding_position:x.weldingPosition||j.weldingPosition,current_amp:Number(x.currentMin||j.currentAmp||1),
      operator_name:j.operator||null,job_date:j.date||null,note:j.note||null,checklist_json:{workflowType:j.workflowType||x.workflowType||"practice",clientProject:j.clientProject||"",referenceType:j.referenceType||"",referenceText:j.referenceText||""},status:j.status==="inspected"?"inspected":"draft",
      exercise_template_id:j.exerciseTemplateId||null,exercise_snapshot:x,created_at:iso(j.createdAt),updated_at:iso(j.updatedAt) };
  }
  function jobFrom(r) {
    var x=r.exercise_snapshot||{};
    if (!Object.keys(x).length) x={ code:"LEGACY",name:"Earlier WeldCheck record",material:r.material,jointType:r.joint_type,thicknessMin:Number(r.plate_thickness_mm),thicknessMax:Number(r.plate_thickness_mm),electrodeClassification:r.electrode_classification,electrodeSize:Number(r.electrode_size_mm),weldingPosition:r.welding_position,currentMin:Number(r.current_amp),currentMax:Number(r.current_amp),preparationChecks:[],expectedAppearance:[],sourceReference:"Created before approved exercise templates",version:1,legacy:true };
    var meta=r.checklist_json||{};
    return { id:r.id,ownerId:r.user_id,sampleNo:r.sample_no,jobName:r.job_name||"",material:r.material,operator:r.operator_name||"",date:r.job_date,note:r.note||"",workflowType:meta.workflowType||x.workflowType||"practice",clientProject:meta.clientProject||"",referenceType:meta.referenceType||"",referenceText:meta.referenceText||"",
      status:r.status,exerciseTemplateId:r.exercise_template_id,exerciseSnapshot:x,jointType:x.jointType||r.joint_type,plateThickness:x.thicknessMin||r.plate_thickness_mm,
      electrodeClassification:x.electrodeClassification||r.electrode_classification,electrodeSize:x.electrodeSize||r.electrode_size_mm,
      weldingPosition:x.weldingPosition||r.welding_position,currentAmp:x.currentMin||r.current_amp,createdAt:time(r.created_at),updatedAt:time(r.updated_at) };
  }
  function attemptRow(a, uid) {
    return { id:a.id,job_id:a.jobId,user_id:uid,attempt_no:Number(a.attemptNo),previous_attempt_id:a.previousAttemptId||null,
      plate_thickness_mm:Number(a.plateThickness),electrode_classification:a.electrodeClassification,electrode_size_mm:Number(a.electrodeSize),
      welding_position:a.weldingPosition,current_amp:a.currentAmp===""||a.currentAmp==null?null:Number(a.currentAmp),checklist_json:a.checks||{},
      readiness_status:a.readinessStatus||"draft",readiness_issues:a.readinessIssues||[],setup_issues_seen:a.setupIssuesSeen||[],correction_plan:a.correctionPlan||[],correction_note:a.correctionNote||null,
      supervisor_status:a.supervisorStatus||"unreviewed",reviewer_name:a.reviewerName||null,supervisor_comment:a.supervisorComment||null,
      reviewed_at:a.reviewedAt?iso(a.reviewedAt):null,created_at:iso(a.createdAt),updated_at:iso(a.updatedAt) };
  }
  function attemptFrom(r) {
    return { id:r.id,ownerId:r.user_id,jobId:r.job_id,attemptNo:r.attempt_no,previousAttemptId:r.previous_attempt_id,
      plateThickness:r.plate_thickness_mm,electrodeClassification:r.electrode_classification,electrodeSize:r.electrode_size_mm,weldingPosition:r.welding_position,
      currentAmp:r.current_amp==null?"":r.current_amp,checks:r.checklist_json||{},readinessStatus:r.readiness_status,readinessIssues:r.readiness_issues||[],setupIssuesSeen:r.setup_issues_seen||[],
      correctionPlan:r.correction_plan||[],correctionNote:r.correction_note||"",supervisorStatus:r.supervisor_status,reviewerName:r.reviewer_name||"",
      supervisorComment:r.supervisor_comment||"",reviewedAt:r.reviewed_at?time(r.reviewed_at):null,createdAt:time(r.created_at),updatedAt:time(r.updated_at) };
  }
  function inspectionRow(i, uid) {
    var metrics=Object.assign({},i.metrics||{});
    metrics.provenance={modelName:i.modelName||null,schemaVersion:i.schemaVersion||null,promptVersion:i.promptVersion||null,appVersion:i.appVersion||null};
    metrics.reference={basis:i.referenceBasis||null,source:i.referenceSource||"",assessedAt:i.referenceAssessedAt||null,note:i.referenceNote||""};
    return { id:i.id,job_id:i.jobId,attempt_id:i.attemptId||null,user_id:uid,image_path:i.imagePath||null,status:i.status,confidence_level:i.confidenceLevel,
      confidence_reason:i.confidenceReason,image_quality_status:i.imageQualityStatus,image_quality_issues:i.imageQualityIssues||[],summary:i.summary,conditions:i.conditions||[],
      observations:i.observations||[],assessment_reason:i.assessmentReason,possible_causes:i.possibleCauses||[],recommended_actions:i.recommendedActions||[],limitations:i.limitations||[],
      metrics_json:metrics,engine:i.engine||"ai",model_name:i.modelName||null,schema_version:i.schemaVersion||null,prompt_version:i.promptVersion||null,app_version:i.appVersion||null,response_time_ms:i.responseTimeMs||0,human_verdict:i.humanVerdict||null,corrected_conditions:i.correctedConditions||[],
      reference_conditions:i.referenceConditions||[],comparison_result:i.comparisonResult||null,reference_basis:i.referenceBasis||null,reference_source:i.referenceSource||null,reference_assessed_at:i.referenceAssessedAt||null,reference_note:i.referenceNote||null,created_at:iso(i.createdAt),updated_at:iso(i.updatedAt) };
  }
  function inspectionFrom(r) {
    var metrics=r.metrics_json||{},provenance=metrics.provenance||{},reference=metrics.reference||{};
    return { id:r.id,ownerId:r.user_id,jobId:r.job_id,attemptId:r.attempt_id,imagePath:r.image_path,status:r.status,confidenceLevel:r.confidence_level,
      confidenceReason:r.confidence_reason,imageQualityStatus:r.image_quality_status,imageQualityIssues:r.image_quality_issues||[],summary:r.summary,conditions:r.conditions||[],
      observations:r.observations||[],assessmentReason:r.assessment_reason,possibleCauses:r.possible_causes||[],recommendedActions:r.recommended_actions||[],limitations:r.limitations||[],
      metrics:metrics,engine:r.engine,modelName:r.model_name||provenance.modelName||"Not recorded",schemaVersion:r.schema_version||provenance.schemaVersion||"Not recorded",promptVersion:r.prompt_version||provenance.promptVersion||"Not recorded",appVersion:r.app_version||provenance.appVersion||"Not recorded",responseTimeMs:r.response_time_ms,humanVerdict:r.human_verdict,correctedConditions:r.corrected_conditions||[],
      referenceConditions:r.reference_conditions||[],comparisonResult:r.comparison_result,referenceBasis:r.reference_basis||reference.basis||null,referenceSource:r.reference_source||reference.source||"",referenceAssessedAt:r.reference_assessed_at||reference.assessedAt||null,referenceNote:r.reference_note||reference.note||"",createdAt:time(r.created_at),updatedAt:time(r.updated_at) };
  }
  function traceCompatible(row) {
    var copy=Object.assign({},row);
    ["model_name","schema_version","prompt_version","app_version","reference_basis","reference_source","reference_assessed_at","reference_note"].forEach(function(key){delete copy[key];});
    return copy;
  }
  function writeInspection(operation,row){return operation(row).then(function(r){if(r.error&&/column|schema cache/i.test(String(r.error.message||"")))return operation(traceCompatible(row));return r;});}
  function owned(list, uid, cloud) { return list.filter(function (x) { var o=x.ownerId||"local"; return o===uid||(cloud&&o==="local"); }); }
  function merge(a,b) { var m={}; a.concat(b).forEach(function(x){m[x.id]=x;}); return Object.keys(m).map(function(k){return m[k];}); }
  function enrich(jobs, attempts, inspections) {
    jobs.forEach(function(j){
      var aa=attempts.filter(function(a){return a.jobId===j.id;}).sort(function(a,b){return b.attemptNo-a.attemptNo;});
      var ii=inspections.filter(function(i){return i.jobId===j.id;}).sort(function(a,b){return b.createdAt-a.createdAt;});
      j.attemptCount=aa.length;j.latestAttemptId=aa[0]&&aa[0].id;j.latestAttemptNo=aa[0]&&aa[0].attemptNo;
      j.latestReadinessStatus=aa[0]&&aa[0].readinessStatus;j.latestSupervisorStatus=aa[0]&&aa[0].supervisorStatus;
      j.inspectionCount=ii.length;j.latestInspectionId=ii[0]&&ii[0].id;j.latestInspectionAttemptId=ii[0]&&ii[0].attemptId;j.latestStatus=ii[0]&&ii[0].status;
    }); return jobs.sort(function(a,b){return b.createdAt-a.createdAt;});
  }
  function putCloud(table,row,id) { return WcCloud.query(table).upsert(row).then(function(r){if(r.error)throw r.error;return id;}); }
  function putJob(j) { j.updatedAt=Date.now();return ready().then(function(s){j.ownerId=s.cloud?s.user.id:owner();return WcLocal.putJob(j).then(function(){return s.cloud?putCloud("jobs",jobRow(j,s.user.id),j):j;});}).catch(function(){j.syncPending=true;return WcLocal.putJob(j);}); }
  function putAttempt(a) { var seen=(a.setupIssuesSeen||[]).concat((a.readinessIssues||[]).map(function(x){return x.code;}).filter(function(code){return /range|mismatch/.test(code);}));a.setupIssuesSeen=Array.from(new Set(seen));a.updatedAt=Date.now();return ready().then(function(s){a.ownerId=s.cloud?s.user.id:owner();return WcLocal.putAttempt(a).then(function(){return s.cloud?putCloud("attempts",attemptRow(a,s.user.id),a):a;});}).catch(function(){a.syncPending=true;return WcLocal.putAttempt(a);}); }
  function updateAttempt(a){return putAttempt(a);}
  function bundle() {
    return Promise.all([WcLocal.allJobs(),WcLocal.allAttempts(),WcLocal.allInspections(),ready()]).then(function(v){
      var s=v[3],uid=s.cloud?s.user.id:owner(),lj=owned(v[0],uid,s.cloud),la=owned(v[1],uid,s.cloud),li=owned(v[2],uid,s.cloud);
      if(!s.cloud)return {jobs:enrich(lj,la,li),attempts:la,inspections:li};
      var sync=lj.filter(function(x){return x.syncPending||(x.ownerId||"local")==="local";}).map(function(x){x.ownerId=uid;delete x.syncPending;return putCloud("jobs",jobRow(x,uid),x).then(function(){return WcLocal.putJob(x);});});
      sync=sync.concat(la.filter(function(x){return x.syncPending||(x.ownerId||"local")==="local";}).map(function(x){x.ownerId=uid;delete x.syncPending;return putCloud("attempts",attemptRow(x,uid),x).then(function(){return WcLocal.putAttempt(x);});}));
      return Promise.all(sync).then(function(){return Promise.all([WcCloud.query("jobs").select("*"),WcCloud.query("attempts").select("*"),WcCloud.query("inspections").select("*")]);}).then(function(r){
        if(r[0].error||r[1].error||r[2].error)throw r[0].error||r[1].error||r[2].error;
        var cj=r[0].data.map(jobFrom),ca=r[1].data.map(attemptFrom),ci=r[2].data.map(inspectionFrom),jobs=merge(lj,cj),attempts=merge(la,ca),inspections=merge(li,ci);
        return Promise.all(cj.map(WcLocal.putJob).concat(ca.map(WcLocal.putAttempt),ci.map(WcLocal.putInspection))).then(function(){return {jobs:enrich(jobs,attempts,inspections),attempts:attempts,inspections:inspections};});
      }).catch(function(){return {jobs:enrich(lj,la,li),attempts:la,inspections:li};});
    });
  }
  function saveInspection(i,file){i.updatedAt=Date.now();i.image=file;return ready().then(function(s){i.ownerId=s.cloud?s.user.id:owner();if(!s.cloud)return WcLocal.putInspection(i);var ext=((file.type||"image/jpeg").split("/")[1]||"jpg").replace("jpeg","jpg"),path=s.user.id+"/"+i.jobId+"/"+(i.attemptId||"legacy")+"/"+i.id+"."+ext;return WcCloud.upload(path,file).then(function(r){if(r.error)throw r.error;i.imagePath=path;var row=inspectionRow(i,s.user.id);return writeInspection(function(value){return WcCloud.query("inspections").insert(value);},row).then(function(x){if(x.error)throw x.error;return WcLocal.putInspection(i);});});});}
  function updateInspection(i){i.updatedAt=Date.now();return WcLocal.putInspection(i).then(ready).then(function(s){if(!s.cloud)return i;var row=inspectionRow(i,s.user.id);return writeInspection(function(value){return WcCloud.query("inspections").update(value).eq("id",i.id);},row).then(function(r){if(r.error)throw r.error;return i;});});}
  function getJob(id){return bundle().then(function(b){return b.jobs.find(function(x){return x.id===id;})||null;});}
  function allJobs(){return bundle().then(function(b){return b.jobs;});}
  function getAttempt(id){return bundle().then(function(b){return b.attempts.find(function(x){return x.id===id;})||null;});}
  function allAttempts(){return bundle().then(function(b){return b.attempts;});}
  function attemptsFor(id){return allAttempts().then(function(a){return a.filter(function(x){return x.jobId===id;}).sort(function(x,y){return y.attemptNo-x.attemptNo;});});}
  function getInspection(id){return bundle().then(function(b){return b.inspections.find(function(x){return x.id===id;})||null;});}
  function allInspections(){return bundle().then(function(b){return b.inspections;});}
  function inspectionsFor(id){return allInspections().then(function(a){return a.filter(function(x){return x.jobId===id;}).sort(function(x,y){return y.createdAt-x.createdAt;});});}
  function inspectionsForAttempt(id){return allInspections().then(function(a){return a.filter(function(x){return x.attemptId===id;}).sort(function(x,y){return y.createdAt-x.createdAt;});});}
  function imageUrl(i){if(i.image)return Promise.resolve(URL.createObjectURL(i.image));return ready().then(function(s){return s.cloud&&i.imagePath?WcCloud.signedUrl(i.imagePath):null;});}
  function removeJob(id){return Promise.all([attemptsFor(id),inspectionsFor(id),ready()]).then(function(v){var paths=v[1].map(function(i){return i.imagePath;}).filter(Boolean),s=v[2];return Promise.all([WcLocal.removeJob(id),Promise.all(v[0].map(function(a){return WcLocal.removeAttempt(a.id);})),Promise.all(v[1].map(function(i){return WcLocal.removeInspection(i.id);})),s.cloud?WcCloud.removeFiles(paths).then(function(){return WcCloud.query("jobs").delete().eq("id",id);}):null]);});}
  function authState(){return ready().then(function(s){return {configured:s.cloud,user:s.user,isGuest:!!(s.user&&s.user.is_anonymous)};});}
  window.WcData={ready:ready,allTemplates:allTemplates,putJob:putJob,getJob:getJob,allJobs:allJobs,putAttempt:putAttempt,updateAttempt:updateAttempt,getAttempt:getAttempt,allAttempts:allAttempts,attemptsFor:attemptsFor,saveInspection:saveInspection,updateInspection:updateInspection,getInspection:getInspection,allInspections:allInspections,inspectionsFor:inspectionsFor,inspectionsForAttempt:inspectionsForAttempt,imageUrl:imageUrl,removeJob:removeJob,authState:authState};
  window.WcDb={put:putJob,get:getJob,all:allJobs,remove:removeJob};
})();
