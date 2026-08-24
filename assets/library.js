/* Reviewed starter library. Values are guidance for supervised practice, not a WPS. */
(function () {
  "use strict";
  var AMP_SOURCE = "Lincoln Electric STICK Amperage Values: E6013 3.2 mm on 4.7 mm steel, 90–110 A DC+. https://ch-delivery.lincolnelectric.com/api/public/content/582e9857a7324db29d14ceb7d16a8609?v=dfb50bd9";
  var TECHNIQUE_SOURCE = "Miller, Five Steps to Improving Your Stick Welding Technique (CLAMS, stringer beads and surface preparation). https://www.millerwelds.com/en-us/resources/knowledge-hub/stick-welding/five-steps-to-improving-your-stick-welding-technique";
  var JOINT_SOURCE = "Miller, A Guide to the 5 Basic Types of Weld Joints. https://www.millerwelds.com/en-us/resources/knowledge-hub/welding-basics/a-guide-to-the-5-basic-types-of-weld-joints-and-tips-for-improving-results";
  var checks = window.WcWorkflow ? WcWorkflow.PREPARATION_CHECKS : [];

  function exercise(code, name, jointType, objective, steps, expected, source) {
    return {
      id: "builtin-" + code.toLowerCase(), code: code, name: name, description: objective,
      objective: objective, difficulty: "Beginner", durationMinutes: 20, builtIn: true,
      material: "Mild steel", jointType: jointType, thicknessMin: 4.7, thicknessMax: 4.7,
      electrodeClassification: "E6013", electrodeSize: 3.2, currentMin: 90, currentMax: 110,
      weldingPosition: "Flat", polarity: "DC+", preparationChecks: checks,
      instructions: steps, expectedAppearance: expected, commonChecks: ["Arc length", "Travel speed", "Electrode angle", "Surface cleanliness"],
      photoInstruction: "Clean the cooled sample, then photograph the full bead with both edges visible in even light.",
      sourceReference: AMP_SOURCE + " | " + TECHNIQUE_SOURCE + (source ? " | " + source : ""),
      version: 1, active: true, workflowType: "practice"
    };
  }

  window.WcBuiltinExercises = [
    exercise("LIB-BEAD-01", "Straight bead on flat plate", "Bead on plate", "Practise maintaining a steady arc, electrode angle and travel speed.",
      ["Mark a straight travel line on the clean plate.", "Use a comfortable position with a clear view of the weld pool.", "Deposit one straight stringer bead without weaving.", "Allow the sample to cool and remove loose slag before review."],
      ["A continuous bead follows the marked line.", "Bead width and path appear reasonably consistent.", "Both bead edges are visible for comparison."]),
    exercise("LIB-BEAD-02", "Restart and join two beads", "Bead on plate", "Practise stopping and restarting while keeping the joined area visible for review.",
      ["Mark one straight travel line.", "Deposit the first bead segment and stop before the end of the line.", "Restart to continue along the same line.", "Cool, clean and photograph the restart area and full bead."],
      ["Both bead sections follow the same path.", "The restart area is visible and does not hide the bead edges.", "Overall width is reasonably consistent."]),
    exercise("LIB-BEAD-03", "Parallel stringer beads", "Bead on plate", "Practise placing repeatable straight beads beside one another.",
      ["Mark three parallel travel lines on the clean plate.", "Deposit a straight stringer bead on each line.", "Keep the same recorded setup for all three beads.", "Cool, clean and photograph all beads from the same distance."],
      ["Three separate beads are visible.", "The paths are approximately parallel.", "Width and surface appearance can be compared between beads."]),
    exercise("LIB-BUTT-01", "Flat square butt joint", "Butt joint", "Practise following the centre of a fitted flat butt joint.",
      ["Prepare and secure the two plate edges using the approved workshop fit-up.", "Confirm the joint is stable before welding.", "Deposit a straight bead along the joint.", "Cool, clean and photograph the bead and both joint sides."],
      ["A continuous bead follows the joint line.", "Both weld toes remain visible.", "Bead path and width are reasonably consistent."], JOINT_SOURCE),
    exercise("LIB-LAP-01", "Flat lap-joint fillet", "Lap joint", "Practise following the line where two overlapped plates meet.",
      ["Arrange and secure the approved plate overlap.", "Confirm the pieces sit flush and cannot move.", "Deposit a fillet bead along the joint line.", "Cool, clean and photograph the bead with both joined plates visible."],
      ["A continuous fillet bead follows the overlap edge.", "The bead and both adjoining surfaces are visible.", "Bead path is reasonably consistent."], JOINT_SOURCE),
    exercise("LIB-T-01", "Flat T-joint fillet", "T-joint", "Practise maintaining a bead along the intersection of two plates.",
      ["Secure the plates in the approved T-joint arrangement.", "Confirm the upright plate cannot move.", "Deposit a fillet bead along the intersection.", "Cool, clean and photograph the bead with both plates visible."],
      ["A continuous fillet bead follows the plate intersection.", "Both weld toes are visible.", "Bead path and width are reasonably consistent."], JOINT_SOURCE)
  ];
})();
