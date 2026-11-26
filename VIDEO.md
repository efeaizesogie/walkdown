# Walkdown: demo video (4K, 2 min 55 s)

## Walkdown in plain words (the layman explanation)

**The problem.** If you build software that goes inside a medical device (say, a phone app that tells a diabetic person how much insulin to inject), the law treats a software bug like a faulty pacemaker. Before you can sell it, auditors from regulators and certification bodies check that you built it carefully, following standards with names like **IEC 62304** (how to build medical software) and **ISO 14971** (how to manage what could hurt a patient).

**How an audit really works.** An auditor doesn't read your whole project. There are thousands of items, and no time. Instead they **pick a handful**, favouring the dangerous ones, and **pull the thread on each**:

1. *"Here's a requirement: the app rounds the insulin dose. Where's the design for it?"*
2. *"Show me the code that does it."*
3. *"Show me the test that proved it works."*
4. *"What could go wrong, and what did you put in place to stop it?"*
5. *"Which release shipped it?"*

The moment one answer is missing, that's a **finding**. Findings come in three weights:

- **Major nonconformity:** a serious gap. Too many of these and you fail.
- **Minor nonconformity:** a real gap, but not dangerous on its own.
- **Observation:** a note to improve.

Teams dread this, because they only find their gaps when the auditor finds them.

**What Walkdown does.** Walkdown is a **practice auditor that lives inside Jira**, the tool where the team already tracks its work. You can ask it to run a rehearsal, and it does exactly what a real auditor would:

- **Picks a sample** the way an auditor would: the riskiest requirements most often.
- **Follows each thread** through the team's real records: design pages in Confluence, code changes, tests and risk records in Jira.
- **Stops at the first broken link** and writes the finding: *major*, *minor* or *observation*, with the exact clause of the standard and the question an auditor would ask, e.g. *"Show me the verification record for GLU-8."*
- **Gives a readiness score out of 100.** Fix the gaps, run it again, and watch the score climb.

