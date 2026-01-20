// frontend/src/modules/analysis/genome/genomeUtils.js
// NOTE (Showcase patch):
// - Keep legacy helpers intact (safeNum/safeDiv/histogram/extractPrefixedProportions/etc.)
// - Add showcase helpers to generate local rows deterministically when backend data is absent.

import { hashStringToUint32, makeGenomeRows } from "../shared/showcaseKit";

export function safeNum(x, dflt = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? v : dflt;
}

export function safeDiv(a, b) {
  const x = safeNum(a, 0);
  const y = safeNum(b, 0);
  if (!Number.isFinite(x) || !Number.isFinite(y) || y === 0) return 0;
  return x / y;
}

export function round(n, d = 3) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}

export function groupBy(rows, keyFn) {
  const m = new Map();
  for (const r of rows || []) {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

export function sumBy(rows, key) {
  return (rows || []).reduce((s, r) => s + safeNum(r?.[key], 0), 0);
}

export function quantile(sortedAsc, q) {
  const n = sortedAsc.length;
  if (!n) return 0;
  const pos = (n - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedAsc[base + 1] === undefined) return sortedAsc[base];
  return sortedAsc[base] + rest * (sortedAsc[base + 1] - sortedAsc[base]);
}

export function fiveNumber(arr) {
  const a = (arr || [])
    .map((x) => safeNum(x, NaN))
    .filter(Number.isFinite)
    .slice()
    .sort((x, y) => x - y);
  if (!a.length) return [0, 0, 0, 0, 0];
  return [a[0], quantile(a, 0.25), quantile(a, 0.5), quantile(a, 0.75), a[a.length - 1]];
}

/**
 * Histogram helper.
 *
 * IMPORTANT: This returns `edges` as a numeric array of length bins+1, which matches
 * `buildHistOption({edges, counts})` in shared/echartsKit.
 */
export function histogram(values, { min = null, max = null, bins = 30 } = {}) {
  const v = (values || []).map((x) => safeNum(x, NaN)).filter(Number.isFinite);
  if (!v.length) return { edges: [], counts: [], ranges: [] };

  const lo = min === null ? Math.min(...v) : min;
  const hi = max === null ? Math.max(...v) : max;
  if (!(hi > lo)) return { edges: [], counts: [], ranges: [] };

  const step = (hi - lo) / bins;
  const counts = new Array(bins).fill(0);
  for (const x of v) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((x - lo) / step)));
    counts[idx] += 1;
  }

  const edges = [];
  for (let i = 0; i <= bins; i++) edges.push(lo + i * step);

  // Keep a legacy-friendly ranges list too (not used by echartsKit, but useful for debug)
  const ranges = [];
  for (let i = 0; i < bins; i++) ranges.push([edges[i], edges[i + 1]]);

  return { edges, counts, ranges };
}

export function extractPrefixedProportions(row, prefix, suffix = "_Proportion") {
  const out = [];
  if (!row) return out;
  for (const k of Object.keys(row)) {
    if (k.startsWith(prefix) && k.endsWith(suffix)) {
      out.push({ key: k, name: k.slice(prefix.length, k.length - suffix.length), value: safeNum(row[k], 0) });
    }
  }
  out.sort((a, b) => b.value - a.value);
  return out;
}

export function topN(items, n = 12) {
  return (items || []).slice(0, n);
}

// deterministic projection for legacy “Fingerprint Map” demo
function hashToUint32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function computeEmbedding2D(rows, featureKeys, seed = "EMBED") {
  const rng = mulberry32(hashToUint32(`${seed}:${featureKeys.join("|")}`));
  const w1 = featureKeys.map(() => (rng() - 0.5) * 2);
  const w2 = featureKeys.map(() => (rng() - 0.5) * 2);

  const pts = [];
  for (const r of rows || []) {
    let x = 0,
      y = 0;
    for (let i = 0; i < featureKeys.length; i++) {
      const v = safeNum(r?.[featureKeys[i]], 0);
      x += v * w1[i];
      y += v * w2[i];
    }
    pts.push({ x, y });
  }

  // normalize
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const mx = xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  const my = ys.reduce((a, b) => a + b, 0) / (ys.length || 1);
  const sx =
    Math.sqrt(xs.reduce((s, v) => s + (v - mx) ** 2, 0) / Math.max(1, xs.length - 1)) || 1;
  const sy =
    Math.sqrt(ys.reduce((s, v) => s + (v - my) ** 2, 0) / Math.max(1, ys.length - 1)) || 1;

  return pts.map((p) => ({ x: (p.x - mx) / sx, y: (p.y - my) / sy }));
}

export function uniqueValues(rows, key) {
  const s = new Set();
  for (const r of rows || []) s.add(String(r?.[key] ?? ""));
  return Array.from(s)
    .filter((x) => x !== "")
    .sort();
}

// ---------------------------------------------------------------------------
// Showcase helpers (new)
// ---------------------------------------------------------------------------

/**
 * Resolve a deterministic integer seed from (seed, seedBump, suffix).
 * Accepts either number seeds or string seeds.
 */
export function resolveSeed(seed, seedBump = 0, suffix = "") {
  const base = typeof seed === "number" ? (seed >>> 0) : hashStringToUint32(String(seed));
  const bump = Number(seedBump) >>> 0;
  const extra = suffix ? hashStringToUint32(String(suffix)) : 0;
  return (base + bump + extra) >>> 0;
}

/**
 * Ensure genome rows exist.
 * - If `rows` is provided and non-empty, it will be returned as-is (for cross-tab consistency).
 * - Otherwise, deterministic showcase rows are generated via makeGenomeRows().
 */
export function ensureGenomeRows({
  rows = null,
  categories = null,
  seed = "GENOME",
  seedBump = 0,
  suffix = "",
  n = 2000,
} = {}) {
  if (Array.isArray(rows) && rows.length) {
    const cats = Array.isArray(categories) && categories.length ? categories.map(String) : uniqueValues(rows, "Function_Category");
    return { rows, categories: cats };
  }

  const s = resolveSeed(seed, seedBump, suffix);
  const genRows = makeGenomeRows({
    seed: s,
    n,
    categories: Array.isArray(categories) && categories.length ? categories : undefined,
  });
  const cats = Array.isArray(categories) && categories.length ? categories.map(String) : uniqueValues(genRows, "Function_Category");
  return { rows: genRows, categories: cats };
}
