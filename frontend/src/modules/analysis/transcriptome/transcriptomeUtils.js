// frontend/src/modules/analysis/transcriptome/transcriptomeUtils.js

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
export function round(n, d = 6) {
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
  const a = (arr || []).map((x) => safeNum(x, NaN)).filter(Number.isFinite).slice().sort((x, y) => x - y);
  if (!a.length) return [0, 0, 0, 0, 0];
  return [a[0], quantile(a, 0.25), quantile(a, 0.5), quantile(a, 0.75), a[a.length - 1]];
}
export function histogram(values, { min = null, max = null, bins = 30 } = {}) {
  const v = (values || []).map((x) => safeNum(x, NaN)).filter(Number.isFinite);
  if (!v.length) return { edges: [], counts: [] };

  const lo = min === null ? Math.min(...v) : min;
  const hi = max === null ? Math.max(...v) : max;
  if (!(hi > lo)) return { edges: [], counts: [] };

  const step = (hi - lo) / bins;
  const counts = new Array(bins).fill(0);
  for (const x of v) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((x - lo) / step)));
    counts[idx] += 1;
  }
  const edges = [];
  for (let i = 0; i < bins; i++) edges.push([lo + i * step, lo + (i + 1) * step]);
  return { edges, counts };
}

const BASES = ["A","T","C","G"];
export const DINUCS_ORDER = ["AA","AT","AC","AG","TA","TT","TC","TG","CA","CT","CC","CG","GA","GT","GC","GG"];

export function extractDinucMatrix(row, type = "freq") {
  // type: "freq" => AA_freq... ; "bias" => AA_bias...
  const m = new Map();
  for (const di of DINUCS_ORDER) {
    const key = `${di}_${type}`;
    m.set(di, safeNum(row?.[key], 0));
  }
  // 4x4 grid: rows are first base, cols second base, order A T C G
  const data = [];
  for (let y = 0; y < BASES.length; y++) {
    for (let x = 0; x < BASES.length; x++) {
      const di = `${BASES[y]}${BASES[x]}`;
      data.push([x, y, round(m.get(di) || 0, 6)]);
    }
  }
  return { data, labels: BASES };
}

export function extractTopTrinuc(row, topN = 12) {
  // keys like "TTT_freq" .. "GGG_freq"
  const out = [];
  if (!row) return out;
  for (const k of Object.keys(row)) {
    if (/^[ATCG]{3}_freq$/.test(k)) out.push({ name: k.slice(0, 3), value: safeNum(row[k], 0) });
  }
  out.sort((a, b) => b.value - a.value);
  return out.slice(0, topN);
}

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

export function computeEmbedding2D(rows, featureKeys, seed = "TX_EMBED") {
  const rng = mulberry32(hashToUint32(`${seed}:${featureKeys.join("|")}`));
  const w1 = featureKeys.map(() => (rng() - 0.5) * 2);
  const w2 = featureKeys.map(() => (rng() - 0.5) * 2);

  const pts = [];
  for (const r of rows || []) {
    let x = 0, y = 0;
    for (let i = 0; i < featureKeys.length; i++) {
      const v = safeNum(r?.[featureKeys[i]], 0);
      x += v * w1[i];
      y += v * w2[i];
    }
    pts.push({ x, y });
  }

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const mx = xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  const my = ys.reduce((a, b) => a + b, 0) / (ys.length || 1);
  const sx = Math.sqrt(xs.reduce((s, v) => s + (v - mx) ** 2, 0) / Math.max(1, xs.length - 1)) || 1;
  const sy = Math.sqrt(ys.reduce((s, v) => s + (v - my) ** 2, 0) / Math.max(1, ys.length - 1)) || 1;

  return pts.map((p) => ({ x: (p.x - mx) / sx, y: (p.y - my) / sy }));
}

export function featureKeysForMode(row0, mode) {
  const keys = Object.keys(row0 || {});
  if (mode === "trinuc") return keys.filter((k) => /^[ATCG]{3}_freq$/.test(k)).sort();
  if (mode === "dinuc") return keys.filter((k) => /^[ATCG]{2}_freq$/.test(k)).sort();
  if (mode === "dinuc_bias") return keys.filter((k) => /^[ATCG]{2}_bias$/.test(k)).sort();
  return [];
}
