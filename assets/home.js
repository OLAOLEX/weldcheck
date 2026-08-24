/* Home-page hierarchy, account summary and record totals. */
(function () {
  "use strict";

  function alignWorkflows() {
    var grid = document.querySelector("#start .wc-workflow-grid"), cards;
    if (!grid) return;
    cards = grid.querySelectorAll(".wc-start-card");
    grid.classList.add("wc-workflow-grid--priority");
    if (cards[0]) {
      cards[0].classList.add("wc-start-card--primary");
      cards[0].querySelector(".wc-overline").textContent = "Primary workflow";
    }
    if (cards[1]) cards[1].querySelector(".wc-overline").textContent = "Additional workflow";
    if (cards[2]) cards[2].querySelector(".wc-overline").textContent = "Optional learning";
    var intro = document.querySelector("#start .wc-section-heading p:last-child");
    if (intro) intro.textContent = "Start with a welding job for the complete preparation, inspection and reporting workflow. Use the other paths only when they match the work.";
  }

  function accountCopy(state) {
    var status = Wc.$("accessState"), copy = Wc.$("accessText"), action = Wc.$("heroAccountBtn").querySelector("span:last-child");
    if (!state.configured) {
      status.textContent = "Local mode"; copy.textContent = "Drafts stay on this device."; action.textContent = "Access status";
    } else if (state.isGuest) {
      status.textContent = "Guest workspace active"; copy.textContent = "Your guest records are private. Connect Google to keep them across devices."; action.textContent = "Sign in or create account";
    } else {
      status.textContent = "Signed in and synchronized"; copy.textContent = "Your jobs, inspections and photographs are synchronized with your Google account."; action.textContent = "Open account and sync";
    }
  }

  function recent(jobs) {
    if (!jobs.length) return;
    Wc.$("recentList").innerHTML = '<div class="sel-rows">' + jobs.slice(0, 4).map(function (job) {
      var info = WcWorkflow.info(job), name = WcWorkflow.recordName(job);
      return '<a class="sel-row" href="' + Wc.nextPage(job) + '"><div class="sel-row__icon"><svg class="ic"><use href="#' + info.icon + '"></use></svg></div><div class="sel-row__body"><div class="sel-row__title">' + Wc.esc(job.sampleNo) + (name ? " · " + Wc.esc(name) : "") + '</div><div class="sel-row__sub">' + Wc.esc(info.label) + " · " + (job.attemptCount || 0) + " attempt(s) · " + (job.inspectionCount || 0) + ' photo review(s)</div></div>' + Wc.statusPill(job) + "</a>";
    }).join("") + "</div>";
  }

  function init() {
    alignWorkflows();
    Wc.$("heroAccountBtn").onclick = function () {
      if (window.WcAuth) WcAuth.open(); else Wc.toast("Account controls are still loading.");
    };
    Promise.all([WcData.allJobs(), WcData.allAttempts(), WcData.allInspections(), WcData.authState()]).then(function (values) {
      WcFx.countUp(Wc.$("statJobs"), values[0].length);
      WcFx.countUp(Wc.$("statChecks"), values[1].length);
      WcFx.countUp(Wc.$("statInspections"), values[2].length);
      accountCopy(values[3]); recent(values[0]);
      WcFx.reveal(document.body, { selector: ".sel-stat,.sel-card", step: 40 });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
