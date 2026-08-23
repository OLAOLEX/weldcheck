(function () {
  "use strict";

  Promise.all([WcData.allJobs(), WcData.allAttempts()]).then(function (values) {
    var jobs = values[0];
    var attempts = values[1];
    var errors = attempts.reduce(function (count, attempt) {
      return count + (attempt.setupIssuesSeen || []).length;
    }, 0);
    var accepted = [];

    jobs.forEach(function (job) {
      var attemptNumbers = attempts.filter(function (attempt) {
        return attempt.jobId === job.id && attempt.supervisorStatus === "accepted";
      }).map(function (attempt) {
        return attempt.attemptNo;
      });
      if (attemptNumbers.length) accepted.push(Math.min.apply(null, attemptNumbers));
    });

    var average = accepted.length ? (accepted.reduce(function (a, b) {
      return a + b;
    }, 0) / accepted.length).toFixed(1) : "—";
    var timeNode = Wc.$("sTime");
    var reviewedNode = Wc.$("sReviewed");
    var renderObserver;

    function apply() {
      if (reviewedNode) reviewedNode.textContent = errors;
      if (timeNode) timeNode.textContent = average;
    }

    // history.js also renders these legacy statistic slots after its cloud query.
    // Re-apply the learning metrics if that later render replaces them.
    if (timeNode) {
      renderObserver = new MutationObserver(function () {
        if (/ms$/.test(timeNode.textContent.trim())) {
          renderObserver.disconnect();
          apply();
        }
      });
      renderObserver.observe(timeNode, { childList: true, characterData: true, subtree: true });
    }

    var content = Wc.$("dashboardContent");
    if (!content || !content.hidden) {
      apply();
      return;
    }

    var visibilityObserver = new MutationObserver(function () {
      if (!content.hidden) {
        visibilityObserver.disconnect();
        apply();
      }
    });
    visibilityObserver.observe(content, { attributes: true, attributeFilter: ["hidden"] });
  });
})();
