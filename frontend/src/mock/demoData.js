// frontend/src/mock/demoData.js
// Demo / Fallback 数据工厂：为全站提供“结构一致、数量充足”的可视化示例数据。

function hashToUint32(input) {
  const str = String(input ?? "");
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
function makeRng(seed) {
  const s = typeof seed === "number" ? seed >>> 0 : hashToUint32(seed);
  return mulberry32(s);
}
function randn(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}
function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
function round(n, d = 3) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}
function quantile(sortedAsc, q) {
  const n = sortedAsc.length;
  if (!n) return 0;
  const pos = (n - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedAsc[base + 1] === undefined) return sortedAsc[base];
  return sortedAsc[base] + rest * (sortedAsc[base + 1] - sortedAsc[base]);
}
function fiveNumber(arr) {
  const a = (arr || []).filter((x) => Number.isFinite(x)).slice().sort((x, y) => x - y);
  if (!a.length) return [0, 0, 0, 0, 0];
  return [
    a[0],
    quantile(a, 0.25),
    quantile(a, 0.5),
    quantile(a, 0.75),
    a[a.length - 1],
  ].map((x) => round(x, 5));
}
function dirichlet(rng, k, alphaBase = 1) {
  const x = [];
  let sum = 0;
  for (let i = 0; i < k; i++) {
    const u = Math.max(1e-9, rng());
    const v = Math.pow(-Math.log(u), 1 / alphaBase);
    x.push(v);
    sum += v;
  }
  return x.map((v) => v / (sum || 1));
}
function softmax(logits) {
  const max = Math.max(...logits);
  const exps = logits.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}

// DNA（或按你模板“用T代表U”）单核苷酸（monophosphate）近似原子组成（用于 demo 一致性）
const DNA_ATOMS = {
  A: { C: 10, H: 14, O: 6, N: 5, P: 1 },
  T: { C: 10, H: 15, O: 8, N: 2, P: 1 },
  C: { C: 9,  H: 14, O: 7, N: 3, P: 1 },
  G: { C: 10, H: 14, O: 7, N: 5, P: 1 },
};

const BASES = ["A", "T", "C", "G"];
const CODONS = (() => {
  const out = [];
  for (const b1 of BASES) for (const b2 of BASES) for (const b3 of BASES) out.push(`${b1}${b2}${b3}`);
  return out;
})();
const DINUCS_ORDER = ["AA","AT","AC","AG","TA","TT","TC","TG","CA","CT","CC","CG","GA","GT","GC","GG"];
const AA_ORDER = ["A","R","N","D","C","Q","E","G","H","I","L","K","M","F","P","S","T","W","Y","V"];

function biasedProportions(rng, keys, gcPercent, keyGcCountFn) {
  const g = clamp(gcPercent, 0, 100);
  const bias = (g - 50) / 50; // -1..1
  const logits = keys.map((k) => {
    const gc = keyGcCountFn(k); // 0..len
    const score = (gc - (k.length / 2)) * 0.9 * bias + randn(rng) * 0.15;
    return score;
  });
  const p = softmax(logits);
  return p;
}

function shannonEntropyFromCounts(counts) {
  const sum = counts.reduce((a, b) => a + b, 0);
  if (sum <= 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c <= 0) continue;
    const p = c / sum;
    h -= p * (Math.log(p) / Math.log(2));
  }
  return h;
}

export function mockSamples(count = 220, seed = "SAMPLES") {
  const rng = makeRng(seed);

  const taxa = [
    { name: "Bacteria", genera: ["Escherichia", "Bacillus", "Pseudomonas", "Streptomyces", "Vibrio", "Lactobacillus"] },
    { name: "Archaea", genera: ["Halobacterium", "Methanocaldococcus", "Sulfolobus", "Thermococcus"] },
    { name: "Fungi", genera: ["Saccharomyces", "Candida", "Aspergillus"] },
    { name: "Plantae", genera: ["Arabidopsis", "Oryza", "Zea"] },
    { name: "Metazoa", genera: ["Homo", "Mus", "Drosophila", "Danio"] },
    { name: "Virus", genera: ["Influenza", "Coronavirus", "Adenovirus"] },
  ];

  const speciesEpi = ["coli","subtilis","aeruginosa","cerevisiae","thaliana","sapiens","melanogaster","rerio","sp.","strainX","variantA","isolateB"];
  const omicsChoices = ["GENOME", "TRANSCRIPTOME", "PROTEOME"];

  const out = [];
  for (let i = 1; i <= count; i++) {
    const t = pick(rng, taxa);
    const genus = pick(rng, t.genera);
    const sp = pick(rng, speciesEpi);
    const omics = pick(rng, omicsChoices);

    const baseGc = clamp(30 + rng() * 40 + randn(rng) * 2, 25, 75);
    const geneCount =
      omics === "GENOME" ? Math.floor(2500 + rng() * 5500) :
      omics === "TRANSCRIPTOME" ? Math.floor(2500 + rng() * 5500) :
      Math.floor(1800 + rng() * 6500);

    const avgCn = clamp(3 + rng() * 4 + randn(rng) * 0.2, 1.2, 10);

    out.push({
      id: i,
      species_name: `${genus} ${sp}`,
      taxonomy: t.name,
      omics_type: omics,
      summary_stats: {
        gene_count: geneCount,
        avg_gc: round(baseGc, 2),
        avg_cn_ratio: round(avgCn, 3),
        notes: "Demo data (auto-generated when backend is empty).",
      },
      created_at: new Date(Date.now() - Math.floor(rng() * 360) * 86400000).toISOString(),
    });
  }
  return out;
}

