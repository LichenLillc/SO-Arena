# SO-Arena project page

The website of **SO-Arena: Benchmarking the Capability Spectrum and Reliability of System One Models**,
served by GitHub Pages at https://lichenlillc.github.io/SO-Arena/.

A static page with no build step and no external dependencies:

- `index.html`: the page.
- `assets/css/site.css`: styles (palette and type follow the paper's figures).
- `assets/js/app.js`: renders the leaderboard (arena, full table, ladder), the charts, the reliability demo, the
  findings and the benchmark overview from the data file.
- `assets/js/data.js` and `data/arena.json`: the results, in the same form; `data/arena.json` is also offered for download.
- `assets/logos/`: model logos (they belong to the models' developers).
- `assets/fonts/`: TeX Gyre Pagella, subset to Latin (GUST Font License, see `assets/fonts/LICENSE.txt`).

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
