# CPSA Trainer

A self-contained offline study tool for the CREST Practitioner Security Analyst
exam. Download or clone this repository, then open **CPSA_Trainer.html** in a browser.
No installation, account, backend, or network connection is required for practice.

```sh
git clone https://github.com/CasKei/CPSA-Trainer.git
```

## Practice modes

- **Topic drills:** adaptive practice with immediate explanations.
- **Applied questions and pitfalls:** filter practice to interpretation and common misconceptions.
- **Weakness review:** revisit missed or unfamiliar questions.
- **Flashcards:** recall before revealing; self-ratings are separate from scored accuracy.
- **Mock exams:** 120 questions, a two-hour timer, and a 60% pass threshold.
- **Question bank:** search questions and explanations by topic, syllabus group, or practice type.
- **Missed-item retries:** repeat the questions you got wrong with shuffled choices.
- **Mobile controls:** a compact mode picker, larger tap targets, and bottom study actions.
- **Exam navigator:** a collapsible question map with flagged/unanswered jumps.
- **Pause and resume:** recover drills, flashcards, and mock exams after refreshing or changing modes. Exam countdowns retain their original deadline.


## Question-bank expansion — October 14, 2026

The active bank contains **1,034 questions**, exceeding the original 956.
The latest expansion preserves the previous 444 questions and adds **482 original
questions plus 108 corrected legacy exercises**, with explanations and pitfalls.
Useful repeated concepts remain when separate exercises teach different applications.

| Topic | Questions |
| --- | ---: |
| A — Assessment management | 100 |
| B — Core technical skills | 134 |
| C — Information gathering | 100 |
| D — Networking equipment | 100 |
| E — Windows | 100 |
| F — Unix | 100 |
| G — Web technologies | 100 |
| H — Web testing methodologies | 100 |
| I — Web testing techniques | 100 |
| J — Databases | 100 |

Mixed drills, weakness review, and flashcards balance topics before adapting question
choice within each topic. A 20-question mixed session normally includes two from
each group. Filters are applied first; depleted groups contribute their available
items and remaining slots go to other groups. Individual topic drills stay focused.

The complete original is preserved under
[CPSA_Trainer_support](CPSA_Trainer_support/README.md), alongside reviewed restorations,
remaining retirement records, editable expansion data, rebuild scripts, and validation.

Research used the [CREST syllabus and candidate information](https://www.crest-approved.org/skills-certifications-careers/crest-practitioner-security-analyst/),
Nmap documentation, RFCs, OWASP guidance, Microsoft documentation, NIST publications,
and UK official guidance. Reworked scenarios include explanations, misconception
notes, and further-reading links. Retained foundations were editorially screened;
this does not claim independent primary-source verification of every legacy item.

These are independent practice questions, not official or recalled examination
questions. Mock exams deliberately sample twelve questions from each broad group;
that allocation is a practice design, not CREST's published weighting. Practice
scores do not predict exam success, and broad group coverage does not guarantee
coverage of every syllabus subskill. Legacy technologies remain for historical
understanding, rather than as deployment recommendations.

## Progress and privacy

Progress is stored in your browser's local storage. Export/import backups from
Settings to move between browsers or file locations. The additive expansion preserves current questions and compatible saved sessions. The original revision retains progress
for unchanged IDs and archives old records for rewritten or retired questions.
Historical mock summaries remain available. Flashcard self-ratings are tracked
separately for new practice; historical counters may contain older self-ratings.

The trainer makes no external requests during practice. Further-reading links open
external sites only when clicked. **CPSA_Quiz.html** is the older quiz, retained for
reference; use the trainer for current practice.

## Maintenance

See the [maintenance guide](CPSA_Trainer_support/README.md) for editorial sources,
rebuilding, and headless browser verification. Verification covers progress
migration, all-question rendering, search/filter/retry flows, balanced mixed and mock sampling, exact
pass thresholds, timer submission, mobile layout, and offline runtime behavior.

Credits to cy83rv1p3r, Claude, and Codex.
