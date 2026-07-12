# Data Dictionary

One synthetic season for **Alliance Fastpitch — Thunder 16U** (2025–26). All JSON files here are the canonical full-depth data; the CSVs are flat exports of the same facts for pandas/Observable/spreadsheets. `app/src/data/dataset.json` is this same season bundled for the app (with only the 3-point score history the app screens show).

```
team ─┬─ athletes (16) ─┬─ clutch_history   (18 monthly points each)
      │                 ├─ nterpret          (current profile + 6 quarterly snapshots)
      │                 └─ drill_log ────────── drills (12-drill catalog)
      └─ games (24)
```

Join keys: `athlete_id` (= `athletes.id`), `drill_id` (= `drills.id`), `game_id`.

## Scales (product-accurate)

- **Clutch Factor™**: 0–1000. **750** is "the line" — it splits the coach's alignment matrix. Tiers: Elite ≥900 · Clutch 750–899 · Rising 500–749 · Developing <500.
- **NTerpret™ domains**: 0–100 across five domains — `composure`, `focus`, `resilience`, `confidence`, `drive` (displayed as "Competitive Drive").
- **Alignment**: 0–100, how bought-in an athlete is to the program; the matrix splits at **60**.
- **Pressure game**: final margin ≤ 2 runs.

## Files

### team.json
`team_id`, `name`, `org`, `season`, `record`.

### athletes.json / athletes.csv — 16 rows
| field | type | notes |
|---|---|---|
| id | string | `ath_*` — the universal join key |
| name | string | synthetic |
| position | string | P, C, 1B, 2B, 3B, SS, LF, CF, RF, UT, DP |
| jersey | number | |
| tier | string | derived from clutch_score (see scales) |
| clutch_score | number | current Clutch Factor, 0–1000 |
| alignment | number | 0–100 |
| org / team_id | string | constant for this dataset |
| photo_url | null | (JSON only) |

### clutch_history.json / clutch_history.csv — 16 × 18 = 288 points
JSON: `{ athlete_id: [{date, score}, …] }` · CSV: `athlete_id,date,score`.
Monthly, `2025-01-01` → `2026-06-01`. The last point always equals the athlete's current `clutch_score`. **The app only displays the last 3 points — the other 15 months are for you.**

### nterpret.json — per athlete
```
{ athlete_id: {
    current:  { headline, summary, domains: [{key, name, score, summary}×5],
                strengths: [2], growth_areas: [2] },
    quarters: [{ quarter: "2025Q1"…"2026Q2", domains: [{key, score}×5] } ×6]
} }
```
`nterpret_history.csv` flattens the quarters: `athlete_id,quarter,domain_key,domain_name,score` (480 rows).

### drills.json — 12 rows
`id`, `title`, `axis` (the domain it trains), `duration_min`, `description`, `steps[]`.

### drill_log.json / drill_log.csv — ~1,800 events
`athlete_id`, `drill_id`, `date` (YYYY-MM-DD, Jul 2025–Jun 2026), `duration_min`. One row = one completed drill session. Athletes differ a lot in habit — that's on purpose.

### games.json / games.csv — 24 rows
`game_id`, `date`, `opponent`, `home_away` (H/A), `result` (W/L), `team_runs`, `opp_runs`, `margin`, `pressure` (bool). Season record 15–9.

### guides.json — 6 rows
`id`, `title`, `summary`, `video_url` (null in the kit).

## Regenerate / remix

```bash
node scripts/generate-data.mjs   # rewrites data/ AND app/src/data/dataset.json
node scripts/validate-data.mjs   # checks shapes, ranges, joins, row parity
```

The generator is deterministic (seeded). The roster table, story arcs, drill habits, and the full game schedule are plain literals at the top of `scripts/generate-data.mjs` — edit them freely. Want 3 seasons or 60 athletes? Make it yours; just keep `validate-data.mjs` passing if you want the app to keep working.

## Provenance

100% synthetic, generated for this challenge. Names, scores, games, and logs correspond to no real person or team.
