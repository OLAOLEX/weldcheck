-- Optional demonstration data for UI and project-flow testing.
-- This is not a workshop procedure, WPS, code acceptance criterion or certification basis.
-- The electrode/current/thickness combination is taken from the cited Lincoln Electric
-- STICK amperage table. Replace this record when the project supervisor approves the
-- final practical exercise.

insert into public.exercise_templates (
  code, name, description, material, joint_type,
  plate_thickness_min_mm, plate_thickness_max_mm,
  electrode_classification, electrode_size_mm,
  current_min_amp, current_max_amp, welding_position,
  preparation_checks, expected_appearance, source_reference,
  version, active
)
values (
  'DEMO-FB-01',
  'Demonstration flat butt joint',
  'Demonstration exercise for testing the WeldCheck learning cycle. Confirm the final practical values with the workshop supervisor.',
  'Mild steel',
  'Butt joint',
  4.7,
  4.7,
  'E6013',
  3.2,
  90,
  110,
  'Flat',
  '[
    {"key":"joint_arrangement","text":"Joint arrangement and fit-up are confirmed.","why":"The exercise joint must be prepared and held in the intended arrangement."},
    {"key":"surface_clean","text":"The plate and weld area are clean.","why":"Remove loose scale, oil, paint and other visible contamination from the weld area."},
    {"key":"electrode_confirmed","text":"Electrode classification, diameter and condition are confirmed.","why":"Use the electrode specified by this demonstration exercise and check that it is suitable for use."},
    {"key":"current_confirmed","text":"The machine current and polarity are confirmed.","why":"Record the actual current and follow the electrode and equipment instructions."},
    {"key":"connections_secure","text":"Holder, leads and work return clamp are secure.","why":"Loose or damaged welding connections require correction before work begins."},
    {"key":"ppe_ready","text":"Required welding PPE is ready and correctly worn.","why":"Follow the workshop safety procedure for helmet, gloves, clothing and other required protection."},
    {"key":"area_safe","text":"The work area is arranged for safe welding.","why":"Follow workshop controls for ventilation, fire prevention, screens and nearby people."}
  ]'::jsonb,
  '[
    "A continuous bead is visible along the exercise joint.",
    "Bead path and width appear reasonably consistent for comparison between attempts.",
    "No supported visible issue condition is evident in the submitted photograph."
  ]'::jsonb,
  'Demonstration source: Lincoln Electric STICK Amperage Values, Steel E6011/E6013 DC+, 1/8 in (3.2 mm) electrode on 3/16 in (4.7 mm) steel: 90-110 A. https://ch-delivery.lincolnelectric.com/api/public/content/582e9857a7324db29d14ceb7d16a8609?v=dfb50bd9',
  1,
  true
)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  material = excluded.material,
  joint_type = excluded.joint_type,
  plate_thickness_min_mm = excluded.plate_thickness_min_mm,
  plate_thickness_max_mm = excluded.plate_thickness_max_mm,
  electrode_classification = excluded.electrode_classification,
  electrode_size_mm = excluded.electrode_size_mm,
  current_min_amp = excluded.current_min_amp,
  current_max_amp = excluded.current_max_amp,
  welding_position = excluded.welding_position,
  preparation_checks = excluded.preparation_checks,
  expected_appearance = excluded.expected_appearance,
  source_reference = excluded.source_reference,
  version = excluded.version,
  active = excluded.active,
  updated_at = now();
