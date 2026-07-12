# Data Dictionary

One synthetic season for **Alliance Fastpitch — Thunder 16U** (2025–26). All JSON files here are the canonical full-depth data; the CSVs are flat exports of the same facts for pandas/Observable/spreadsheets. `app/src/data/dataset.json` is this same season bundled for the app (with only the 3-point score history the app screens show).

**Everything is mock data** — every athlete, name, score, game, and journal entry is synthetic, generated for this challenge.

```
team ─┬─ athletes (16) ─┬─ clutch_history   (18 monthly points each)
      │                 ├─ nterpret          (current profile + 6 quarterly snapshots)
      │                 ├─ drill_log ───────── drills (12-drill catalog)
      │                 ├─ journals           (6 season entries each)
      │                 └─ game_log ──┐
      └─ games (24) ──────────────────┼─ per-athlete stat lines per game
                                      └─ moments (clutch-moment event log)
```

Join keys: `athlete_id` (= `athletes.id`), `drill_id` (= `drills.id`), `game_id` (= `games.game_id`).

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
| hometown, class_of | string, number | bio |
| bats, throws | string | R / L / S |
| quote | string | her one-liner |
| fun_fact | string | for cards, profiles, storytelling |
| color | string | a hex each athlete "owns" — use it for identity in your viz |
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

### game_log.json / game_log.csv — ~340 stat lines
One row per athlete per game played: `athlete_id`, `game_id`, `date`, `ab`, `h`, `hr`, `rbi`, `bb`, `so`, `errors`, plus a pitching line (`ip`, `er`, `k_pitched`) on exactly one row per game (null for everyone else). RBIs per game sum exactly to that game's `team_runs`. Playing time varies — who sits, and when, is part of the story. **This is where the mental data meets the field**: batting splits, pressure performance, slumps, and hot streaks are all in here.

### moments.json / moments.csv — ~60 events
The clutch-moment log: `moment_id`, `game_id`, `date`, `athlete_id`, `inning` (1–7), `leverage` (1–5), `situation` ("Bases loaded, two out"), `action` ("RBI single up the middle"), `outcome` (positive/negative), `reset_pitches` (1–6 — how many pitches it took her to reset afterward; lower is better). Great raw material for timelines, momentum charts, and story pieces.

### journals.json / journals.csv — 96 entries
Six short first-person entries per athlete across the season: `athlete_id`, `date`, `mood` (up/flat/down), `text`. Synthetic, written in each athlete's voice, and they track what's actually happening in her numbers. Sentiment analysis, word clouds, narrative timelines — all fair game.

### guides.json — 6 rows
`id`, `title`, `summary`, `video_url` (null in the kit).

## Regenerate / remix

```bash
node scripts/generate-data.mjs                  # the default season (what's committed)
node scripts/generate-data.mjs --seed 7         # same shapes, different jitter
node scripts/generate-data.mjs --athletes 32    # add procedurally generated athletes
node scripts/generate-data.mjs --games 40       # extend the schedule
node scripts/validate-data.mjs                  # checks shapes, ranges, joins, row parity
```

The generator is deterministic — same flags, same bytes. The roster, story arcs, bios, and full game schedule are plain literals at the top of `scripts/generate-data.mjs`; edit them freely. The validator runs structural checks on any remix and the full story checks on the default season.

## Provenance

100% synthetic, generated for this challenge. Names, scores, games, journals, and logs correspond to no real person or team.
