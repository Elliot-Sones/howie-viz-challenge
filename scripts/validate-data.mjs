#!/usr/bin/env node
// Validates the generated dataset: shape, ranges, referential integrity,
// CSV/JSON row parity, and (for the default seed/size) the authored story
// beats. Regenerated/remixed datasets (different seed, --athletes, --games)
// get the structural checks only.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = (msg) => { console.error(`FAIL: ${msg}`); process.exitCode = 1; };
const j = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const csvRows = (p) => {
  // count records, honoring quoted fields that contain newlines
  const s = readFileSync(join(root, p), "utf8");
  let rows = 0, inQ = false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"') inQ = !inQ;
    else if (s[i] === "\n" && !inQ) rows++;
  }
  return rows - 1; // minus header
};

const need = [
  "data/team.json", "data/athletes.json", "data/clutch_history.json", "data/nterpret.json",
  "data/drills.json", "data/drill_log.json", "data/games.json", "data/guides.json",
  "data/game_log.json", "data/moments.json", "data/journals.json",
  "data/athletes.csv", "data/clutch_history.csv", "data/nterpret_history.csv",
  "data/drill_log.csv", "data/games.csv", "data/game_log.csv", "data/moments.csv",
  "data/journals.csv", "app/src/data/dataset.json",
];
for (const p of need) if (!existsSync(join(root, p))) fail(`missing ${p}`);
if (process.exitCode) process.exit(1);

const athletes = j("data/athletes.json"), hist = j("data/clutch_history.json"),
  nterp = j("data/nterpret.json"), drills = j("data/drills.json"),
  log = j("data/drill_log.json"), games = j("data/games.json"),
  guides = j("data/guides.json"), gameLog = j("data/game_log.json"),
  moments = j("data/moments.json"), journals = j("data/journals.json"),
  bundle = j("app/src/data/dataset.json");

const ids = new Set(athletes.map((a) => a.id));
const gameIds = new Set(games.map((g) => g.game_id));
const drillIds = new Set(drills.map((d) => d.id));
const DOMAINS = ["composure", "focus", "resilience", "confidence", "drive"];
const DEFAULT_MODE = bundle.seed === 20260712 && athletes.length === 16 && games.length === 24;
console.log(DEFAULT_MODE ? "mode: default dataset (structural + story checks)" : "mode: remixed dataset (structural checks only)");

