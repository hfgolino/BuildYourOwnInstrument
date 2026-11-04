# Construct Lab and Break It, Fix It

Two linked labs for **Research Methods & Data Analysis I · University of Virginia**:

- **Construct Lab** (`docs/`, 45 min): build a 12-item scale from an AI item bank. Site: `https://hfgolino.github.io/BuildYourOwnInstrument/`
- **Break It, Fix It** (`docs/break-it/`, 30 min): break that scale six times and fix it, guided by reliability and validity evidence. Site: `https://hfgolino.github.io/BuildYourOwnInstrument/break-it/`. Instructor guide, handout, and Canvas text in `materials/break-it/`; grader `tools/grade_breakit_tickets.py` (complete/incomplete with feedback, no points); data `tools/build_breakit_data.py`; tests `tools/breakit_smoke_test.js` and `tools/breakit_calibrate.js`; offline copy `BreakItFixIt_Standalone.html`. Each student starts from their own Construct Lab scale, loaded from their Construct Lab exit ticket (PDF or .txt) or, if the lab was finished on the same browser under the same computing ID, from the progress saved there; a standard scale is the fallback. Every break is shown before and after as an interactive EGA network, a semantic map of the item bank (`docs/break-it/map.js`, built by `tools/build_breakit_map.py`), a correlation heat map, and the person-level plot behind each number (`docs/break-it/viz.js`). PDF tickets are read in the browser with pdf.js 3.11.174 (Apache 2.0), hosted in `docs/break-it/vendor/`.

---

# Construct Lab: build a scale from an AI item bank

**Research Methods & Data Analysis I · University of Virginia · Week 10, Test Construction**

A 45-minute interactive laboratory in which each student acts as a test developer. A language model has written a bank of personality items; nobody has checked them. The student writes the test specification, sorts 60 unlabeled AI-generated items into a blueprint, judges face and content validity, pilots the form on 300 simulated respondents, uses item analysis, internal reliability, and an EGA network to cut 18 items to 12, and then tests the final scale on 300 new respondents. The lab ends with an exit ticket (PDF or .txt) that students upload to Canvas and that a script grades automatically.

The application is a static, client-side web app: no backend, no accounts, no API keys, and no student data leaving the device until the student uploads the ticket. It deploys for free on GitHub Pages, installs as a Progressive Web App, and works offline once loaded.

## What students do (45 minutes)

