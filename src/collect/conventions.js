// How Walkdown recognises trace evidence in an ordinary Jira project.
// Teams adopt these labels and link types; the sample project uses them too.

module.exports = {
  labels: {
    requirement: 'wd-requirement',
    test: 'wd-test',
    risk: 'wd-risk',
    safety: 'safety-related',
    changed: 'changed-since-release',
    controlVerified: 'control-verified',
    classPrefix: 'iec62304-class-', // iec62304-class-a | -b | -c
    resultPrefix: 'result-', // result-pass | result-fail | result-not-run
  },
  linkTypes: {
    verifies: { name: 'Verifies', outward: 'verifies', inward: 'is verified by' },
    riskControl: { name: 'Risk control', outward: 'mitigates', inward: 'is mitigated by' },
  },
};
