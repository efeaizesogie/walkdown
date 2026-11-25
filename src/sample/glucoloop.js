// GlucoLoop: a fictional insulin-dosing companion app (SaMD, IEC 62304 Class C).
// One source of truth for the sample project: the in-app loader builds Jira/Confluence
// from it, and the engine tests use it as fixtures. Some traces are broken on purpose.
//
// ids are local; the loader maps them to real Jira keys.

const RELEASE = 'GlucoLoop 2.4.0';

const userNeeds = [
  { id: 'UN1', summary: 'People can dose insulin accurately for a meal' },
  { id: 'UN2', summary: 'People are warned in time about dangerous glucose levels' },
  { id: 'UN3', summary: 'Readings and dose history are reliable and stay in sync' },
  { id: 'UN4', summary: 'The app is clear and easy to use every day' },
];

const designs = [
  { id: 'SDD1', title: 'SDD-01 Bolus calculator design', body: 'Dose = carbs / carb ratio + (glucose - target) / correction factor - insulin on board. Result is rounded DOWN to the pump increment (0.05 U) and capped at the max bolus.' },
  { id: 'SDD2', title: 'SDD-02 Glucose alerting design', body: 'Alert thresholds, escalation timing, and the rule that urgent-low alerts cannot be silenced.' },
  { id: 'SDD3', title: 'SDD-03 Connectivity and sync design', body: 'Bluetooth reconnect strategy, CGM signal-loss detection and cloud sync queue.' },
  { id: 'SDD4', title: 'SDD-04 Reporting and UI design', body: 'Dose history log, clinician PDF report, onboarding, themes and languages.' },
];

// safetyClass: IEC 62304 class of the software item. safety: implements a risk control.
// trace: what evidence exists. Missing pieces are the deliberate audit findings.
const requirements = [
  { id: 'R1', need: 'UN1', summary: 'Bolus calculator computes the dose from carb ratio, correction factor and insulin on board', safetyClass: 'C', safety: true, design: 'SDD1', commits: ['Add bolus calculator core'], test: 'pass', risks: ['H8'] },
  { id: 'R2', need: 'UN1', summary: 'Bolus dose is rounded to the pump increment of 0.05 U', safetyClass: 'C', safety: true, design: 'SDD1', commits: ['Round bolus to pump increment'], test: 'pass', risks: [], changed: true,
    drama: 'Hero gap: the over-delivery hazard H1 is in the risk file, but no risk control is linked to this requirement.' },
  { id: 'R3', need: 'UN1', summary: 'A single bolus can never exceed the configured maximum (default 25 U)', safetyClass: 'C', safety: true, design: 'SDD1', commits: ['Enforce max bolus cap'], test: 'pass', risks: ['H2'] },
  { id: 'R4', need: 'UN1', summary: 'Insulin on board is subtracted from the suggested bolus', safetyClass: 'C', safety: true, design: 'SDD1', commits: ['Subtract IOB from suggestion'], test: 'fail', risks: ['H4'], changed: true,
    drama: 'Verification test failed and nobody raised an anomaly.' },
  { id: 'R5', need: 'UN2', summary: 'Low glucose alert fires within 5 minutes of a reading below 70 mg/dL', safetyClass: 'C', safety: true, design: 'SDD2', commits: ['Low glucose alert'], test: 'pass', risks: ['H3'] },
  { id: 'R6', need: 'UN2', summary: 'Urgent low alert (below 54 mg/dL) cannot be silenced', safetyClass: 'C', safety: true, design: 'SDD2', commits: ['Urgent low alert ignores mute'], test: 'pass', risks: ['H3u'],
    drama: 'Risk control exists but was never verified as effective.' },
  { id: 'R7', need: 'UN2', summary: 'High glucose alert threshold is configurable from 180 to 400 mg/dL', safetyClass: 'B', safety: false, design: 'SDD2', commits: ['Configurable high alert'], test: 'pass', risks: [] },
  { id: 'R8', need: 'UN2', summary: 'Signal loss alert after 20 minutes without a CGM reading', safetyClass: 'B', safety: true, design: 'SDD3', commits: ['CGM signal loss alert'], test: 'pass', risks: ['H7'] },
  { id: 'R9', need: 'UN4', summary: 'Glucose shows in mg/dL or mmol/L with correct conversion', safetyClass: 'B', safety: true, design: null, commits: ['Unit conversion'], test: 'pass', risks: ['H5'],
    drama: 'No design record linked.' },
  { id: 'R10', need: 'UN3', summary: 'Dose history log is tamper-evident', safetyClass: 'B', safety: false, design: 'SDD4', commits: ['Hash-chain dose log'], test: 'not-run', risks: [],
    drama: 'Test exists but was never executed.' },
  { id: 'R11', need: 'UN3', summary: 'Pump connection reconnects within 30 seconds after a Bluetooth drop', safetyClass: 'B', safety: false, design: 'SDD3', commits: ['BLE reconnect backoff'], test: 'pass', risks: [] },
  { id: 'R12', need: 'UN3', summary: 'Readings sync to the cloud when the phone is online', safetyClass: 'A', safety: false, design: 'SDD3', commits: [], test: 'pass', risks: [],
    drama: 'No commit references it.' },
  { id: 'R13', need: 'UN4', summary: 'Clinician can export a 14-day PDF report', safetyClass: 'A', safety: false, design: 'SDD4', commits: ['Clinician PDF export'], test: 'pass', risks: [], release: false,
    drama: 'Not assigned to a release.' },
  { id: 'R14', need: 'UN4', summary: 'App supports a dark theme', safetyClass: 'A', safety: false, design: 'SDD4', commits: ['Dark theme'], test: 'pass', risks: [] },
  { id: 'R15', need: 'UN4', summary: 'First-run onboarding explains dosing settings', safetyClass: 'A', safety: false, design: 'SDD4', commits: ['Onboarding flow'], test: 'pass', risks: [] },
  { id: 'R16', need: 'UN3', summary: 'Session locks after 15 minutes of inactivity', safetyClass: 'B', safety: false, design: 'SDD4', commits: ['Inactivity lock'], test: 'pass', risks: [] },
  { id: 'R17', need: 'UN3', summary: 'Every change to dosing settings is recorded in an audit trail', safetyClass: 'B', safety: false, design: 'SDD4', commits: ['Settings audit trail'], test: 'pass', risks: [] },
  { id: 'R18', need: 'UN1', summary: 'Carb ratio follows a time-of-day schedule', safetyClass: 'C', safety: true, design: 'SDD1', commits: ['Carb ratio schedule'], test: 'pass', risks: ['H6'] },
  { id: 'R19', need: 'UN1', summary: 'Temporary basal suggestion is display-only and never sent to the pump', safetyClass: 'B', safety: false, design: 'SDD1', commits: ['Temp basal display'], test: 'pass', risks: [] },
  { id: 'R20', need: 'UN4', summary: 'App is available in English and Spanish', safetyClass: 'A', safety: false, design: 'SDD4', commits: ['Spanish locale'], test: 'pass', risks: [] },
];

