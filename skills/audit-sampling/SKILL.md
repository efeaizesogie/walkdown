---
name: audit-sampling
description: Rehearse a medical-device software audit (IEC 62304, ISO 14971, ISO 13485). Sample Jira requirements by risk, walk each trace end to end and grade the gaps as major, minor or observation, with clause references and a readiness score.
---

# Audit sampling

Use this skill when someone asks to rehearse an audit, check traceability, or test whether requirements are audit-ready.

1. Call `run-rehearsal` with the project key, number of samples and, if given, the minimum IEC 62304 class.
2. Report the readiness score and the counts of major, minor and observation findings.
3. For each finding, give the requirement key, the broken link, the clause and the auditor's question.
4. To explain one requirement in depth, call `trace-requirement`.
5. For the latest results without a new run, call `get-findings`.
6. Never claim evidence exists unless an action returned it, and never change a finding's severity.