// ------------------------
// GENOME mock（保留你之前的 schema）
// ------------------------
function mockGenomeRows(rng, n) {
  const fnCats = [
    { name: "other", w: 0.72 },
    { name: "regulator", w: 0.07 },
    { name: "transporter", w: 0.07 },
    { name: "none", w: 0.05 },
    { name: "factor", w: 0.04 },
    { name: "enzyme", w: 0.04 },
    { name: "structural", w: 0.01 },
  ];
  function pickCategory() {
    const u = rng();
    let acc = 0;
    for (const c of fnCats) {
      acc += c.w;
      if (u <= acc) return c.name;
    }
    return "other";
  }
  const strand = ["+", "-"];

  const lengthMean = 980;
  const lengthSd = 520;

  const rows = [];
  for (let i = 0; i < n; i++) {
    const L = Math.floor(clamp(lengthMean + randn(rng) * lengthSd, 90, 4200));
    const gc = clamp(35 + rng() * 30 + randn(rng) * 2.0, 20, 80);
    const promoterGc = clamp(gc + randn(rng) * 3.5, 10, 95);

    const gcCount = Math.floor(clamp(Math.round(L * gc / 100), 0, L));
    const atCount = L - gcCount;

    const C_Count = Math.floor(gcCount * (0.5 + (rng() - 0.5) * 0.15));
    const G_Count = gcCount - C_Count;
    const A_Count = Math.floor(atCount * (0.5 + (rng() - 0.5) * 0.15));
    const T_Count = atCount - A_Count;

    const Carbon_Atoms =
      A_Count * DNA_ATOMS.A.C + T_Count * DNA_ATOMS.T.C + C_Count * DNA_ATOMS.C.C + G_Count * DNA_ATOMS.G.C;
    const Hydrogen_Atoms =
      A_Count * DNA_ATOMS.A.H + T_Count * DNA_ATOMS.T.H + C_Count * DNA_ATOMS.C.H + G_Count * DNA_ATOMS.G.H;
    const Oxygen_Atoms =
      A_Count * DNA_ATOMS.A.O + T_Count * DNA_ATOMS.T.O + C_Count * DNA_ATOMS.C.O + G_Count * DNA_ATOMS.G.O;
    const Nitrogen_Atoms =
      A_Count * DNA_ATOMS.A.N + T_Count * DNA_ATOMS.T.N + C_Count * DNA_ATOMS.C.N + G_Count * DNA_ATOMS.G.N;

    const Phosphorus_Atoms = L;

    const C_N_Ratio = Carbon_Atoms / Math.max(1, Nitrogen_Atoms);
    const C_P_Ratio = Carbon_Atoms / Math.max(1, Phosphorus_Atoms);
    const N_P_Ratio = Nitrogen_Atoms / Math.max(1, Phosphorus_Atoms);

    const Function_Category = pickCategory();
    const isCoding = Function_Category !== "none";

    const codonP = biasedProportions(
      rng,
      CODONS,
      gc,
      (codon) => (codon[0] === "G" || codon[0] === "C") + (codon[1] === "G" || codon[1] === "C") + (codon[2] === "G" || codon[2] === "C")
    );

    const aaP = dirichlet(rng, AA_ORDER.length, 1.0);
    const aaLen = Math.max(10, Math.floor(L / 3));

    const proteinScale = isCoding ? 4.8 : 0;
    const Protein_C_Atoms = isCoding ? Math.round(aaLen * (proteinScale * (0.9 + 0.2 * rng()))) : 0;
    const Protein_H_Atoms = isCoding ? Math.round(aaLen * (proteinScale * (1.2 + 0.25 * rng()))) : 0;
    const Protein_O_Atoms = isCoding ? Math.round(aaLen * (proteinScale * (0.15 + 0.10 * rng()))) : 0;
    const Protein_N_Atoms = isCoding ? Math.round(aaLen * (proteinScale * (0.18 + 0.12 * rng()))) : 0;

    const Intergenic_Length_bp = rng() < 0.18 ? 0 : Math.floor(clamp(10 + rng() * 520 + randn(rng) * 18, 0, 900));
    const Intergenic_GC_Content = Intergenic_Length_bp === 0 ? 0 : round(clamp(gc + randn(rng) * 4.2, 5, 95), 3);

    let Intergenic_C_Atoms = 0, Intergenic_H_Atoms = 0, Intergenic_O_Atoms = 0, Intergenic_N_Atoms = 0, Intergenic_P_Atoms = 0;
    if (Intergenic_Length_bp > 0) {
      const igL = Intergenic_Length_bp;
      const igGcCount = Math.floor(clamp(Math.round(igL * Intergenic_GC_Content / 100), 0, igL));
      const igAtCount = igL - igGcCount;
      const igC = Math.floor(igGcCount * (0.5 + (rng() - 0.5) * 0.15));
      const igG = igGcCount - igC;
      const igA = Math.floor(igAtCount * (0.5 + (rng() - 0.5) * 0.15));
      const igT = igAtCount - igA;

      Intergenic_C_Atoms = igA * DNA_ATOMS.A.C + igT * DNA_ATOMS.T.C + igC * DNA_ATOMS.C.C + igG * DNA_ATOMS.G.C;
      Intergenic_H_Atoms = igA * DNA_ATOMS.A.H + igT * DNA_ATOMS.T.H + igC * DNA_ATOMS.C.H + igG * DNA_ATOMS.G.H;
      Intergenic_O_Atoms = igA * DNA_ATOMS.A.O + igT * DNA_ATOMS.T.O + igC * DNA_ATOMS.C.O + igG * DNA_ATOMS.G.O;
      Intergenic_N_Atoms = igA * DNA_ATOMS.A.N + igT * DNA_ATOMS.T.N + igC * DNA_ATOMS.C.N + igG * DNA_ATOMS.G.N;
      Intergenic_P_Atoms = igL;
    }

    const promoterLen = 100;
    const pGcCount = Math.floor(clamp(Math.round(promoterLen * promoterGc / 100), 0, promoterLen));
    const pAtCount = promoterLen - pGcCount;
    const pC = Math.floor(pGcCount * (0.5 + (rng() - 0.5) * 0.12));
    const pG = pGcCount - pC;
    const pA = Math.floor(pAtCount * (0.5 + (rng() - 0.5) * 0.12));
    const pT = pAtCount - pA;

    const Promoter_C_Atoms = pA * DNA_ATOMS.A.C + pT * DNA_ATOMS.T.C + pC * DNA_ATOMS.C.C + pG * DNA_ATOMS.G.C;
    const Promoter_H_Atoms = pA * DNA_ATOMS.A.H + pT * DNA_ATOMS.T.H + pC * DNA_ATOMS.C.H + pG * DNA_ATOMS.G.H;
    const Promoter_O_Atoms = pA * DNA_ATOMS.A.O + pT * DNA_ATOMS.T.O + pC * DNA_ATOMS.C.O + pG * DNA_ATOMS.G.O;
    const Promoter_N_Atoms = pA * DNA_ATOMS.A.N + pT * DNA_ATOMS.T.N + pC * DNA_ATOMS.C.N + pG * DNA_ATOMS.G.N;
    const Promoter_P_Atoms = promoterLen;

    const row = {
      Gene_Name: `Gene_${String(i + 1).padStart(5, "0")}`,
      Carbon_Atoms,
      Hydrogen_Atoms,
      Oxygen_Atoms,
      Nitrogen_Atoms,
      A_Count,
      T_Count,
      C_Count,
      G_Count,
      Phosphorus_Atoms,
      C_N_Ratio: round(C_N_Ratio, 3),
      C_P_Ratio: round(C_P_Ratio, 3),
      N_P_Ratio: round(N_P_Ratio, 3),
      Length_bp: L,
      GC_Content_Percent: round(gc, 3),
      Strand: pick(rng, strand),
      Function_Category,
      Protein_C_Atoms,
      Protein_H_Atoms,
      Protein_O_Atoms,
      Protein_N_Atoms,
      Intergenic_Length_bp,
      Intergenic_GC_Content,
      Intergenic_C_Atoms,
      Intergenic_H_Atoms,
      Intergenic_O_Atoms,
      Intergenic_N_Atoms,
      Intergenic_P_Atoms,
      Promoter_C_Atoms,
      Promoter_H_Atoms,
      Promoter_O_Atoms,
      Promoter_N_Atoms,
      Promoter_P_Atoms,
      Promoter_GC_Content: round(promoterGc, 3),
    };

    for (let k = 0; k < CODONS.length; k++) row[`Codon_${CODONS[k]}_Proportion`] = round(codonP[k] * 100, 3);
    for (let k = 0; k < AA_ORDER.length; k++) row[`AA_${AA_ORDER[k]}_Proportion`] = round(aaP[k] * 100, 3);

    const dinucP = biasedProportions(
      rng,
      DINUCS_ORDER,
      gc,
      (di) => (di[0] === "G" || di[0] === "C") + (di[1] === "G" || di[1] === "C")
    );
    const dNorm = dirichlet(rng, DINUCS_ORDER.length, 1.0);
    const mix = DINUCS_ORDER.map((_, idx) => 0.55 * dinucP[idx] + 0.45 * dNorm[idx]);
    const mixSum = mix.reduce((a, b) => a + b, 0) || 1;
    for (let k = 0; k < DINUCS_ORDER.length; k++) row[`Dinuc_${DINUCS_ORDER[k]}_Proportion`] = round((mix[k] / mixSum) * 100, 3);

    rows.push(row);
  }

  // Category_Avg_* 写回（与模板一致）
  const catAgg = new Map();
  for (const r of rows) {
    const c = r.Function_Category || "other";
    if (!catAgg.has(c)) catAgg.set(c, { n: 0, C: 0, H: 0, O: 0, N: 0, P: 0 });
    const a = catAgg.get(c);
    a.n += 1;
    a.C += r.Carbon_Atoms; a.H += r.Hydrogen_Atoms; a.O += r.Oxygen_Atoms; a.N += r.Nitrogen_Atoms; a.P += r.Phosphorus_Atoms;
  }
  const catAvg = new Map();
  for (const [c, a] of catAgg.entries()) {
    catAvg.set(c, {
      Category_Avg_C_Atoms: round(a.C / a.n, 3),
      Category_Avg_H_Atoms: round(a.H / a.n, 3),
      Category_Avg_O_Atoms: round(a.O / a.n, 3),
      Category_Avg_N_Atoms: round(a.N / a.n, 3),
      Category_Avg_P_Atoms: round(a.P / a.n, 3),
    });
  }
  for (const r of rows) Object.assign(r, catAvg.get(r.Function_Category || "other"));

  return rows;
}