// ISO 14971 risk file. controlVerified: evidence that the control works.
// H1 has no requirement linked to it: that is the hero finding on R2.
const risks = [
  { id: 'H1', hazard: 'Insulin over-delivery when a dose is rounded up', control: 'Always round down to the pump increment', controlVerified: true },
  { id: 'H2', hazard: 'Overdose from an unusually large bolus', control: 'Hard cap at the configured maximum bolus', controlVerified: true },
  { id: 'H3', hazard: 'Hypoglycaemia goes unnoticed', control: 'Low alert within 5 minutes', controlVerified: true },
  { id: 'H3u', hazard: 'Severe hypoglycaemia alert is muted', control: 'Urgent low alert ignores mute', controlVerified: false },
  { id: 'H4', hazard: 'Insulin stacking from back-to-back boluses', control: 'Subtract insulin on board', controlVerified: true },
  { id: 'H5', hazard: 'Wrong unit shown leads to a wrong dose decision', control: 'Unit label on every value; conversion test suite', controlVerified: true },
  { id: 'H6', hazard: 'Wrong carb ratio at a given time of day', control: 'Schedule preview before saving', controlVerified: true },
  { id: 'H7', hazard: 'CGM signal loss goes unnoticed', control: 'Signal loss alert after 20 minutes', controlVerified: true },
  { id: 'H8', hazard: 'Dose calculation error', control: 'Independent double calculation with tolerance check', controlVerified: true },
];

// Engine input as if the project were loaded with keys GLU-1.. (used by tests).
function asEngineInput(prefix = 'GLU') {
  const key = (r) => `${prefix}-${requirements.indexOf(r) + 1}`;
  return requirements.map((r) => ({
    key: key(r),
    summary: r.summary,
    safetyClass: r.safetyClass,
    safetyRelated: r.safety,
    changedSinceLastRelease: !!r.changed,
    designs: r.design ? [{ title: designs.find((d) => d.id === r.design).title, source: 'confluence' }] : [],
    implementations: r.commits.map((m, i) => ({ label: `${m} (${key(r)})`, source: 'bitbucket' })),
    tests: [{ key: `TC-${r.id}`, result: r.test, source: 'jira' }],
    risks: r.risks.map((id) => {
      const h = risks.find((x) => x.id === id);
      return { key: id, hazard: h.hazard, controlVerified: h.controlVerified, source: 'jira' };
    }),
    fixVersions: r.release === false ? [] : [RELEASE],
  }));
}

module.exports = { RELEASE, userNeeds, designs, requirements, risks, asEngineInput };