You can talk to it in Rovo (Atlassian's AI assistant), **assign it a ticket like a teammate**, call it from AI tools like Claude, and it can even **stop a release** if something unsafe is about to ship without proof.

**Why it's trustworthy.** The judging itself is fixed rules, not AI guesswork. The same records always give the same result, which is what you want when safety is on the line. Everything stays on the company's own Atlassian site.

**In one line:** Walkdown lets medical-software teams **fail their audit in private, before the real auditor arrives**, and shows them exactly what to fix.

---

## The video

**Length:** 2:55 (Devpost asks for under 5:00). The beat table below was the plan; the final cut follows the same order at a tighter pace.
**Format:** 3840×2160, 30 fps, H.264, public on YouTube.
**Voice:** the narrator explains in plain words first, then shows the product.
**Mix:** code-drawn explainer scenes (crisp 4K, drawn in the app's Atlassian palette) plus **real screen recordings of Walkdown working on the demo site**. The real footage is cropped to the Jira page (no browser chrome), with zooms and labelled highlights on the parts that matter.

### Beats and script

| Time | Picture | Narration (plain, unhurried) |
|---|---|---|
| 0:00–0:14 | **Hook.** A wall of 2,000 requirement cards. An auditor's hand picks three. A thread is pulled from one, runs across stations… and snaps, red. | "When an auditor checks medical-device software, they don't read everything. They pick a few requirements, and they pull the thread." |
| 0:14–0:42 | **The chain.** Five stations draw across the screen: Design, Code, Test, Risk control, Release. A marker walks them. The first missing piece turns red and a finding card stamps down: *Major nonconformity*. | "Where's the design? Show me the code. Show me the test that proved it. What could hurt a patient, and what stops it? Which release shipped it? The first missing answer becomes a finding: major, minor, or an observation." |
| 0:42–1:02 | **Who it's for.** An insulin-dosing app on a phone; standards badges IEC 62304 and ISO 14971; a calendar page: *Audit in 3 weeks*. | "For teams building medical software, like an app that calculates insulin doses, that audit decides whether the product can ship. And most teams only find their gaps when the auditor does." |
| 1:02–1:16 | **Title.** Walkdown logo; line: *Rehearse your audit before the auditor does.* | "Walkdown is a practice auditor that lives inside Jira." |
| 1:16–1:40 | **Real footage: load the sample.** Apps → Walkdown → *Load the GlucoLoop sample*; the progress lines tick. Cut to the Jira project and Confluence pages it created. | "To try it, one click builds GlucoLoop: a fictional insulin app with requirements, tests, a risk file, design pages and code. A few traces are broken on purpose." |
| 1:40–2:20 | **Real footage: run a rehearsal.** Click *Run rehearsal*. The verdict counts up; the walk animates; zoom on GLU-6 stopping red at Risk control. Then zoom on the sampling ledger. | "Run a rehearsal, and Walkdown samples like an auditor: Class C and safety-related requirements first. It walks each thread through Confluence, Teamwork Graph and Jira, and stops at the first broken link. Here: the insulin dose is rounded, the overdose hazard is in the risk file, but no control is linked. That's a major nonconformity." |
| 2:20–2:45 | **Real footage: the auditor's log.** Scroll NC-01 to NC-03; zoom on a clause chip and the quoted question; click *Ask on ticket*; cut to the comment on GLU-6. | "Every finding cites the clause and asks the question the auditor would ask. One click puts that question on the ticket, so the right person sees it." |
| 2:45–3:15 | **Real footage: assign the auditor.** Ticket → *Agents* → *Walkdown Auditor*; the agent session writes its observation. Then a new ticket, *Audit rehearsal: Class C, 8 samples*, gets Walkdown's replies. Then Rovo chat: "Run an audit rehearsal on GLU." | "You can assign Walkdown a ticket like a teammate, ask it for a rehearsal in plain words, or chat with it in Rovo." |
| 3:15–3:32 | **Real footage: the release gate.** Drag GLU-6 to Done. The flag: *Transition failed: Walkdown: GLU-6 can't be released. Risk control link is broken…* | "And it guards the door: a requirement with a broken trace can't be released." |
| 3:32–3:50 | **MCP.** A plain, unbranded terminal panel shows a real `trace-requirement` call through `mcp.atlassian.com` and the actual graded JSON it returned (captured from a real call, with no third-party app branding on screen). | "The same audit is available to any AI tool through Atlassian's MCP server." |
| 3:50–4:15 | **Real footage: fix it.** On GLU-6, link the hazard *Insulin over-delivery when a dose is rounded up* with *Risk control*. Run the rehearsal again: the GLU-6 rail goes all green and the readiness score rises. | "Fix the gap, run it again, and the score climbs. That's the whole point: fail in private, pass in public." |
| 4:15–4:35 | **Under the hood (drawn).** A clean diagram: Jira, Confluence, Teamwork Graph flow into the engine, which feeds the Rovo agent, MCP, the panel and the gate. Badges: *Runs on Atlassian*, *Rule-based grading*, *No data leaves your site*. | "Under the hood, the grading is fixed rules, not AI guesswork, so the same records always give the same result. It runs on Atlassian, and no data leaves your site." |
| 4:35–4:42 | **End card.** Walkdown logo, *Rehearse your audit before the auditor does*, GitHub and docs URLs. | "Walkdown. Rehearse your audit before the auditor does." |

Word count is about 520, at a calm pace, which fits about 4:40 with the pauses.

### The real footage

The rules ask for footage of the project working, so the product shots are real screen recordings of the demo site, not mock-ups:

- I drive your Chrome through the steps while **ffmpeg records the Chrome window**.
- Your Chrome window needs to stay in front during each take, and you should keep other windows and notifications off it.
- If you'd rather record the takes yourself (OBS, 1080p or higher), I'll give you a shot list and edit what you record.

### Sound
- **Narration:** edge-tts **en-US-AndrewNeural** at -4% rate. Word timings drive the cuts.
- **Music:** a calm synthesized bed with a soft "stamp" on each finding and a rising tone as the score climbs. All synthesized; no licensed music (the rules ban copyrighted music).
- **Loudness:** about −14 LUFS.

### Checks before upload
- Stills at every beat; a contact sheet of the full render.
- Every on-screen number must match the real app.
- No third-party trademarks beyond Atlassian's own product names, which the hackathon is about.
- Total length under 5:00.

### How it is built

Everything lives in `video/build/`:

- `edl.json`: the timeline. Each segment has a narration slice, a pause, and either a drawn scene or footage clips (source time, speed, crop keyframes, highlight boxes).
- `scenes.js` + `page.html`: the drawn scenes and the footage compositor, a pure function of time on a 3840x2160 canvas.
- `audio.py`: narration with pauses, a synthesized music bed and cue sounds, written to `video/work/mix.wav`.
- `render.py`: `extract` pulls the footage frames, `times` renders check stills, `video` renders the film and mixes it at -14 LUFS into `video/walkdown-demo-4k.mp4`.

Raw takes (`video/takes/`) and working files (`video/work/`) are not committed.
