# CIE Master — Commercial Intelligence Engine

One generic, brand-free application that combines several engagement-specific CIEs
(account prioritisation, buyer economics, operating truth / revenue bridge, pilot gates,
deal mechanics, geography) into a single engine with pluggable modules and multiple engagements.

**Open it:** double-click `dist/CIE_Master.html`. It needs no internet, server or login.

## What is inside

| Group (sidebar) | Tab | What it does |
|---|---|---|
| Account Intelligence | Overview | Start-here call, headline counts, top 15 (fit + evidence tick), stage and segment mix, findings|
| | Target accounts | Lens presets, filters, ranked table, CSV export; account drawer with score parts and evidence status, buyer, outreach checklist (auto-downgrade), relationship overlay, value calculator and price curve|
| | Geography | Real US map (Albers), shaded by count or fit, account dots by segment|
| | Facility quality (HAI) | Every facility's infection data — observed, predicted, SIR, excess cases, denominators, rates — for CLABSI, CAUTI, SSI colon, SSI hysterectomy, MRSA and C. diff; filters, pooled SIRs, CSV, and a full-screen **Present** view (← → to page, Print / PDF) |
| | Scoring workbench | Edit dimensions and weights; live rank movement|
| Market & Revenue | Market model | Low / Base / High by segment, expansion segments kept out of totals, named-account check, seller-capacity model|
| | Buyer economics | Value streams (counted / not counted), year 1 / steady state / 3-year, pricing scenarios with payback|
| | Operating truth | Stamped inputs (claim / testimony / preference / unknown); unknowns hatched, never zero|
| | Revenue bridge | Editable ARR waterfall, share from installed base vs target|
| Pilot & Gates | Gates & pilot cohort | Gate tracker, stop rules, suggested balanced cohort, value types never summed|
| | Deal mechanics | MEDDPICC evidence per account, deal health, stalled-deal plays|
| Knowledge | Decision log, Diligence queue, Sources, Glossary | The calls with confidence and your override; questions; dated sources; glossary|
| Workspace | Data & modules | Engagements (new / duplicate / import / export / delete), segments, lenses, module on/off, **add your own module**|

## Importing an existing CIE

Data & modules → **Import an existing CIE file** reads an original single-file CIE (.html) in the browser
and creates a new engagement from it: accounts, scores with their evidence status, segments, sources,
glossary, decisions, diligence items and — where present — the full facility infection (HAI) table.
Nothing is uploaded and the file's scripts are never run; data blocks are parsed as data.

Recognised layouts (by structure, not by company): facility infection-quality table (`FACILITIES`),
researched-cohort JSON (`cie-data`), account-model JSON (`model-data`), network owner data (`DATA` sites/groups),
and account universe (`ACCOUNTS` with score components). Add a layout with `CIE.registerImporter({ id, label, detect, convert })`
in `js/importers.js`.

Large tables are stored in the browser's IndexedDB; everything else in localStorage. Both stay on your machine.
HAI excess cases = Σ max(0, observed − predicted) across measures.

## Scoring (same rules as the originals)

- `fit = Σ(weight × score ÷ 5) ÷ Σweight × 100`; each dimension is evidenced, estimated or unknown; **unknown scores 0**.
- Evidence share = share of weight that is evidenced (the black tick on every fit bar).
- Relationship stays separate from fit; lenses marked “+ access” add a visible boost (+4 / +7 / +10).
- Outreach-ready requires all four checks (identity, workflow, buyer, trigger) or the stage is downgraded.

## Your data

Each engagement is a *workspace*. Edits save automatically in the browser (`localStorage`, keys
`cie-master:*`). Storage is per browser and per file location, so **export after each session**
(Data & modules → Export workspace). Import always creates a new engagement; it never overwrites.

The bundled sample engagement is fictional and contains no client data.

## Adding a module

**No code:** Data & modules → *Add a module* creates a new tab with an editable table
(templates: competitor tracker, partner routes, risk register, interview log, blank).

**With code:** create `js/modules/my-module.js`:

```js
(function () {
  const CIE = window.CIE, esc = CIE.esc;
  CIE.registerModule({
    id: 'my-module', group: 'market', title: 'My module', order: 25,
    describe: 'One line shown in the module manager.',
    render(root, ctx) {
      const ws = ctx.ws;            // the open engagement; mutate it, then ctx.save()
      root.innerHTML = `<h2>${esc(ws.name)}</h2>` + CIE.charts.barList(
        CIE.rank(ws).slice(0, 10).map((r) => ({ label: r.a.name, value: r.s.fit })), { max: 100 });
    },
  });
})();
```

Add a `<script src="js/modules/my-module.js"></script>` line to `index.html` (before `js/app.js`),
then rebuild. Shared helpers: `CIE.rank`, `CIE.score`, `CIE.openAccount`, `CIE.valueModel`,
`CIE.charts.{barList, columns, waterfall, line, stackBar}`, `CIE.toCSV`, `CIE.download`, `CIE.modal`.

## Build and test

```bash
python3 cie-master/tools/build.py      # → cie-master/dist/CIE_Master.html (single file, ~310 KB)
```

Python 3 standard library only. During development you can also open `index.html` directly.

## Folder map

```
cie-master/
  index.html          app shell (development entry point)
  css/app.css         tokens (light + dark), layout, components
  js/core.js          storage (localStorage + IndexedDB), workspace model, registry, scoring
  js/importers.js     read original CIE files into workspaces
  js/charts.js        inline-SVG charts + map projection
  js/app.js           sidebar, routing, theme, drawer
  js/modules/*.js     one file per module group
  data/us-states.js   US state outlines (pre-projected, from us-atlas)
  data/sample-workspace.js  fictional demo engagement
  tools/build.py      single-file bundler
  dist/CIE_Master.html  the app
```
