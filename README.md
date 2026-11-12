# SO-Arena project page

The website of **SO-Arena: Benchmarking the Capability Spectrum and Reliability of System One Models**,
served by GitHub Pages at https://lichenlillc.github.io/SO-Arena/.

A static page with no build step and no external dependencies:

- `index.html`: the page.
- `assets/css/site.css`: styles (the accent colours follow the paper's figures).
- `assets/js/app.js`: renders every section from the data file: the hero board, the leaderboard (overall and by
  domain, with filters and search), the insight charts (speed, reliability, its two components, difficulty tiers),
  the reliability demo, the findings, the benchmark overview, and the model and domain detail drawers. Links of the
  form `?model=<id>` and `?domain=<id>` open a drawer directly.
- `assets/js/data.js` and `data/arena.json`: the results, in the same form; `data/arena.json` is also offered for download.
- `assets/logos/`: model logos (they belong to the models' developers).
- `assets/fonts/`: Inter, Instrument Serif and JetBrains Mono, self-hosted (SIL Open Font License 1.1, see
  `assets/fonts/LICENSE.txt`).
- `assets/img/`: a static logo (`logo.svg`), the favicon (the logo's ring) and the link-preview image (`og.png`,
  rendered from the page's own header). The animated logo at the top of the page is inline SVG: "SO-Arena" at rest;
  near the O it unfolds to "System One-Arena". Its letters are glyph outlines of Fraunces (SIL Open Font License 1.1).

## Data

All numbers are those reported in the paper: the leaderboard score and its 11 domain components, the scores by
difficulty tier, reliability (`R`, `S`, `N`), mean latency, and the domain-level analysis. The data file is
generated from the paper's sources by `build_site_data.py` in the authors' working repository, which checks the
overall scores against the paper's figure data, every domain score against the paper's tier table, and
`R = sqrt(S N)`. The page shows results only; it contains no benchmark items.

## Preview locally

```sh
python3 -m http.server 8000
```

then open http://localhost:8000.