// ── athletes (incl. bio fields) ──
if (DEFAULT_MODE && athletes.length !== 16) fail(`athletes: ${athletes.length} != 16`);
const BIO_FIELDS = ["hometown", "class_of", "bats", "throws", "quote", "fun_fact", "color"];
for (const a of athletes) {
  if (a.clutch_score < 0 || a.clutch_score > 1000) fail(`${a.id} clutch out of range`);
  if (a.alignment < 0 || a.alignment > 100) fail(`${a.id} alignment out of range`);
  if (!a.tier) fail(`${a.id} missing tier`);
  for (const f of BIO_FIELDS) if (a[f] === undefined || a[f] === null || a[f] === "") fail(`${a.id} missing bio field ${f}`);
  if (!/^#[0-9A-Fa-f]{6}$/.test(a.color)) fail(`${a.id} bad color ${a.color}`);
}

// ── clutch history ──
const histLens = new Set(Object.values(hist).map((p) => p.length));
if (histLens.size !== 1) fail("clutch_history: uneven series lengths");
if (DEFAULT_MODE && !histLens.has(18)) fail("history length != 18");
for (const [aid, pts] of Object.entries(hist)) {
  if (!ids.has(aid)) fail(`clutch_history unknown athlete ${aid}`);
  const cur = athletes.find((a) => a.id === aid).clutch_score;
  if (pts[pts.length - 1].score !== cur) fail(`${aid} last history pt != current ${cur}`);
  for (const p of pts) if (p.score < 0 || p.score > 1000) fail(`${aid} pt out of range`);
}
if (Object.keys(hist).length !== athletes.length) fail("clutch_history must cover all athletes");

// ── nterpret ──
for (const [aid, n] of Object.entries(nterp)) {
  if (!ids.has(aid)) fail(`nterpret unknown ${aid}`);
  if (n.current.domains.length !== 5) fail(`${aid} domains != 5`);
  for (const d of n.current.domains) {
    if (!DOMAINS.includes(d.key)) fail(`${aid} bad domain ${d.key}`);
    if (d.score < 0 || d.score > 100) fail(`${aid} domain score range`);
  }
  if (n.quarters.length !== 6) fail(`${aid} quarters != 6`);
}

// ── drills + drill log ──
if (drills.length !== 12) fail(`drills ${drills.length} != 12`);
for (const e of log) {
  if (!ids.has(e.athlete_id)) fail(`drill_log unknown athlete ${e.athlete_id}`);
  if (!drillIds.has(e.drill_id)) fail(`drill_log unknown drill ${e.drill_id}`);
}
if (DEFAULT_MODE && (log.length < 1200 || log.length > 3000)) fail(`drill_log size ${log.length} outside 1200-3000`);

// ── games ──
if (DEFAULT_MODE && games.length !== 24) fail(`games ${games.length} != 24`);
if (DEFAULT_MODE) {
  const wins = games.filter((g) => g.result === "W").length;
  if (wins !== 15) fail(`wins ${wins} != 15`);
}
for (const g of games) {
  if (g.margin !== Math.abs(g.team_runs - g.opp_runs)) fail(`${g.game_id} margin mismatch`);
  if (g.pressure !== (g.margin <= 2)) fail(`${g.game_id} pressure flag mismatch`);
}
if (guides.length !== 6) fail(`guides ${guides.length} != 6`);

// ── game log (per-athlete stat lines) ──
const rbiByGame = {}, pitchByGame = {};
for (const l of gameLog) {
  if (!ids.has(l.athlete_id)) fail(`game_log unknown athlete ${l.athlete_id}`);
  if (!gameIds.has(l.game_id)) fail(`game_log unknown game ${l.game_id}`);
  if (l.h > l.ab) fail(`${l.game_id}/${l.athlete_id} h > ab`);
  if (l.so > l.ab - l.h) fail(`${l.game_id}/${l.athlete_id} so > ab - h`);
  if (l.hr > l.h) fail(`${l.game_id}/${l.athlete_id} hr > h`);
  for (const f of ["ab", "h", "hr", "rbi", "bb", "so", "errors"]) if (l[f] < 0) fail(`${l.game_id}/${l.athlete_id} negative ${f}`);
  rbiByGame[l.game_id] = (rbiByGame[l.game_id] ?? 0) + l.rbi;
  if (l.ip !== null) {
    pitchByGame[l.game_id] = (pitchByGame[l.game_id] ?? 0) + 1;
    if (l.er < 0 || l.k_pitched < 0) fail(`${l.game_id}/${l.athlete_id} bad pitching line`);
  }
}
for (const g of games) {
  if ((rbiByGame[g.game_id] ?? 0) !== g.team_runs) fail(`${g.game_id} RBI sum ${rbiByGame[g.game_id] ?? 0} != team_runs ${g.team_runs}`);
  if ((pitchByGame[g.game_id] ?? 0) !== 1) fail(`${g.game_id} needs exactly one pitching line`);
}

// ── moments ──
for (const m of moments) {
  if (!ids.has(m.athlete_id)) fail(`moment ${m.moment_id} unknown athlete`);
  if (!gameIds.has(m.game_id)) fail(`moment ${m.moment_id} unknown game`);
  if (m.inning < 1 || m.inning > 8) fail(`moment ${m.moment_id} inning`);
  if (m.leverage < 1 || m.leverage > 5) fail(`moment ${m.moment_id} leverage`);
  if (!["positive", "negative"].includes(m.outcome)) fail(`moment ${m.moment_id} outcome`);
  if (m.reset_pitches < 1 || m.reset_pitches > 6) fail(`moment ${m.moment_id} reset_pitches`);
  if (!m.situation || !m.action) fail(`moment ${m.moment_id} missing text`);
}
if (moments.length < games.length) fail("too few moments");

// ── journals ──
for (const e of journals) {
  if (!ids.has(e.athlete_id)) fail(`journal unknown athlete ${e.athlete_id}`);
  if (!e.date || !e.text || e.text.length < 20) fail(`journal entry too thin for ${e.athlete_id} ${e.date}`);
}
if (journals.length < athletes.length * 4) fail(`journals ${journals.length} too few`);

// ── CSV parity ──
const parity = [
  ["data/athletes.csv", athletes.length],
  ["data/clutch_history.csv", Object.values(hist).reduce((s, p) => s + p.length, 0)],
  ["data/nterpret_history.csv", Object.keys(nterp).length * 6 * 5],
  ["data/drill_log.csv", log.length],
  ["data/games.csv", games.length],
  ["data/game_log.csv", gameLog.length],
  ["data/moments.csv", moments.length],
  ["data/journals.csv", journals.length],
];
for (const [p, n] of parity) { const r = csvRows(p); if (r !== n) fail(`${p} rows ${r} != ${n}`); }
const athHeader = readFileSync(join(root, "data/athletes.csv"), "utf8").split("\n")[0];
for (const col of ["hometown", "class_of", "bats", "throws", "color"]) if (!athHeader.includes(col)) fail(`athletes.csv missing column ${col}`);

// ── story beats (default dataset only) ──
if (DEFAULT_MODE) {
  const adaeze = log.filter((e) => e.athlete_id === "ath_adaeze" && e.date >= "2025-11-01").length;
  const adaezeBefore = log.filter((e) => e.athlete_id === "ath_adaeze" && e.date < "2025-11-01").length;
  if (adaeze / 8 <= adaezeBefore / 4) fail("Adaeze streak ramp missing");
  const lenaLate = log.filter((e) => e.athlete_id === "ath_lena" && e.date >= "2025-11-01").length;
  if (lenaLate > 6) fail(`Lena should nearly stop drilling after Oct'25 (got ${lenaLate})`);
  const feb = games.filter((g) => g.date.startsWith("2026-02") && g.result === "L" && g.margin >= 6);
  if (feb.length < 3) fail("Feb'26 blowout-loss stretch missing");
  const dani = athletes.find((a) => a.id === "ath_dani");
  if (!(dani.clutch_score >= 900 && dani.alignment < 60)) fail("Dani hc_la outlier missing");

  // new beat: composure should show up as a pressure-game batting split
  const comp = Object.fromEntries(Object.entries(nterp).map(([id, n]) => [id, n.current.domains.find((d) => d.key === "composure").score]));
  const pressureGames = new Set(games.filter((g) => g.pressure).map((g) => g.game_id));
  const avg = (aid, inPressure) => {
    const ls = gameLog.filter((l) => l.athlete_id === aid && pressureGames.has(l.game_id) === inPressure && l.ab > 0);
    const ab = ls.reduce((s, l) => s + l.ab, 0), h = ls.reduce((s, l) => s + l.h, 0);
    return ab ? h / ab : 0;
  };
  const ranked = [...ids].sort((a, b) => comp[b] - comp[a]);
  const delta = (aid) => avg(aid, true) - avg(aid, false);
  const hi = ranked.slice(0, 4).reduce((s, a) => s + delta(a), 0) / 4;
  const lo = ranked.slice(-4).reduce((s, a) => s + delta(a), 0) / 4;
  if (hi <= lo) fail(`pressure split not tied to composure (hi ${hi.toFixed(3)} <= lo ${lo.toFixed(3)})`);

  // new beat: reset_pitches should track resilience
  const res = Object.fromEntries(Object.entries(nterp).map(([id, n]) => [id, n.current.domains.find((d) => d.key === "resilience").score]));
  const mAvg = (pred) => { const ms = moments.filter(pred); return ms.reduce((s, m) => s + m.reset_pitches, 0) / (ms.length || 1); };
  const hiRes = mAvg((m) => res[m.athlete_id] >= 75), loRes = mAvg((m) => res[m.athlete_id] < 55);
  if (!(hiRes < loRes)) fail(`reset_pitches not tied to resilience (hi-res ${hiRes.toFixed(2)} !< lo-res ${loRes.toFixed(2)})`);
}

// ── bundle sanity ──
if (bundle.athletes.length !== athletes.length) fail("bundle athletes mismatch");
if (!bundle.clutch[athletes[0].id] || bundle.clutch[athletes[0].id].history.length !== 3)
  fail("bundle clutch history must be 3 points (app shape)");

console.log(process.exitCode
  ? "DATA INVALID"
  : `OK: ${athletes.length} athletes, ${log.length} drill events, ${games.length} games, ${gameLog.length} stat lines, ${moments.length} moments, ${journals.length} journal entries — all invariants hold`);