// ------------------------
// TRANSCRIPTOME mock（对齐 gene_features.csv 风格）
// ------------------------
function mockTranscriptomeRows(rng, n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const L = Math.floor(clamp(180 + rng() * 1600 + randn(rng) * 70, 60, 6000));
    const gc = clamp(28 + rng() * 36 + randn(rng) * 2.2, 10, 90);

    // base counts (sum = length)
    const gcCount = Math.floor(clamp(Math.round(L * gc / 100), 0, L));
    const atCount = L - gcCount;

    const C_nucleotide_count = Math.floor(gcCount * (0.5 + (rng() - 0.5) * 0.12));
    const G_count = gcCount - C_nucleotide_count;
    const A_count = Math.floor(atCount * (0.5 + (rng() - 0.5) * 0.12));
    const T_count = atCount - A_count;

    // atoms (C/H/O/N/P counts)
    const C_count =
      A_count * DNA_ATOMS.A.C + T_count * DNA_ATOMS.T.C + C_nucleotide_count * DNA_ATOMS.C.C + G_count * DNA_ATOMS.G.C;
    const H_count =
      A_count * DNA_ATOMS.A.H + T_count * DNA_ATOMS.T.H + C_nucleotide_count * DNA_ATOMS.C.H + G_count * DNA_ATOMS.G.H;
    const O_count =
      A_count * DNA_ATOMS.A.O + T_count * DNA_ATOMS.T.O + C_nucleotide_count * DNA_ATOMS.C.O + G_count * DNA_ATOMS.G.O;
    const N_count =
      A_count * DNA_ATOMS.A.N + T_count * DNA_ATOMS.T.N + C_nucleotide_count * DNA_ATOMS.C.N + G_count * DNA_ATOMS.G.N;

    const P_count = L; // 与模板一致：每 nt ~ 1 个 P

    const GC_content = round((gcCount / Math.max(1, L)) * 100, 3);
    const AT_skew = round((A_count - T_count) / Math.max(1, A_count + T_count), 5);
    const GC_skew = round((G_count - C_nucleotide_count) / Math.max(1, G_count + C_nucleotide_count), 5);

    const entropy = round(shannonEntropyFromCounts([A_count, T_count, C_nucleotide_count, G_count]), 5);
    // LZ complexity：用 length 与 entropy 组合的稳定 demo
    const LZ_complexity = round(clamp((0.15 + 0.85 * (entropy / 2)) * Math.log2(L + 1) / 12 + randn(rng) * 0.02, 0.01, 1.2), 5);

    // dinucleotide frequencies (16 sum=1), and bias around 1
    const dinucRaw = biasedProportions(
      rng,
      DINUCS_ORDER,
      GC_content,
      (di) => (di[0] === "G" || di[0] === "C") + (di[1] === "G" || di[1] === "C")
    );
    const dinucNoise = dirichlet(rng, 16, 1.0);
    const dinuc = DINUCS_ORDER.map((_, idx) => 0.7 * dinucRaw[idx] + 0.3 * dinucNoise[idx]);
    const dinucSum = dinuc.reduce((a, b) => a + b, 0) || 1;
    const dinucFreq = dinuc.map((x) => x / dinucSum);

    // expected dinuc from base freqs
    const pA = A_count / Math.max(1, L);
    const pT = T_count / Math.max(1, L);
    const pC = C_nucleotide_count / Math.max(1, L);
    const pG = G_count / Math.max(1, L);
    const baseP = { A: pA, T: pT, C: pC, G: pG };

    // trinucleotide(64) frequencies sum=1
    const triRaw = biasedProportions(
      rng,
      CODONS,
      GC_content,
      (codon) => (codon[0] === "G" || codon[0] === "C") + (codon[1] === "G" || codon[1] === "C") + (codon[2] === "G" || codon[2] === "C")
    );
    const triNoise = dirichlet(rng, 64, 1.0);
    const tri = CODONS.map((_, idx) => 0.75 * triRaw[idx] + 0.25 * triNoise[idx]);
    const triSum = tri.reduce((a, b) => a + b, 0) || 1;
    const triFreq = tri.map((x) => x / triSum);

    // motif-like signals & spacing
    const C_D_box_freq = round(clamp(rng() * 0.08 + randn(rng) * 0.01, 0, 0.12), 6);
    const H_ACA_box_freq = round(clamp(rng() * 0.06 + randn(rng) * 0.01, 0, 0.10), 6);

    function avgSpacing(p) {
      // 近似：间距与 1/p 成正比，并加噪声；限制范围
      if (p <= 0) return 0;
      return round(clamp((1 / p) * (0.7 + 0.6 * rng()) + randn(rng) * 0.2, 1.0, 80.0), 5);
    }
    const A_avg_spacing = avgSpacing(pA);
    const T_avg_spacing = avgSpacing(pT);
    const C_avg_spacing = avgSpacing(pC);
    const G_avg_spacing = avgSpacing(pG);

    const row = {
      Gene_Name: `Tx_${String(i + 1).padStart(5, "0")}`,
      Sequence_Length: L,
      GC_content,

      // counts
      A_count,
      T_count,
      C_nucleotide_count,
      G_count,

      // atoms
      C_count,
      H_count,
      O_count,
      N_count,
      P_count,

      // complexity/skew
      Sequence_Entropy: entropy,
      LZ_complexity,
      AT_skew,
      GC_skew,

      // motif/spacing
      C_D_box_freq,
      H_ACA_box_freq,
      A_avg_spacing,
      T_avg_spacing,
      C_avg_spacing,
      G_avg_spacing,
    };

    // dinuc freq & bias
    for (let k = 0; k < DINUCS_ORDER.length; k++) {
      const di = DINUCS_ORDER[k];
      const f = dinucFreq[k];
      row[`${di}_freq`] = round(f, 8);

      const exp = (baseP[di[0]] || 0) * (baseP[di[1]] || 0);
      const bias = exp > 0 ? f / exp : 0;
      row[`${di}_bias`] = round(clamp(bias, 0, 6), 8);
    }

    // trinuc freq
    for (let k = 0; k < CODONS.length; k++) {
      row[`${CODONS[k]}_freq`] = round(triFreq[k], 8);
    }

    rows.push(row);
  }

  return rows;
}

