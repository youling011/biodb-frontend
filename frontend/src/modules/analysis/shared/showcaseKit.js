// src/modules/analysis/shared/showcaseKit.js
//
// Purpose
// - Provide a deterministic, front-end-only "showcase" data generator.
// - Allow each visualization tab to be fully self-sufficient (no API required).
//
// Notes
// - This file intentionally avoids importing project-specific data contracts.
// - Output fields are chosen to be broadly compatible with existing genome UI panels.

// ---------------------------------------------------------------------------
// Seeded RNG
// ---------------------------------------------------------------------------

export function hashStringToUint32(str) {
  const s = String(str ?? "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const s = (typeof seed === "number" && Number.isFinite(seed)) ? (seed >>> 0) : hashStringToUint32(seed);
  const next = mulberry32(s);
  return {
    seed: s,
    next,
    float(min = 0, max = 1) {
      const u = next();
      return min + u * (max - min);
    },
    int(min, max) {
      const lo = Math.ceil(min);
      const hi = Math.floor(max);
      const u = next();
      return lo + Math.floor(u * (hi - lo + 1));
    },
    choice(arr) {
      if (!Array.isArray(arr) || arr.length === 0) return undefined;
      return arr[this.int(0, arr.length - 1)];
    },
  };
}

// ---------------------------------------------------------------------------
// Distributions / helpers
// ---------------------------------------------------------------------------

export function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

export function round(x, digits = 3) {
  const p = Math.pow(10, digits);
  return Math.round((Number(x) || 0) * p) / p;
}

export function randNormal(rng, mu = 0, sigma = 1) {
  // Box–Muller transform
  const u1 = clamp(rng.next(), 1e-12, 1 - 1e-12);
  const u2 = rng.next();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mu + sigma * z0;
}

export function randLogNormal(rng, mu = 6.7, sigma = 0.45) {
  return Math.exp(randNormal(rng, mu, sigma));
}

function gammaSample(rng, alpha) {
  // Marsaglia and Tsang method (alpha > 0)
  const a = Math.max(1e-6, alpha);
  if (a < 1) {
    // boost using Johnk's method
    const u = clamp(rng.next(), 1e-12, 1 - 1e-12);
    return gammaSample(rng, a + 1) * Math.pow(u, 1 / a);
  }
  const d = a - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x = randNormal(rng, 0, 1);
    let v = 1 + c * x;
    if (v <= 0) continue;
    v = v * v * v;
    const u = rng.next();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function randDirichlet(rng, k, alpha = 1.0, weightFn = null) {
  const out = new Array(k).fill(0);
  let sum = 0;
  for (let i = 0; i < k; i++) {
    const w = typeof weightFn === "function" ? clamp(weightFn(i), 0.05, 20) : 1;
    const a = clamp(alpha * w, 0.05, 50);
    const g = gammaSample(rng, a);
    out[i] = g;
    sum += g;
  }
  if (sum <= 0) return out.map(() => 1 / k);
  return out.map((x) => x / sum);
}

export function buildTableColumns(keys, cfg = {}) {
  const {
    labelMap = {},
    widthMap = {},
    sortable = true,
    fixedFirst = true,
  } = cfg;

  const pretty = (k) => {
    if (labelMap && labelMap[k]) return String(labelMap[k]);
    return String(k)
      .replace(/_/g, " ")
      .replace(/\b([a-z])/g, (m) => m.toUpperCase());
  };

  return (keys || []).map((k, idx) => {
    const col = {
      key: k,
      label: pretty(k),
      width: widthMap?.[k],
      sortable,
    };
    if (fixedFirst && idx === 0) col.fixed = "left";
    return col;
  });
}

// ---------------------------------------------------------------------------
// Genome synthetic rows
// ---------------------------------------------------------------------------

function genKmers(len, alphabet = ["A", "C", "G", "T"]) {
  const out = [];
  const rec = (prefix, d) => {
    if (d === 0) {
      out.push(prefix);
      return;
    }
    for (const ch of alphabet) rec(prefix + ch, d - 1);
  };
  rec("", len);
  return out;
}

const CODONS = genKmers(3);
const DINUCS = genKmers(2);
const AAS = [
  "A", "C", "D", "E", "F", "G", "H", "I", "K", "L",
  "M", "N", "P", "Q", "R", "S", "T", "V", "W", "Y",
];

function weightedChoice(rng, items) {
  // items: [{v, w}]
  let s = 0;
  for (const it of items) s += Math.max(0, it.w);
  if (s <= 0) return items[0]?.v;
  let t = rng.float(0, s);
  for (const it of items) {
    t -= Math.max(0, it.w);
    if (t <= 0) return it.v;
  }
  return items[items.length - 1]?.v;
}

function makeAtomBundle({ lengthBp, gc, rng }) {
  // Aesthetic, not chemically exact: strong correlation with length, mild with GC.
  const gcAdj = (Number(gc) - 50) / 50; // ~[-1, 1]
  const len = Math.max(50, Number(lengthBp) || 0);

  const noise = () => randNormal(rng, 0, 0.08);
  const C = len * (9.6 + 0.5 * gcAdj + noise());
  const N = len * (2.9 + 0.25 * gcAdj + noise());
  const O = len * (7.4 + 0.15 * noise());
  const P = len * (1.0 + 0.05 * noise());
  const H = len * (12.2 + 0.25 * noise());

  return {
    Carbon_Atoms: Math.max(0, Math.round(C)),
    Nitrogen_Atoms: Math.max(0, Math.round(N)),
    Oxygen_Atoms: Math.max(0, Math.round(O)),
    Phosphorus_Atoms: Math.max(0, Math.round(P)),
    Hydrogen_Atoms: Math.max(0, Math.round(H)),
  };
}

function makeProteinAtoms({ aaCount, gc, rng }) {
  // Aesthetic: protein atoms correlate with AA count; slight GC effect.
  const adj = (Number(gc) - 50) / 60;
  const nAA = Math.max(10, Number(aaCount) || 0);
  const n = () => randNormal(rng, 0, 0.07);
  const C = nAA * (4.9 + 0.2 * adj + n());
  const N = nAA * (1.35 + 0.08 * adj + n());
  const O = nAA * (1.25 + 0.05 * n());
  return {
    Protein_C_Atoms: Math.max(0, Math.round(C)),
    Protein_N_Atoms: Math.max(0, Math.round(N)),
    Protein_O_Atoms: Math.max(0, Math.round(O)),
  };
}

function makeFingerprint({ gc, rng }) {
  const g = clamp(Number(gc) || 50, 20, 80);
  const gcBias = (g - 50) / 50; // ~[-0.6, 0.6]

  const codonWeights = (i) => {
    const cod = CODONS[i];
    const gcCount = (cod.match(/[GC]/g) || []).length;
    // GC-rich codons slightly preferred when GC% high.
    return 1 + gcBias * (gcCount - 1);
  };
  const dinucWeights = (i) => {
    const di = DINUCS[i];
    const gcCount = (di.match(/[GC]/g) || []).length;
    return 1 + gcBias * (gcCount - 0.8);
  };

  const codon = randDirichlet(rng, CODONS.length, 1.2, codonWeights);
  const aa = randDirichlet(rng, AAS.length, 1.0);
  const dinuc = randDirichlet(rng, DINUCS.length, 1.3, dinucWeights);

  const out = {};
  CODONS.forEach((c, idx) => {
    out[`Codon_${c}_Proportion`] = round(codon[idx], 6);
  });
  AAS.forEach((a, idx) => {
    out[`AA_${a}_Proportion`] = round(aa[idx], 6);
  });
  DINUCS.forEach((d, idx) => {
    out[`Dinuc_${d}_Proportion`] = round(dinuc[idx], 6);
  });
  return out;
}

export function makeGenomeRows(cfg = {}) {
  const {
    seed = 12345,
    n = 1800,
    categories = [
      "Metabolism",
      "Information",
      "Cellular process",
      "Transport",
      "Regulation",
      "Stress",
      "Unknown",
      "none",
    ],
  } = cfg;

  const rng = makeRng(seed);
  const rows = [];

  const catWeights = categories.map((c) => {
    const w = (c === "none") ? 0.08 : (c === "Unknown" ? 0.16 : 0.12);
    return { v: c, w };
  });

  for (let i = 0; i < n; i++) {
    const cat = weightedChoice(rng, catWeights);
    const strand = rng.next() < 0.5 ? "+" : "-";

    const len = Math.round(clamp(randLogNormal(rng, 6.75, 0.5), 90, 12000));
    const baseGc = 52 + (cat === "Information" ? 4 : cat === "Stress" ? -2 : 0);
    const gc = clamp(randNormal(rng, baseGc, 6), 22, 78);
    const promoterGc = clamp(gc + randNormal(rng, 0, 3.5), 18, 85);
    const igLen = Math.round(clamp(randLogNormal(rng, 5.3, 0.7), 20, 4500));
    const igGc = clamp(gc + randNormal(rng, 0, 4.2), 12, 88);

    const atoms = makeAtomBundle({ lengthBp: len, gc, rng });
    const promoterAtoms = makeAtomBundle({ lengthBp: 180 + rng.int(-60, 120), gc: promoterGc, rng });
    const igAtoms = makeAtomBundle({ lengthBp: igLen, gc: igGc, rng });
    const proteinAtoms = makeProteinAtoms({ aaCount: Math.max(30, Math.round(len / 3)), gc, rng });

    const C = atoms.Carbon_Atoms;
    const N = atoms.Nitrogen_Atoms;
    const P = atoms.Phosphorus_Atoms;

    const fingerprint = makeFingerprint({ gc, rng });

    rows.push({
      Gene_Name: `gene_${String(i + 1).padStart(4, "0")}`,
      Function_Category: cat,
      Strand: strand,
      Length_bp: len,
      GC_Content_Percent: round(gc, 3),

      ...atoms,

      C_N_Ratio: round(C / Math.max(1, N), 5),
      C_P_Ratio: round(C / Math.max(1, P), 5),
      N_P_Ratio: round(N / Math.max(1, P), 5),

      // Regulatory context
      Promoter_GC_Content: round(promoterGc, 3),
      Intergenic_Length_bp: igLen,
      Intergenic_GC_Content: round(igGc, 3),

      Promoter_C_Atoms: promoterAtoms.Carbon_Atoms,
      Promoter_N_Atoms: promoterAtoms.Nitrogen_Atoms,
      Promoter_O_Atoms: promoterAtoms.Oxygen_Atoms,
      Promoter_P_Atoms: promoterAtoms.Phosphorus_Atoms,

      Intergenic_C_Atoms: igAtoms.Carbon_Atoms,
      Intergenic_N_Atoms: igAtoms.Nitrogen_Atoms,
      Intergenic_O_Atoms: igAtoms.Oxygen_Atoms,
      Intergenic_P_Atoms: igAtoms.Phosphorus_Atoms,

      ...proteinAtoms,

      // Fingerprint
      ...fingerprint,
    });
  }

  return rows;
}

export const ShowcaseConsts = {
  CODONS,
  DINUCS,
  AAS,
};

// ---------------------------------------------------------------------------
// Transcriptome synthetic rows
// ---------------------------------------------------------------------------

// Transcriptome uses a stable dinucleotide ordering (A/T/C/G) for 4x4 heatmaps.
export const TX_DINUCS_ORDER = [
  "AA", "AT", "AC", "AG",
  "TA", "TT", "TC", "TG",
  "CA", "CT", "CC", "CG",
  "GA", "GT", "GC", "GG",
];

// For codon order, follow the existing transcriptome panel convention: T/C/A/G triple loop.
export const TX_CODON_BASES = ["T", "C", "A", "G"];
export const TX_CODONS_ORDER = (() => {
  const out = [];
  for (const b1 of TX_CODON_BASES) for (const b2 of TX_CODON_BASES) for (const b3 of TX_CODON_BASES) out.push(`${b1}${b2}${b3}`);
  return out;
})();

function makeTxBaseComposition({ gc, rng }) {
  // gc is 0..100
  const g = clamp(Number(gc) || 50, 10, 90) / 100;
  // Split GC between G/C with mild random asymmetry.
  const skew = clamp(randNormal(rng, 0, 0.06), -0.18, 0.18);
  const pG = clamp(g / 2 + skew / 2, 0.01, 0.99);
  const pC = clamp(g - pG, 0.01, 0.99);

  const at = 1 - g;
  const atSkew = clamp(randNormal(rng, 0, 0.06), -0.18, 0.18);
  const pA = clamp(at / 2 + atSkew / 2, 0.01, 0.99);
  const pT = clamp(at - pA, 0.01, 0.99);

  // Normalize (just in case of clamp artifacts)
  const s = pA + pT + pC + pG;
  return { A: pA / s, T: pT / s, C: pC / s, G: pG / s };
}

function makeTxAtomCounts({ lengthNt, gc, rng }) {
  // Aesthetic: correlate strongly with length, mildly with GC.
  const len = Math.max(60, Number(lengthNt) || 0);
  const adj = (clamp(Number(gc) || 50, 10, 90) - 50) / 50; // ~[-0.8, 0.8]
  const n = () => randNormal(rng, 0, 0.08);

  const C = len * (9.2 + 0.35 * adj + n());
  const H = len * (12.0 + 0.20 * n());
  const O = len * (7.0 + 0.12 * n());
  const N = len * (2.8 + 0.22 * adj + n());
  const P = len * (1.0 + 0.05 * n());

  return {
    C_count: Math.max(0, Math.round(C)),
    H_count: Math.max(0, Math.round(H)),
    O_count: Math.max(0, Math.round(O)),
    N_count: Math.max(0, Math.round(N)),
    P_count: Math.max(0, Math.round(P)),
  };
}

function makeTxSpacing({ lengthNt, rng }) {
  // Avg spacing roughly correlates with length; add per-base variation.
  const len = Math.max(80, Number(lengthNt) || 0);
  const base = clamp(randNormal(rng, 4.8 + Math.log10(len) * 0.7, 0.7), 1.5, 10.5);
  return {
    A_avg_spacing: round(clamp(base + randNormal(rng, 0.2, 0.35), 1.2, 12), 4),
    T_avg_spacing: round(clamp(base + randNormal(rng, 0.0, 0.35), 1.2, 12), 4),
    C_avg_spacing: round(clamp(base + randNormal(rng, -0.1, 0.35), 1.2, 12), 4),
    G_avg_spacing: round(clamp(base + randNormal(rng, -0.15, 0.35), 1.2, 12), 4),
  };
}

function makeTxDinucFreqAndBias({ gc, rng }) {
  const comp = makeTxBaseComposition({ gc, rng });
  const gcBias = (clamp(Number(gc) || 50, 10, 90) - 50) / 50;

  // Dirichlet weights: GC-rich dinucs get higher weight when GC% high.
  const wFn = (i) => {
    const di = TX_DINUCS_ORDER[i];
    const gcCount = (di.match(/[GC]/g) || []).length;
    return 1 + gcBias * (gcCount - 0.8);
  };

  const freq = randDirichlet(rng, TX_DINUCS_ORDER.length, 1.2, wFn);

  const out = {};
  for (let i = 0; i < TX_DINUCS_ORDER.length; i++) {
    const di = TX_DINUCS_ORDER[i];
    const x = di[0];
    const y = di[1];
    const expected = (comp?.[x] || 0.25) * (comp?.[y] || 0.25);
    const f = freq[i];
    const bias = clamp(f / Math.max(1e-9, expected), 0.2, 5.0);
    out[`${di}_freq`] = round(f, 8);
    out[`${di}_bias`] = round(bias, 6);
  }
  return out;
}

function makeTxCodonFreq({ gc, rng }) {
  const g = clamp(Number(gc) || 50, 10, 90);
  const gcBias = (g - 50) / 50;

  const wFn = (i) => {
    const cod = TX_CODONS_ORDER[i];
    const gcCount = (cod.match(/[GC]/g) || []).length;
    return 1 + gcBias * (gcCount - 1);
  };

  const freq = randDirichlet(rng, TX_CODONS_ORDER.length, 1.0, wFn);
  const out = {};
  for (let i = 0; i < TX_CODONS_ORDER.length; i++) {
    out[`${TX_CODONS_ORDER[i]}_freq`] = round(freq[i], 10);
  }
  return out;
}

export function makeTranscriptomeRows(cfg = {}) {
  const {
    seed = 24680,
    n = 2000,
  } = cfg;

  const rng = makeRng(seed);
  const rows = [];

  for (let i = 0; i < n; i++) {
    // lengths: transcriptome spans wider; keep visually stable and performant.
    const len = Math.round(clamp(randLogNormal(rng, 6.85, 0.65), 120, 18000));

    // GC%: species-like distribution with mild multi-modality
    const modeShift = (i % 3 === 0) ? 6 : ((i % 3 === 1) ? -3 : 0);
    const gc = clamp(randNormal(rng, 52 + modeShift, 7), 18, 85);

    // complexity + bias
    const entropy = clamp(randNormal(rng, 1.55 + (gc - 50) / 220, 0.16), 0.65, 2.12);
    const lz = clamp(randNormal(rng, 0.42 + (entropy - 1.4) * 0.22, 0.14), 0.08, 1.12);
    const atSkew = clamp(randNormal(rng, 0, 0.09), -0.45, 0.45);
    const gcSkew = clamp(randNormal(rng, 0, 0.09), -0.45, 0.45);

    // motifs are sparse signals; keep within small range
    const haca = clamp(Math.abs(randNormal(rng, 0.0012, 0.0010)), 0, 0.01);
    const cdbox = clamp(Math.abs(randNormal(rng, 0.0010, 0.0011)), 0, 0.01);

    const atoms = makeTxAtomCounts({ lengthNt: len, gc, rng });
    const spacing = makeTxSpacing({ lengthNt: len, rng });
    const dinuc = makeTxDinucFreqAndBias({ gc, rng });
    const codon = makeTxCodonFreq({ gc, rng });

    rows.push({
      Gene_Name: `tx_${String(i + 1).padStart(5, "0")}`,
      Sequence_Length: len,
      GC_content: round(gc, 4),
      Sequence_Entropy: round(entropy, 6),
      LZ_complexity: round(lz, 6),
      AT_skew: round(atSkew, 6),
      GC_skew: round(gcSkew, 6),

      ...atoms,

      H_ACA_box_freq: round(haca, 8),
      C_D_box_freq: round(cdbox, 8),

      ...spacing,

      ...dinuc,
      ...codon,
    });
  }

  return rows;
}

export const ShowcaseTxConsts = {
  TX_DINUCS_ORDER,
  TX_CODON_BASES,
  TX_CODONS_ORDER,
};