| Stage | Minutes | What happens | Reading |
|---|---|---|---|
| 1. Test specification | 7 | Choose Conscientiousness or Openness; click the intended use and write the purpose; choose the response format (2 = True/False, 3, 4, 5, or 6 options, changeable later in Stages 3–5); compute the pilot size (12 × 1.5 = 18, 6 per facet); then plan how many items each cell of a 3 facets × 4 manifestations (Affect, Behavior, Cognition, Desire) blueprint gets (no items are chosen yet) | Rust et al., pp. 20–23 |
| 2. Item bank | 11 | Choose 18 of 60 unlabeled items (written by gpt-4o, gpt-5.4, and claude-sonnet-4-6), place 18 into blueprint cells, using a semantic map built from the item embeddings and automatic item-writing flags | pp. 24–28 |
| 3. Face and content validity | 8 | Read the form as a respondent and judge each item for the stated purpose; then reveal the item writer's facet, a semantic reading from the embeddings, and a second rater's ABCD codes (agreement and Cohen's κ, coverage, redundancy) | p. 43 (Week 9) |
| 4. Pilot | 11 | N = 300, re-administered in any response format: a cut advisor (tips, a Suggestion column with reasons, live α preview per facet, per-item bring back); facility, discrimination, alpha if deleted; alpha, split-half with Spearman–Brown, and mean inter-item r for every subscale and the total; an EGA network and a correlation heat map; cut to 12 items and re-run | pp. 30–35 (Weeks 5–6, 8) |
| 5. Field test | 4 | The final 12 items on 300 new respondents: does reliability survive, and does the structure replicate? | p. 34 |
| 6. Exit ticket | 4 | Four concept checks, two reflections, then save the PDF and upload it | |

A Definitions panel (trait and facet definitions with example items, ABCD codes, the student's purpose, and the 60 → 18 → 12 plan) opens from every screen.

Each student's item bank is drawn from the 539 items by a seed derived from the computing ID, so neighbors work with different banks and a copied ticket fails verification.

## Repository layout

```
docs/                          the deployable site (source and production build)
  index.html                   page shell
  styles.css                   visual design (screen and print/PDF)
  app.js                       the lab: stages, scoring, exit ticket
  engine.js                    psychometrics: alpha, split-half, item analysis, EBICglasso, Walktrap, EGA
  data.js                      items, semantic map, simulated pilot and field responses (generated)
  manifest.webmanifest, service-worker.js, icons/
ConstructLab_Standalone.html   single-file copy (works from file://, email, or Canvas Files)
data/
  items_*_iteration_*.rds      the three AI-GENIE item pools (180 items each)
  embeds*.RDS                  their text-embedding-3-small embeddings (1536 x 180 each)
  items.csv                    all 539 items with codes, facets, flags, and generating parameters
  pilot_levels.csv             300 simulated pilot respondents x 539 items: latent response levels 0-84
  field_levels.csv             300 NEW simulated respondents, same coding
  respondents.csv              respondent style (15% "indecisive") for both samples
  pilot_responses.csv          the pilot data on the 5-point format (1-5), for convenience
  field_responses.csv          the field data on the 5-point format (1-5)
  generating_model.json        the population model
R/construct_lab_companion.R    reproduces a student's numbers in R (psych, EGAnet), plus EGA on embeddings
materials/
  INSTRUCTOR_GUIDE.md          45-minute plan, debrief questions, what is simulated and why
  STUDENT_LAB_HANDOUT.md       step-by-step instructions with definition boxes
  CANVAS_EXIT_TICKET.md        Canvas assignment text, rubric, and the grading workflow
  TA_QUICK_GUIDE.md            what to say when students get stuck
tools/
  build_data.py                rebuilds data.js and the CSVs from the .rds files
  grade_exit_tickets.py        verifies tickets and posts grades to Canvas (or writes a CSV)
  smoke_test.js                plays the whole lab in headless Chromium and saves a ticket PDF
  validate_engine.js / .R      checks engine.js against EGAnet 2.5.0 and psych
  build_standalone.py, make_icons.py
```

## Deploy on GitHub Pages

1. Create a repository (for example `construct-lab`). Public is simplest.
2. Push this folder:
   ```bash
   cd construct-lab
   git init && git add . && git commit -m "Construct Lab"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/construct-lab.git
   git push -u origin main
   ```
3. On GitHub: Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, folder: `/docs` → Save.
4. After a minute or two the lab is at `https://YOUR-USERNAME.github.io/construct-lab/`.
5. Run one full session on a laptop and a phone before class, through to the PDF.

**Updating:** edit files in `docs/`, bump `CACHE_VERSION` in `docs/service-worker.js`, then run `python3 tools/build_standalone.py`, commit, and push.

## Grading the exit tickets

Students upload `ExitTicket_<computingID>.pdf` (or the .txt) to a Canvas assignment. Canvas cannot grade an uploaded file by itself, so one command does it:

```bash
pip install numpy pypdf
export CANVAS_URL=https://canvas.its.virginia.edu
export CANVAS_TOKEN=...                     # Canvas: Account > Settings > New Access Token
python3 tools/grade_exit_tickets.py --course COURSE_ID --assignment ASSIGNMENT_ID           # dry run, writes a CSV
python3 tools/grade_exit_tickets.py --course COURSE_ID --assignment ASSIGNMENT_ID --post    # posts grades + comments
```

Without a token, use Canvas → the assignment → Download Submissions, unzip, and run `python3 tools/grade_exit_tickets.py --dir submissions/`; import the CSV scores into the gradebook.

For every ticket the script checks the verification code, confirms that every item came from that student's own bank, matches the computing ID to the Canvas login, recomputes the field-test alphas from `data/field_responses.csv`, recomputes the 10-point score with the app's rubric, and reports identical scales or reflections across students. Flagged tickets are not posted; they are listed for review. Details and the rubric are in `materials/CANVAS_EXIT_TICKET.md`.

## How the data were made

The items are the AI-GENIE item pools from the EGA vs PCA simulation (iterations 308, 50, and 79 for claude-sonnet-4-6, gpt-4o, and gpt-5.4): two Big Five traits, three attributes each, 30 items per attribute per model. One exact duplicate was dropped, leaving 539 items.

**The response data are simulated** from a population model anchored in the embedding geometry of the items (`tools/build_data.py`):

- each item loads on the facet it was generated for, with a loading that increases with its semantic margin (leave-one-out cosine to its own facet centroid minus the cosine to the nearest competing facet of the same trait);
- the 15% least distinct items of each facet also cross-load on the semantically nearest competing facet, so the items that look borderline in Stage 3 misbehave in Stage 4;
- near-paraphrase pairs (cosine > .90) share a specific factor, which produces the local dependence that inflates alpha;
- every item carries a small acquiescence loading, because every item is keyed in the same direction;
- facet correlations follow the cosine between facet centroids (latent r between .40 and .62 within a trait, .18 across traits);
- item means follow simple wording rules (absolute or very specific wording lowers endorsement; short generic wording raises it), which creates a few ceiling items;
- every answer is stored as a continuous response on the 1–5 metric (an integer level L = 0–84, y = 0.9 + 0.05L). A k-point format (k = 2 to 6) cuts that continuum into k equal intervals, `category = clamp(floor((120 + (L − 2)(k − 1)) / 80), 1, k)`, so the same 300 people can answer in any format. With an odd k, the 15% of respondents flagged as indecisive choose the middle option whenever they are within one category of it (Rust's indecisiveness, p. 27). The app, the grader, and the R companion use the same integer rule.

For a carefully chosen 12-item scale, field-test total alpha runs from about .80 (True/False) to .83 (3 options), .87 (4 or 5) and .88 (6): gains flatten after four options, and the middle category of the 3-point format costs reliability.

Students should be told that the respondents are simulated (the instructor guide suggests how). The structure of the simulation is itself a discussion point: the lab's "people" answer the way the semantic geometry predicts, which is the assumption that generative psychometrics tests rather than takes for granted.

## Engine validation

`docs/engine.js` reimplements the parts of EGAnet that the lab needs: `EBICglasso.qgraph` (100 lambdas, lambda.min.ratio = .1, γ = .5, unpenalized diagonal, and EGAnet's rule of lowering γ when a node is disconnected), igraph's Walktrap (steps = 4, self-loops, lazy exact updates, membership at maximum modularity), and singleton removal. Against EGAnet 2.5.0 (`EGA.estimate`, Pearson correlations) on 370 random 12- and 18-item subsets (the latest 120 on the current data), every partition was identical and the largest network difference was 3 × 10⁻⁵. Alpha, split-half, and corrected item-total correlations match `psych::alpha` to machine precision.

```bash
node tools/validate_engine.js 100 7 > js.json && Rscript tools/validate_engine.R js.json
node tools/smoke_test.js test-output abc2de good C       # full session, saves the ticket PDF
```

The lab uses Pearson correlations; EGAnet's default for 5-point items is polychoric (`corr = "auto"`), which the R companion also runs. The lab also skips EGA's unidimensionality check, since every blueprint has three facets.

## Security note

Do not commit `.RData` workspaces to this repository. The workspace that accompanied the item files (`embeds_items_example.RData`) contains API keys and is excluded by `.gitignore`.
