# CPSA Trainer revision — 2026-10-14

Open `../CPSA_Trainer.html` in a browser. It remains one self-contained offline file;
references open only when clicked. `CPSA_Quiz.html` was not modified.

## Responsive UI and recovery

The trainer includes a mobile mode picker, larger touch targets, bottom study
controls, a collapsible exam navigator with flagged/unanswered jumps, remembered
practice length, keyboard-accessible cards, and search pagination that returns to
the results. `ui_features.js` and `ui_styles.css` are maintenance sources embedded
into the HTML by `build_trainer.py`; the browser needs no additional asset files.

Live exams, drills, and flashcards are saved separately in browser local storage.
Refreshing or changing modes offers recovery from the dashboard. Exam time keeps
running against its original deadline; reopening an expired exam submits its
retained answers once. Starting a different session prompts before replacing the
saved session. Pause and resume do not record answers twice. Recovery is limited
to the same browser/storage origin and does not synchronize across devices.

`verify_ui.cjs` validates 320/390/768/1024/1440px layouts, keyboard and touch controls,
saved-session recovery, expiry handling, and stable search choices.
`ui-validation.json` records those checks. Test screenshots use synthetic progress.

The expanded bank contains **1,034 questions**. Groups A, C, D, E, F, G, H, I, and J
each contain 100 questions; Core Technical Skills (B) contains 134. The latest
expansion preserves all 444 previously active questions and adds **482 original
questions plus 108 corrected legacy exercises**. Useful recurring concepts remain
when different cases teach distinct mechanisms, interpretation, or consequences.

Across both editorial passes, there are 333 rewritten/restored former questions,
127 retained foundations, and 574 original questions. 496 original items remain
retired; these are preserved rather than discarded from the source archive.
The complete original is preserved in `CPSA_Trainer.original-2026-10-14.html`.
`review.json` records restorations, expansion IDs, and remaining retirement reasons.
It does not claim that all 496
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

Mixed drills, flashcards, and weakness sessions select topics evenly before adapting
question choice within each topic. A 20-question mixed session normally contains
two questions from every group, even with uneven bank sizes or answer history.
Filters apply before allocation; a depleted topic contributes its available items
and remaining slots go to topics with questions left. Weakness review increases
the within-topic priority of missed items. Topic-specific drills remain focused.

## Progress preservation

The original browser key `cpsa_trainer_v1` is retained. On migration, its original
JSON is backed up as `cpsa_trainer_v1_pre_revision_20261014`. Records for rewritten
and retired items move to `archivedStats`; unchanged IDs retain their counters.
Historical mock summaries are retained. Export includes archived records as well
as current progress and flashcard self-ratings. Opening the trainer at a different
URL/browser may use a different local-storage origin; export/import transfers data.
This additive expansion retains the current bank version because the existing 444
items are unchanged. Their current counters and compatible saved sessions survive;
restored questions start fresh rather than reviving archived pre-rewrite counters.

## Maintenance and verification

`revise_bank.py` owns editorial data and generates `bank.json`, `review.json`, and
`references.json` from the preserved original. `build_trainer.py` embeds the bank
and learning changes. Its hash guard refuses to overwrite later manual HTML edits.
Reconcile those edits into the sources before rebuilding. The original backup is
read-only input to both scripts after initial preservation.

`expansion/*.tsv` contains explicitly authored questions with stable slugs, group and
skill tags, reference keys, four choices, explanations, and pitfalls. The delimiter
is `|`; rows have eleven fields. `old:ID` restores a corrected legacy item.
`expansion/distractors.txt` contains hand-reviewed alternatives for plausible
misconceptions. Stable IDs are derived from the group and slug; editing wording
does not change an ID. Literal duplicated stems are rejected, while distinct
exercises sharing a concept are retained. Review tags follow the published v2.5
syllabus; related skills can span a broad practice group.

`verify_trainer.cjs` runs real headless Edge checks using Playwright. The verification
uses an isolated temporary browser context and does not change user browser progress.
`validation.json` records checks; PNGs record desktop/mobile render samples.
The optional Playwright dependency is needed only for verification, not to use the trainer.
The regression suite also checks category counts, reference coverage, 300 mixed
samples under skewed stats, balanced weakness/flashcard/applied sessions, exhausted
small pools, and preservation of current-version progress.

Example rebuild in PowerShell:

```powershell
py ./revise_bank.py
py ./build_trainer.py
$env:NODE_PATH = 'C:/Users/CasKei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
node ./verify_trainer.cjs
```