function buildCommonChartsAndTablesFromRows(rows, cfg) {
  const {
    CKey, NKey, OKey, PKey, lenKey, gcKey, nameKey,
  } = cfg;

  const CArr = rows.map((r) => r[CKey]);
  const NArr = rows.map((r) => r[NKey]);
  const OArr = rows.map((r) => r[OKey]);
  const PArr = rows.map((r) => r[PKey]);
  const element_boxplot = [fiveNumber(CArr), fiveNumber(NArr), fiveNumber(OArr), fiveNumber(PArr)];

  const cnArr = rows.map((r) => (r[CKey] / Math.max(1, r[NKey]))).filter((x) => Number.isFinite(x));
  const minCn = Math.max(0, Math.floor(Math.min(...cnArr)));
  const maxCn = Math.min(30, Math.ceil(Math.max(...cnArr)));
  const step = 0.5;
  const binCount = Math.max(12, Math.min(50, Math.ceil((maxCn - minCn) / step)));

  const bins = [];
  const counts = new Array(binCount).fill(0);
  for (let i = 0; i < binCount; i++) {
    const a = minCn + i * step;
    const b = a + step;
    bins.push(`${round(a, 1)}-${round(b, 1)}`);
  }
  for (const v of cnArr) {
    const idx = Math.floor((v - minCn) / step);
    if (idx >= 0 && idx < binCount) counts[idx] += 1;
  }

  const scatterN = Math.min(1200, rows.length);
  const gc_scatter = [];
  // GC vs N atoms（通用）
  for (let i = 0; i < scatterN; i++) {
    // Deterministic sampling: DO NOT use any client-side randomness.
    // We sample points using a fixed stride so the same input rows
    // always produce the same scatter plot.
    const idx = rows.length ? (i * 9973) % rows.length : 0;
    const r = rows[idx];
    if (!r) continue;
    gc_scatter.push([r[gcKey], r[NKey], r[nameKey]]);
  }

  const top_n_cost = rows
    .slice()
    .sort((a, b) => (b[NKey] / Math.max(1, b[lenKey])) - (a[NKey] / Math.max(1, a[lenKey])))
    .slice(0, 10);

  const low_cn_ratio = rows
    .slice()
    .sort((a, b) => (a[CKey] / Math.max(1, a[NKey])) - (b[CKey] / Math.max(1, b[NKey])))
    .slice(0, 10);

  // legacy radar：用通用指标填充（避免旧面板缺字段出错）
  const avgGc = round(rows.reduce((s, r) => s + (r[gcKey] || 0), 0) / (rows.length || 1), 3);
  const avgN = round(rows.reduce((s, r) => s + (r[NKey] || 0), 0) / (rows.length || 1), 3);
  const avgL = round(rows.reduce((s, r) => s + (r[lenKey] || 0), 0) / (rows.length || 1), 3);

  const promoter_radar = {
    indicators: [
      { name: "GC%", max: 100 },
      { name: "Avg N", max: Math.max(...NArr) || 1 },
      { name: "Avg Length", max: Math.max(...rows.map((r) => r[lenKey])) || 1 },
      { name: "C:N", max: Math.max(...cnArr) || 1 },
    ],
    values: [avgGc, avgN, avgL, round((rows.reduce((s, r) => s + (r[CKey] / Math.max(1, r[NKey])), 0) / (rows.length || 1)), 3)],
  };

  return {
    charts: {
      element_boxplot,
      cn_histogram: { bins, counts },
      promoter_radar,
      gc_scatter,
    },
    tables: { top_n_cost, low_cn_ratio },
  };
}

