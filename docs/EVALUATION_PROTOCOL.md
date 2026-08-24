# Controlled sample evaluation protocol

This protocol connects the physical SMAW work to the records produced by WeldCheck. Final sample settings and acceptance decisions must be approved by the responsible supervisor or workshop authority.

## 1. Define the sample plan

- Use mild steel and Shielded Metal Arc Welding only.
- Choose the joint condition, electrode classification and electrode diameter for the study.
- Define which variables remain controlled and which condition, if any, is intentionally varied.
- Plan a practical sample set agreed with the supervisor; five physical samples is the minimum planning target unless the approved methodology specifies another number.
- Do not manufacture unsafe conditions merely to obtain a visible issue.

## 2. Assign sample identities

Give every physical specimen a permanent sample number matching its WeldCheck record. Maintain a sample register containing:

| Field | Example |
|---|---|
| Sample number | WC-S01 |
| Test group or batch | Controlled set A |
| Date | YYYY-MM-DD |
| Operator | Recorded name or code |
| Material | Mild steel |
| Joint type | Approved study joint |
| Plate thickness | Measured value in mm |
| Electrode | Classification and diameter |
| Position | Recorded position |
| Current and polarity | Actual recorded settings |
| Applicable reference | WPS, procedure, drawing or approved setup |

## 3. Record preparation before welding

Use the primary **Record a welding job** workflow. Enter the applicable reference and actual settings. Resolve any displayed mismatch, complete the nine preparation checks and retain the readiness record.

“Ready” means only that the entered values and checks match the recorded requirement. It is not a prediction that the weld will pass.

## 4. Produce and photograph the sample

- Follow workshop safety controls and the approved welding procedure.
- Allow the sample to cool and remove loose slag.
- Keep the complete bead and both weld toes visible.
- Use a consistent camera, distance, orientation and lighting where practicable.
- Retake any image rejected by the local brightness, contrast, sharpness or resolution gate.
- Do not use WeldCheck generated demo drawings as experimental samples.

## 5. Obtain the reference assessment

The reference condition set must be obtained separately from the WeldCheck output. Record:

- reference basis: supervisor visual assessment, prepared-sample label or another documented reference;
- assessor or source;
- assessment date;
- visible condition set;
- optional method or observation note.

The person entering a reference must not describe it as independently verified unless that verification actually occurred. Suitable tests and qualified inspection remain necessary for internal condition or safety-critical decisions.

## 6. Run and preserve the WeldCheck assessment

For every sample, retain the original photograph, visible observations, AI condition set, confidence explanation, user confirmation, any correction, reference comparison, model name, prompt/schema versions, application release and response time. Rechecks create new records and must not overwrite earlier results.

## 7. Analyse the results

Use the CSV export with one row per attempt. Report at least:

- number of prepared samples and usable photographs;
- preparation/setup issues found before welding;
- WeldCheck visible conditions per sample;
- user confirmations or corrections;
- exact, partial and no-match reference comparisons;
- response times;
- failed or retaken photographs;
- limitations and reasons for disagreement.

Reference comparison rules are:

- **Exact match:** both condition sets are identical, including two empty acceptable sets.
- **Partial match:** at least one condition overlaps but the sets are not identical.
- **No match:** no condition overlaps.

Do not introduce precision, recall, F1-score or broad performance claims unless the approved methodology and sample size support them.

## 8. Evidence for the project report

Keep the physical samples, sample register, setup/checklist records, photographs, printable reports, exported analysis data, functional test results and screenshots of the deployed system. Do not fabricate missing sample results or treat generated drawings as physical evidence.
