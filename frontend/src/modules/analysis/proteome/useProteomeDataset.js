import { computed, ref } from "vue";

const AA_KEYS = [
  "AA_A", "AA_C", "AA_D", "AA_E", "AA_F",
  "AA_G", "AA_H", "AA_I", "AA_K", "AA_L",
  "AA_M", "AA_N", "AA_P", "AA_Q", "AA_R",
  "AA_S", "AA_T", "AA_V", "AA_W", "AA_Y",
];

function hash32(str) {
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
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round(n, d = 3) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

function dirichlet(rng, k) {
  const xs = [];
  let sum = 0;
  for (let i = 0; i < k; i++) {
    const u = Math.max(1e-9, rng());
    const v = Math.pow(-Math.log(u), 1);
    xs.push(v);
    sum += v;
  }
  return xs.map((v) => v / (sum || 1));
}

function quantile(sorted, q) {
  const n = sorted.length;
  if (!n) return 0;
  const pos = (n - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] === undefined) return sorted[base];
  return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

function buildProteomeRows({ seed = "PROTEOME", n = 4200 } = {}) {
  const rng = mulberry32(hash32(seed));
  const rows = [];
  for (let i = 0; i < n; i++) {
    const length = Math.floor(80 + rng() * 920);
    const aa = dirichlet(rng, AA_KEYS.length).map((v) => v * 100);
    const aaMap = {};
    AA_KEYS.forEach((k, idx) => {
      aaMap[k] = round(aa[idx], 3);
    });

    const C = Math.floor(length * (4.5 + rng() * 2.2));
    const H = Math.floor(length * (7.8 + rng() * 2.5));
    const O = Math.floor(length * (1.2 + rng() * 0.8));
    const N = Math.floor(length * (1.1 + rng() * 0.7));
    const S = Math.floor(1 + rng() * 6);
    const P = 0;

    const molecularWeight = round(length * (95 + rng() * 40), 2);
    const pI = round(4 + rng() * 6, 2);
    const netCharge = round((pI - 7) + (rng() - 0.5) * 2, 2);
    const gravy = round(-1 + rng() * 2.2, 3);
    const aromaticity = round(0.03 + rng() * 0.12, 3);
    const aliphatic = round(50 + rng() * 90, 2);
    const instability = round(10 + rng() * 70, 2);
    const polarNonpolar = round(0.6 + rng() * 1.8, 3);

    const helix = round(0.2 + rng() * 0.6, 3);
    const sheet = round(0.15 + rng() * 0.5, 3);
    const turn = round(0.1 + rng() * 0.4, 3);
    const solvent = round(0.25 + rng() * 0.6, 3);
    const hydrophilicity = round(-2 + rng() * 4, 3);
    const flexibility = round(0.2 + rng() * 0.6, 3);
    const disulfide = round(rng() * 2, 3);
    const entropy = round(2 + rng() * 2.2, 3);

    const acidic = round(aaMap.AA_D + aaMap.AA_E, 3);
    const basic = round(aaMap.AA_K + aaMap.AA_R + aaMap.AA_H, 3);
    const polar = round(aaMap.AA_S + aaMap.AA_T + aaMap.AA_N + aaMap.AA_Q + aaMap.AA_Y + aaMap.AA_C, 3);
    const nonpolar = round(aaMap.AA_A + aaMap.AA_V + aaMap.AA_I + aaMap.AA_L + aaMap.AA_M + aaMap.AA_F + aaMap.AA_W + aaMap.AA_P + aaMap.AA_G, 3);

    const proteinId = `P${String(i + 1).padStart(5, "0")}`;

    const row = {
      Protein_ID: proteinId,
      Sequence_Length: length,
      C,
      H,
      O,
      N,
      P,
      S,
      ...aaMap,
      Molecular_Weight: molecularWeight,
      pI,
      Net_Charge: netCharge,
      GRAVY: gravy,
      Hydrophobicity: gravy,
      Aromaticity: aromaticity,
      Aliphatic_Index: aliphatic,
      Instability_Index: instability,
      Polar_Nonpolar_Ratio: polarNonpolar,
      Helix_Propensity: helix,
      Sheet_Propensity: sheet,
      Turn_Propensity: turn,
      Solvent_Accessibility: solvent,
      Hydrophilicity: hydrophilicity,
      Flexibility: flexibility,
      Disulfide_Potential: disulfide,
      Sequence_Entropy: entropy,
      Acidic_AA: acidic,
      Basic_AA: basic,
      Polar_AA: polar,
      Nonpolar_AA: nonpolar,
      Molar_Extinction_Reduced: round(20000 + rng() * 40000, 1),
      Molar_Extinction_Disulfide: round(25000 + rng() * 45000, 1),
    };

    const len = Math.max(1, length);
    row.C_per_res = round(C / len, 5);
    row.H_per_res = round(H / len, 5);
    row.O_per_res = round(O / len, 5);
    row.N_per_res = round(N / len, 5);
    row.S_per_res = round(S / len, 5);
    row.C_N_ratio = round(row.C_per_res / Math.max(row.N_per_res, 1e-6), 5);
    row.N_S_ratio = round(row.N_per_res / Math.max(row.S_per_res, 1e-6), 5);

    rows.push(row);
  }
  return rows;
}

const cache = new Map();

export function useProteomeDataset(sampleId = "PROTEOME") {
  const key = String(sampleId || "PROTEOME");
  if (!cache.has(key)) {
    cache.set(key, ref(buildProteomeRows({ seed: key, n: 4298 })));
  }
  const rows = cache.get(key);

  const lengths = computed(() => rows.value.map((r) => r.Sequence_Length).sort((a, b) => a - b));
  const lengthQ1 = computed(() => quantile(lengths.value, 0.25));
  const lengthQ3 = computed(() => quantile(lengths.value, 0.75));

  return {
    rows,
    lengthQ1,
    lengthQ3,
    aaKeys: AA_KEYS,
  };
}
