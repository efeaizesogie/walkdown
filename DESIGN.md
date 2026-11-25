# Walkdown: design direction

## Who it's for and what it must make them feel
QA/RA leads at medical-device software companies, a few weeks before an audit. They should feel **"this is how an auditor will actually see us"**: calm, precise, nothing hidden. Single action: **run a rehearsal, then fix the first broken link.**

## Brand lock: Atlassian Design System
Walkdown lives inside Jira, so its brand is **ADS**. Colours, type and spacing come from ADS design tokens (`--ds-*`, enabled with `view.theme.enable()` in Custom UI), so light and dark mode follow Jira automatically. The mockup uses the same token names with light-mode fallbacks.

| Role | Token |
|---|---|
| Canvas | `--ds-surface` |
| Raised card | `--ds-surface-raised` + `--ds-border` hairline, **no shadow** |
| Verdict band (inverse) | `--ds-background-neutral-bold` with `--ds-text-inverse` |
| Body / subtle text | `--ds-text`, `--ds-text-subtle`, `--ds-text-subtlest` |
| Major / broken link | `--ds-text-danger`, `--ds-background-danger`, `--ds-border-danger` |
| Minor | `--ds-text-warning`, `--ds-background-warning` |
| Observation | `--ds-text-discovery`, `--ds-background-discovery` |
| Evidence present | `--ds-icon-success` (dot only, never big green fills) |
| Type | `--ds-font-family-body` (Atlassian Sans); clauses and keys in `--ds-font-family-code` |
| Spacing | `--ds-space-050` … `--ds-space-600` (8px grid) |

## References (Refero Styles), and what we borrowed
- **Pravah, "engineering dossier on warm parchment"** (styles.refero.design/style/30a8b128-a5bb-4d86-85eb-743b78091596):
  - uppercase, tracked labels that read like field notes ("SAMPLED · CLASS C · SAFETY");
  - contrast through **tonal inversion**: the verdict sits in one dark band, not in colourful charts;
  - flat and printed in feel, with hairline dividers and no shadows or gradients;
  - one type family, with hierarchy from weight and size only.
- **shadcn/ui, "clinical blueprint on frosted paper"** (styles.refero.design/style/0fd67ec5-7e9c-4ca9-b368-5d9c7388477a):
  - an almost achromatic interface where **red is reserved for real failure**;
  - a three-tone surface stack (canvas → soft → paper) instead of borders everywhere;
  - tight tracking on large numerals.
- **Framer marketplace:** templates are marketing sites. They are kept for the Marketplace listing and the video, not the in-app page.

## The page as an audit story
1. **Brief (hook).** A slim "rehearsal brief" line: project, samples, minimum safety class, **Run rehearsal**. It reads like the auditor's opening meeting.
2. **Verdict (meaning).** A dark inverse band with a huge readiness numeral, "67 / 100", next to the counts: **3 major · 1 minor · 0 observations**. A thin trend line of past runs rises as gaps are fixed.
3. **The walk (signature moment).** One row per sampled requirement, laid out as a **trace rail** with five stations: Design → Code → Test → Risk control → Release.
   - On each run a marker walks every rail, station by station, and **stops at the first broken link**, which turns red and shows the gap.
   - Stations show where the evidence came from (Confluence, Teamwork Graph, Jira), so the integrations are visible, not claimed.
4. **Findings (desire to fix).** An auditor's log numbered NC-01, NC-02… Each entry has:
   - a severity tag and the requirement key;
   - the clause in monospace;
   - the auditor's question as a pull quote;
   - actions: **Ask on ticket** and **Open requirement**.
5. **Sampling ledger (trust).** Why each requirement was picked (Class C · safety-related · changed since last release), with a small weight bar. This shows the sampling is risk-based, not random.
6. **Footer note.** "Rehearsal, not a formal audit opinion. Grading is rule-based; same data, same result."

## Do
- Lead with the verdict and the walk, not with a grid of cards.
- Use red only for major findings and broken stations, amber only for minor, purple (discovery) only for observations.
- Keys, clauses and hashes in monospace; everything else in the body family.
- Animate only `transform`/`opacity`; the walk takes about 1.2 s total and respects `prefers-reduced-motion`, where it shows the final state instantly.
- Every number is real engine output. No placeholder stats.

## Don't
- No KPI tiles in a row, donut charts, gradient headers or glassmorphism.
- No shadows for elevation; use a hairline border plus a surface shift.
- No emoji, no AI sparkle icons, no "insights" wording.
- Don't colour whole rows; colour marks the exact broken station only.