export function mockSpeciesAnalysis({ sampleId, omics = "GENOME", n = 1200, seed = "SPECIES" }) {
  const rng = makeRng(`${seed}:${sampleId}:${omics}`);
  const isTx = String(omics).toUpperCase() === "TRANSCRIPTOME";

  const rows = isTx ? mockTranscriptomeRows(rng, n) : mockGenomeRows(rng, n);

  function meanOfKey(key) {
    let s = 0;
    let c = 0;
    for (const r of rows) {
      const v = Number(r?.[key]);
      if (Number.isFinite(v)) {
        s += v;
        c += 1;
      }
    }
    return c ? s / c : 0;
  }

  function pearson(xs, ys) {
    const n = Math.min(xs.length, ys.length);
    if (!n) return 0;
    let sx = 0;
    let sy = 0;
    let c = 0;
    for (let i = 0; i < n; i++) {
      const x = Number(xs[i]);
      const y = Number(ys[i]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      sx += x;
      sy += y;
      c += 1;
    }
    if (c < 3) return 0;
    const mx = sx / c;
    const my = sy / c;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    for (let i = 0; i < n; i++) {
      const x = Number(xs[i]);
      const y = Number(ys[i]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const dx = x - mx;
      const dy = y - my;
      sxx += dx * dx;
      syy += dy * dy;
      sxy += dx * dy;
    }
    const den = Math.sqrt(sxx) * Math.sqrt(syy);
    return den > 0 ? sxy / den : 0;
  }

  function histogram(values, { minV = null, maxV = null, bins = 20, digits = 2 } = {}) {
    const arr = (values || []).map((x) => Number(x)).filter((x) => Number.isFinite(x));
    if (!arr.length) return { bins: [], counts: [] };

    const lo = Number.isFinite(minV) ? minV : Math.min(...arr);
    const hi = Number.isFinite(maxV) ? maxV : Math.max(...arr);
    const span = hi - lo;
    const k = Math.max(3, Math.min(80, Number(bins) || 20));
    const step = span > 0 ? span / k : 1;

    const labels = [];
    const counts = new Array(k).fill(0);
    for (let i = 0; i < k; i++) {
      const a = lo + i * step;
      const b = a + step;
      labels.push(`${round(a, digits)}-${round(b, digits)}`);
    }

    for (const v of arr) {
      const idx = step > 0 ? Math.floor((v - lo) / step) : 0;
      const j = Math.min(k - 1, Math.max(0, idx));
      counts[j] += 1;
    }

    return { bins: labels, counts };
  }

  function dinucHeatmap(suffix) {
    const labels = ["A", "T", "C", "G"]; // order used by UI
    const idx = { A: 0, T: 1, C: 2, G: 3 };

    const sums = {};
    const cnt = rows.length || 1;
    for (const di of DINUCS_ORDER) sums[di] = 0;
    for (const r of rows) {
      for (const di of DINUCS_ORDER) {
        const v = Number(r?.[`${di}_${suffix}`]);
        if (Number.isFinite(v)) sums[di] += v;
      }
    }

    const data = [];
    for (const di of DINUCS_ORDER) {
      const a = di[0];
      const b = di[1];
      const x = idx[b];
      const y = idx[a];
      const v = sums[di] / cnt;
      data.push([x, y, round(v, 6)]);
    }

    return { labels, data };
  }

  function correlationMatrix(fields) {
    const xs = fields.map((k) => rows.map((r) => r?.[k]));
    const values = [];
    for (let j = 0; j < fields.length; j++) {
      for (let i = 0; i < fields.length; i++) {
        const r = pearson(xs[i], xs[j]);
        values.push([i, j, round(r, 4)]);
      }
    }
    return { xLabels: fields, yLabels: fields, values };
  }

  // Build baseline (shared) charts/tables
  const baseline = buildCommonChartsAndTablesFromRows(rows, isTx ? {
    CKey: "C_count",
    NKey: "N_count",
    OKey: "O_count",
    PKey: "P_count",
    lenKey: "Sequence_Length",
    gcKey: "GC_content",
    nameKey: "Gene_Name",
  } : {
    CKey: "Carbon_Atoms",
    NKey: "Nitrogen_Atoms",
    OKey: "Oxygen_Atoms",
    PKey: "Phosphorus_Atoms",
    lenKey: "Length_bp",
    gcKey: "GC_Content_Percent",
    nameKey: "Gene_Name",
  });

  const charts = { ...(baseline?.charts || {}) };
  const tables = { ...(baseline?.tables || {}) };

  if (isTx) {
    // ===== Transcriptome-specific charts required by UI =====

    // Summary (KPIs)
    charts.summary = {
      gene_count: rows.length,
      avg_len: round(meanOfKey("Sequence_Length"), 3),
      avg_gc: round(meanOfKey("GC_content"), 3),
      avg_entropy: round(meanOfKey("Sequence_Entropy"), 4),
      avg_lz: round(meanOfKey("LZ_complexity"), 4),
      avg_at_skew: round(meanOfKey("AT_skew"), 4),
      avg_gc_skew: round(meanOfKey("GC_skew"), 4),
      avg_haca: round(meanOfKey("H_ACA_box_freq"), 6),
    };

    // Atom budget (totals + density)
    const totals = { C: 0, H: 0, O: 0, N: 0, P: 0 };
    let totalNt = 0;
    for (const r of rows) {
      totals.C += Number(r?.C_count) || 0;
      totals.H += Number(r?.H_count) || 0;
      totals.O += Number(r?.O_count) || 0;
      totals.N += Number(r?.N_count) || 0;
      totals.P += Number(r?.P_count) || 0;
      totalNt += Number(r?.Sequence_Length) || 0;
    }
    const density = {
      C: totalNt ? totals.C / totalNt : 0,
      H: totalNt ? totals.H / totalNt : 0,
      O: totalNt ? totals.O / totalNt : 0,
      N: totalNt ? totals.N / totalNt : 0,
      P: totalNt ? totals.P / totalNt : 0,
    };
    charts.atom_budget = {
      totals: {
        C: round(totals.C, 3),
        H: round(totals.H, 3),
        O: round(totals.O, 3),
        N: round(totals.N, 3),
        P: round(totals.P, 3),
      },
      density: {
        C: round(density.C, 8),
        H: round(density.H, 8),
        O: round(density.O, 8),
        N: round(density.N, 8),
        P: round(density.P, 8),
      },
    };

    // Core distributions
    const lengths = rows.map((r) => r?.Sequence_Length);
    const gcs = rows.map((r) => r?.GC_content);
    const ents = rows.map((r) => r?.Sequence_Entropy);
    const lzs = rows.map((r) => r?.LZ_complexity);
    const atSkews = rows.map((r) => r?.AT_skew);
    const gcSkews = rows.map((r) => r?.GC_skew);

    charts.length_histogram = histogram(lengths, { bins: 20, digits: 0 });
    charts.gc_histogram = histogram(gcs, { minV: 0, maxV: 100, bins: 20, digits: 1 });
    charts.entropy_histogram = histogram(ents, { bins: 18, digits: 2 });
    charts.lz_histogram = histogram(lzs, { bins: 18, digits: 2 });
    charts.at_skew_histogram = histogram(atSkews, { minV: -1, maxV: 1, bins: 20, digits: 2 });
    charts.gc_skew_histogram = histogram(gcSkews, { minV: -1, maxV: 1, bins: 20, digits: 2 });

    // Dinucleotide bias heatmaps
    charts.dinuc_freq_heatmap = dinucHeatmap("freq");
    charts.dinuc_bias_heatmap = dinucHeatmap("bias");

    // Scatter for BiasAnalysis (GC% vs GC_skew)
    charts.gc_skew_scatter = rows.slice(0, 1200).map((r) => [
      round(Number(r?.GC_content) || 0, 4),
      round(Number(r?.GC_skew) || 0, 4),
      String(r?.Gene_Name || ""),
    ]);

    // Motif histograms
    const haca = rows.map((r) => r?.H_ACA_box_freq);
    const cd = rows.map((r) => r?.C_D_box_freq);
    charts.haca_histogram = histogram(haca, { minV: 0, maxV: 0.12, bins: 16, digits: 4 });
    charts.cd_histogram = histogram(cd, { minV: 0, maxV: 0.12, bins: 16, digits: 4 });

    // Base spacing boxplot
    charts.spacing_boxplot = [
      fiveNumber(rows.map((r) => r?.A_avg_spacing)),
      fiveNumber(rows.map((r) => r?.T_avg_spacing)),
      fiveNumber(rows.map((r) => r?.C_avg_spacing)),
      fiveNumber(rows.map((r) => r?.G_avg_spacing)),
    ];

    // Correlation matrix (heatmap)
    const corrFields = [
      "Sequence_Length",
      "GC_content",
      "Sequence_Entropy",
      "LZ_complexity",
      "AT_skew",
      "GC_skew",
      "C_D_box_freq",
      "H_ACA_box_freq",
    ];
    charts.correlation_matrix = correlationMatrix(corrFields);

    // Table for ComplexityMotif
    const motifSorted = rows
      .slice()
      .sort((a, b) => (Number(b?.H_ACA_box_freq) || 0) - (Number(a?.H_ACA_box_freq) || 0));
    tables.top_motif = {
      rows: motifSorted.slice(0, 80),
    };

    return {
      raw_data_sample: rows,
      charts,
      tables,
    };
  }

  // ===== Genome: lightweight summary to avoid empty KPIs =====
  const gc = round(meanOfKey("GC_Content_Percent"), 3);
  const cn = round(meanOfKey("C_N_Ratio"), 4);
  const coding = rows.filter((r) => String(r?.Function_Category || "") !== "Non-coding").length;
  charts.summary = {
    gene_count: rows.length,
    coding_genes: coding,
    avg_gc: gc,
    avg_cn_ratio: cn,
  };

  return {
    raw_data_sample: rows,
    charts,
    tables,
  };
}

export function mockMultiScreening({ payload, seed = "MULTI" }) {
  const rng = makeRng(`${seed}:${JSON.stringify(payload || {})}`);

  const features = [
    "C:N Ratio", "GC%", "Nitrogen Atoms", "Phosphorus Atoms",
    "Oxygen Atoms", "Length", "Entropy", "LZ Complexity",
    "Dinuc bias", "Trinuc entropy", "Skewness", "Motif score",
  ];

  const feature_importance = features
    .map((name, i) => ({ name, score: round(clamp(1.0 - i * 0.07 + rng() * 0.05, 0.05, 1.0), 3) }))
    .sort((a, b) => b.score - a.score);

  const n = 800;
  const diff_monomers = [];
  for (let i = 0; i < n; i++) {
    const log2fc = round(randn(rng) * 1.15 + (rng() - 0.5) * 0.25, 3);
    const p = Math.pow(10, -(rng() * 5));
    diff_monomers.push({
      id: `M${String(i + 1).padStart(4, "0")}`,
      gene_name: `Feature_${String(i + 1).padStart(5, "0")}`,
      log2fc,
      p_value: Number(p.toExponential(2)),
      key_feature_val: round(2 + rng() * 12 + randn(rng) * 0.3, 3),
    });
  }

  const totalPts = 90;
  const pca_data = [];
  for (let i = 0; i < totalPts; i++) {
    const g = i < totalPts / 2 ? "A" : "B";
    const shift = g === "A" ? -1.2 : 1.2;
    pca_data.push({
      x: round(randn(rng) * 0.8 + shift, 3),
      y: round(randn(rng) * 0.7 + (g === "A" ? 0.3 : -0.3), 3),
      group: g,
    });
  }

  return { feature_importance, diff_monomers, pca_data };
}

export function mockGlobalStats(seed = "GLOBAL") {
  const rng = makeRng(seed);
  return {
    total_species: 220 + Math.floor(rng() * 80),
    genome_count: 120 + Math.floor(rng() * 60),
    transcriptome_count: 90 + Math.floor(rng() * 60),
    proteome_count: 110 + Math.floor(rng() * 70),
    gene_count: 1200000 + Math.floor(rng() * 800000),
    protein_count: 380000 + Math.floor(rng() * 200000),
    monomer_count: "1.5B+",
  };
}

export function mockPredictionResult(seed = "PREDICT") {
  const rng = makeRng(seed);

  const speciesPool = [
    "Escherichia coli", "Bacillus subtilis", "Pseudomonas aeruginosa", "Streptomyces coelicolor",
    "Saccharomyces cerevisiae", "Arabidopsis thaliana", "Homo sapiens", "Mus musculus",
    "Drosophila melanogaster", "Danio rerio", "Halobacterium salinarum", "Sulfolobus solfataricus",
  ];

  const logits = speciesPool.map(() => randn(rng) * 0.9);
  const probs = softmax(logits);

  const top = speciesPool
    .map((name, i) => ({ name, prob: probs[i] }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 10)
    .map((x) => ({ ...x, prob: round(x.prob, 4) }));

  const predicted = top[0];

  const traits = [
    "Aerobic potential", "Anaerobic potential", "Thermophily", "Halophily",
    "Pathogenicity", "Biofilm formation", "Motility", "GC-bias",
    "N-demand", "P-demand", "Stress resistance", "Metabolic breadth",
  ].map((t) => ({ trait: t, score: round(clamp(rng() * 0.9 + 0.05, 0, 1), 3) }));

  const shapFeatures = [
    "C:N Ratio", "N Atoms", "P Atoms", "O Atoms", "Length", "GC%",
    "Entropy", "LZ Complexity", "Skewness", "Dinuc bias",
  ];

  const shap = shapFeatures
    .map((f, i) => {
      const val = (randn(rng) * 0.18) + (i < 5 ? 0.10 : -0.02);
      return { feature: f, value: round(val, 4) };
    })
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const inputSummary = {
    protein_count: 2200 + Math.floor(rng() * 4800),
    avg_cn_ratio: round(2.8 + rng() * 4.2, 3),
    avg_gc: round(32 + rng() * 36, 2),
    notes: "Demo prediction result (auto-generated).",
  };

  return { predicted, top, traits, shap, inputSummary };
}
