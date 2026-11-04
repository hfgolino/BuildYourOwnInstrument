# Changelog

## Break It, Fix It 1.1.0 (2026-11-05)

- Construct Lab scale import from the student's Construct Lab exit ticket (PDF or .txt), with the verification code and computing ID checked. PDFs are read in the browser with pdf.js 3.11.174 (`docs/break-it/vendor/`, loaded only when a PDF is chosen). Loading from the browser's saved progress still works when it exists; when it does not, the start screen says why (no saved progress, progress under another ID, or an unfinished lab). The earlier claim that the scale "loads automatically" on the same browser was wrong for most students and has been removed from the materials.
- Pictures (`docs/break-it/viz.js`): an interactive EGA network (hover an item for its wording, facet, community, and strongest links), a semantic map of the item bank (one UMAP of all 539 items from their text-embedding-3-small vectors, both traits together, `tools/build_breakit_map.py`), a correlation heat map, and the person-level plot behind each number (test-retest, score distribution with the SEM band, friend rating, other-trait measure, outcome with the hiring cutoff, known groups). Each break shows the scale before and after side by side in the views that matter for it, a before-and-after chart of all nine numbers with the student's predictions marked, and the same comparison for each fix. Board tiles carry a small bar with the usual benchmarks.
- Near-copies are labeled with their original's number and a prime (3′); other-trait items are squares; mood items have a dotted gold ring.

## Break It, Fix It 1.0.0 (2026-11-05)

- New 30-minute follow-up lab in `docs/break-it/`: baseline evidence board (α, test-retest, SEM, content, EGA structure, convergent, discriminant, criterion, known groups), two rounds of three breaks in a fixed order (pad it, make it a mood, two options; mix in the other trait, use it for hiring, drop a facet), predict-run-fix cycles, a definitions panel on every screen, and an exit ticket with feedback instead of points.
- New simulated sample (`tools/build_breakit_data.py`): two-week and one-day retests, friend ratings, outcomes, known groups, an applicant condition, and 12 mood items written for the lab.
- `tools/grade_breakit_tickets.py` posts complete/incomplete and the feedback comment to Canvas.
- The site's service worker is now network-first, so both labs update as soon as new files are pushed.

## 1.3.0 (2026-10-28)

- Pilot cut advisor: a tips box; a Suggestion column that, per facet, tries every way of keeping 4 items and recommends the highest-alpha set that stays in its own community, avoids near-copy pairs, and keeps two manifestations, with reasons; items sorted weakest first; an ABCD column; a live preview in each facet header (how many more to tick, alpha of the items kept). Suggestions can be turned off.
- Bring back any single cut item (or all of them); bringing items back re-runs the analysis.
- Simulated items made slightly stronger (generating loadings +.05) so that careful selection can reach the .70 benchmark for 4-item facets; random selection still often misses it. Item codes are unchanged; engine parity re-verified (120 of 120 partitions identical).

## 1.2.0 (2026-10-28)

- Response format is now a design decision: 2 (True / False), 3, 4, 5, or 6 options, chosen in Stage 1 (new task 3) and changeable on the respondent's form (Stage 3), in the pilot (Stage 4, recorded as a new run), and in the field test (Stage 5). Labels, facility, ceiling/floor rules, every reliability statistic, EGA, the ticket, and the grader follow the format.
- Data rebuilt: answers are stored as continuous levels (0–84) and cut into k equal intervals, with 15% indecisive respondents for odd formats. `data/pilot_levels.csv`, `field_levels.csv`, and `respondents.csv` added; the 5-point CSVs are kept. Item codes are unchanged.
- Fixed: the PDF ticket's line wrapping could split the END marker, making the ticket unreadable to the grader. Markers no longer wrap and the grader ignores line breaks anywhere in the block (verified on 12 PDFs with pypdf and pdftotext).

## 1.1.0 (2026-10-28)

- Fixed: clicking from the purpose box into the pilot-size question lost the first number typed (the page redrew on blur), and an empty Check counted as a failed first attempt. Empty or non-numeric answers no longer count; Enter runs the check.
- Stage 1: every task shows To do / Done; use cards show a radio mark and an explicit "Click the use" instruction; choosing a trait no longer scrolls past the use question; the blueprint unlocks only after the pilot-size question and is labeled as planning item counts ("You are not choosing items yet").
- A 60 → 18 → 12 item-count strip appears in Stages 1, 2, and 4.
- A Definitions panel (top-bar button and floating button, Esc to close) shows the trait and facet definitions with example items, the ABCD codes, and the student's purpose on every screen; facet buttons in Stage 2 show the definition on hover.

## 1.0.0 (2026-10-28)

First version for Week 10 (Test Construction).

- Six-stage lab: test specification, item bank, face and content validity, pilot, field test, exit ticket (45 minutes).
- Item banks of 60 items per student drawn from 539 AI-GENIE items (gpt-4o, gpt-5.4, claude-sonnet-4-6), seeded by computing ID.
- Semantic map (UMAP of text-embedding-3-small vectors), automatic item-writing flags, ABCD manifestation coding with a second rater.
- Simulated pilot (N = 300) and field (N = 300) responses from a population model anchored in the embedding geometry.
- Internal reliability for every facet and the total: alpha, split-half with Spearman–Brown, mean inter-item r; item analysis; EGA network and correlation heat map. Engine validated against EGAnet 2.5.0 and psych (250 subsets, identical partitions).
- Exit ticket as a print-ready PDF or .txt with a verification code; `tools/grade_exit_tickets.py` verifies tickets and posts grades to Canvas.
- R companion reproducing every number with psych and EGAnet, plus EGA on the embeddings.
