# CPSA Trainer revision — 2026-10-14

Open `../CPSA_Trainer.html` in a browser. It remains one self-contained offline file;
references open only when clicked. `CPSA_Quiz.html` was not modified.

The revised bank contains 444 questions across broad groups A–J: 225 former items
corrected or reworked, 127 retained foundations, and 92 new original scenarios.
604 former items were retired. Some were repeated recall; others had unsupported
premises, alternative correct options, weak distractors, or poor relevance.
The complete original is preserved in `CPSA_Trainer.original-2026-10-14.html`.
`review.json` records every retired ID and reason. It does not claim that all 604
retirements were exact duplicates or that every retained item was independently
verified from a primary source.

New/reworked items use explanations and misconception notes to teach mechanism,
interpretation, and limits. The correct option's caveats are generally moved into
feedback, rather than making it conspicuously longer than its distractors. Applied
is a practice category, not an empirically calibrated difficulty score.

Research used CREST's published v2.5 syllabus and candidate information, Nmap's
documentation, RFCs, OWASP guidance, Microsoft documentation, UK official guidance,
and NIST publications. Historical protocols and retired crypto remain where useful
for syllabus understanding. `references.json` contains the further-reading links.
These are independent study questions, not official or recalled exam questions.
Coverage of all ten broad groups does not imply every syllabus subskill is covered.

Mock exams use 120 questions, 120 minutes, and an exact 60% pass comparison. Their
12-question-per-group allocation is a deliberate practice design, not CREST's
published weighting. No pass prediction is made. Flashcard self-ratings are separate
from scored answers. Existing historical counters may contain old self-ratings.

## Responsive UI and recovery

`ui_features.js` and `ui_styles.css` are embedded into the single HTML by the builder.
They provide the mobile mode picker, 44px tap targets, fixed study controls, a
collapsed exam map, keyboard controls, remembered practice length, stable bank
choices, and better search paging. No external runtime asset files are required.

Live sessions are saved separately in local storage. The dashboard offers recovery
when a session is paused, refreshed, or left for another mode. The original exam
deadline is preserved. A recovered expired exam is scored once; practice recovery
does not record answered items again. Starting a new session prompts before
replacing the saved one. Recovery does not synchronize across browsers/devices.

Run `node ./verify_ui.cjs` for layout and recovery checks. `ui-validation.json`
records tests at 320/390/768/1024/1440px, keyboard and touch controls, expired exam
handling, and resume without double scoring. Screenshots use synthetic progress
and are generated locally rather than committed.

## Progress preservation

The original browser key `cpsa_trainer_v1` is retained. On migration, its original
JSON is backed up as `cpsa_trainer_v1_pre_revision_20261014`. Records for rewritten
and retired items move to `archivedStats`; unchanged IDs retain their counters.
Historical mock summaries are retained. Export includes archived records as well
as current progress and flashcard self-ratings. Opening the trainer at a different
URL/browser may use a different local-storage origin; export/import transfers data.

## Maintenance and verification

`revise_bank.py` owns editorial data and generates `bank.json`, `review.json`, and
`references.json` from the preserved original. `build_trainer.py` embeds the bank
and learning changes. Its hash guard refuses to overwrite later manual HTML edits.
Reconcile those edits into the sources before rebuilding. The original backup is
read-only input to both scripts after initial preservation.

`verify_trainer.cjs` runs real headless Edge checks using Playwright. The verification
uses an isolated temporary browser context and does not change user browser progress.
`validation.json` records checks; verification generates local desktop/mobile PNG samples.
These sample screenshots contain synthetic test progress and are not committed.
The optional Playwright dependency is needed only for verification, not to use the trainer.

Example rebuild from this directory in PowerShell (Python, Node.js, and Microsoft Edge required):

```powershell
py ./revise_bank.py
py ./build_trainer.py
npm install --no-save --package-lock=false playwright
node ./verify_trainer.cjs
```
