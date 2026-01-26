// frontend/src/modules/analysis/transcriptome/useTranscriptomeDataset.js
// Batch 4:
// - Keep summary (charts/tables) derived-first.
// - Keep lazy rows loading.
// - Standardize numeric fields and provide fixed feature orders (dinuc/codon).
// - Expose contract/viz hints (bins/axis ranges) to ensure cross-species comparability.

import { ref, watch, computed } from "vue";
import { getSpeciesAnalysis, getObservedStats, getSampleRows } from "../../../api";
import { safeNum, DINUCS_ORDER } from "./transcriptomeUtils";

// Gene_features.csv template in this project tends to enumerate codons in a deterministic base order.
// We default to T,C,A,G (common in several bio feature tables) to keep a stable UI order.
// If your contract provides a codon_base_order, we will use it.
const DEFAULT_CODON_BASES = ["T", "C", "A", "G"];

function makeCodons(bases) {
  const out = [];
  for (const b1 of bases) for (const b2 of bases) for (const b3 of bases) out.push(`${b1}${b2}${b3}`);
  return out;
}

function getAny(obj, keys, dflt = undefined) {
  if (!obj) return dflt;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return dflt;
}

function buildVizFromContract(contract) {
  const axisRanges = contract?.recommended_axis_ranges || contract?.axis_ranges || {};
  const bins = contract?.recommended_bins || contract?.bins || {};
  const fingerprint = contract?.fingerprint || {};
  const codonBaseOrder = contract?.codon_base_order || null;
  return { axisRanges, bins, fingerprint, codonBaseOrder };
}

function normalizeRow(r0, { codons, dinucs } = {}) {
  const r = r0 || {};
  const out = { ...r };

  // Identity
  const name = getAny(r, ["Gene_Name", "gene_name", "gene", "id", "name"], "");
  out.Gene_Name = String(name || "");

  // Core numeric fields
  out.Sequence_Length = safeNum(getAny(r, ["Sequence_Length", "Length_bp", "seq_len", "length"], 0), 0);
  out.GC_content = safeNum(getAny(r, ["GC_content", "GC_Content_Percent", "gc"], 0), 0);

  // Base counts
  out.A_count = safeNum(getAny(r, ["A_count", "A_Count"], 0), 0);
  out.T_count = safeNum(getAny(r, ["T_count", "T_Count"], 0), 0);
  out.C_nucleotide_count = safeNum(getAny(r, ["C_nucleotide_count", "C_Count"], 0), 0);
  out.G_count = safeNum(getAny(r, ["G_count", "G_Count"], 0), 0);

  // Atom counts (gene_features.csv schema)
  out.C_count = safeNum(getAny(r, ["C_count", "Carbon_Atoms"], 0), 0);
  out.H_count = safeNum(getAny(r, ["H_count", "Hydrogen_Atoms"], 0), 0);
  out.O_count = safeNum(getAny(r, ["O_count", "Oxygen_Atoms"], 0), 0);
  out.N_count = safeNum(getAny(r, ["N_count", "Nitrogen_Atoms"], 0), 0);
  out.P_count = safeNum(getAny(r, ["P_count", "Phosphorus_Atoms"], 0), 0);

  // Complexity & skew
  out.Sequence_Entropy = safeNum(getAny(r, ["Sequence_Entropy"], 0), 0);
  out.LZ_complexity = safeNum(getAny(r, ["LZ_complexity"], 0), 0);
  out.AT_skew = safeNum(getAny(r, ["AT_skew"], 0), 0);
  out.GC_skew = safeNum(getAny(r, ["GC_skew"], 0), 0);

  // Motifs
  out.C_D_box_freq = safeNum(getAny(r, ["C_D_box_freq"], 0), 0);
  out.H_ACA_box_freq = safeNum(getAny(r, ["H_ACA_box_freq"], 0), 0);

  // Spacing
  out.A_avg_spacing = safeNum(getAny(r, ["A_avg_spacing"], 0), 0);
  out.T_avg_spacing = safeNum(getAny(r, ["T_avg_spacing"], 0), 0);
  out.C_avg_spacing = safeNum(getAny(r, ["C_avg_spacing"], 0), 0);
  out.G_avg_spacing = safeNum(getAny(r, ["G_avg_spacing"], 0), 0);

  // Dinucleotide frequency + bias
  for (const di of dinucs || DINUCS_ORDER) {
    const freqKey = `${di}_freq`;
    if (r[freqKey] !== undefined) {
      out[freqKey] = safeNum(r[freqKey], 0);
    } else {
      const genPct = r[`Dinuc_${di}_Proportion`];
      out[freqKey] = genPct === undefined ? 0 : safeNum(genPct, 0) / 100;
    }

    const biasKey = `${di}_bias`;
    out[biasKey] = safeNum(getAny(r, [biasKey], 0), 0);
  }

  // Codon frequency
  for (const codon of codons || []) {
    const k = `${codon}_freq`;
    if (r[k] !== undefined) {
      out[k] = safeNum(r[k], 0);
    } else {
      const genPct = r[`Codon_${codon}_Proportion`];
      out[k] = genPct === undefined ? 0 : safeNum(genPct, 0) / 100;
    }
  }

  return out;
}

export function useTranscriptomeDataset(sampleIdRef, activeRef) {
  const summaryLoading = ref(false);
  const rowsLoading = ref(false);

  const speciesInfo = ref(null);

  // New-contract aware
  const meta = ref({});
  const contract = ref(null);
  const viz = ref({ axisRanges: {}, bins: {}, fingerprint: {}, codonBaseOrder: null });
  const derived = ref({});

  // Legacy (kept for compatibility with existing UI code)
  const charts = ref({});
  const tables = ref({});
  const observed = ref({});

  const rows = ref([]);
  const pagination = ref({ total: 0, offset: 0, limit: 0 });

  // Fixed feature orders for consistent cross-sample compare.
  const dinucFreqKeys = computed(() => (DINUCS_ORDER || []).map((di) => `${di}_freq`));
  const dinucBiasKeys = computed(() => (DINUCS_ORDER || []).map((di) => `${di}_bias`));

  const codonBases = computed(() => {
    const bases = viz.value?.codonBaseOrder;
    if (Array.isArray(bases) && bases.length === 4) return bases;
    return DEFAULT_CODON_BASES;
  });

  const codons = computed(() => makeCodons(codonBases.value));
  const codonFreqKeys = computed(() => codons.value.map((c) => `${c}_freq`));

  async function fetchSummary() {
    if (!sampleIdRef.value) return;
    summaryLoading.value = true;
    try {
      const [analysis, obs] = await Promise.all([
        getSpeciesAnalysis(sampleIdRef.value, {
          omics: "TRANSCRIPTOME",
          include_raw: 0,
          include_charts: 1,
          include_tables: 1,
        }),
        getObservedStats(sampleIdRef.value, { omics: "TRANSCRIPTOME" }),
      ]);

      // New contract fields
      meta.value = analysis?.meta || meta.value || {};
      contract.value = analysis?.meta?.contract || meta.value?.contract || contract.value;
      derived.value = analysis?.derived || derived.value || {};
      viz.value = buildVizFromContract(contract.value || {});

      // Keep legacy fields for modules that still read them
      speciesInfo.value = analysis?.species_info || obs?.species_info || meta.value?.species_info || speciesInfo.value;
      charts.value = analysis?.charts || {};
      tables.value = analysis?.tables || {};
      observed.value = obs?.observed || {};
    } finally {
      summaryLoading.value = false;
    }
  }

  async function ensureRows({ limit = 5000, offset = 0, fields = "", sort_by = "", sort_dir = "", filter = "" } = {}) {
    if (!sampleIdRef.value) return;

    // If we already have the first page and it covers total, do not refetch.
    if (rows.value.length > 0 && pagination.value?.offset === 0 && pagination.value?.total <= rows.value.length) {
      return;
    }

    rowsLoading.value = true;
    try {
      const res = await getSampleRows(sampleIdRef.value, {
        omics: "TRANSCRIPTOME",
        limit,
        offset,
        fields,
        sort_by,
        sort_dir,
        filter,
      });

      // Prefer new meta but keep existing fallback
      meta.value = res?.meta || meta.value || {};
      contract.value = res?.meta?.contract || contract.value;
      if (contract.value) {
        viz.value = buildVizFromContract(contract.value);
      }

      speciesInfo.value = res?.species_info || meta.value?.species_info || speciesInfo.value;
      pagination.value = res?.pagination || meta.value?.pagination || { total: 0, offset, limit };

      const raw = Array.isArray(res?.rows) ? res.rows : (Array.isArray(res?.data?.rows) ? res.data.rows : []);
      rows.value = raw.map((r) => normalizeRow(r, { codons: codons.value, dinucs: DINUCS_ORDER }));

      // Expose helpful meta to downstream consumers without adding a separate store.
      // (Components can optionally read these if needed.)
      const m = meta.value || {};
      for (const rr of rows.value) {
        rr.__meta = m;
        rr.__contract = contract.value;
        rr.__viz = viz.value;
      }
    } finally {
      rowsLoading.value = false;
    }
  }

  async function reload() {
    charts.value = {};
    tables.value = {};
    observed.value = {};
    derived.value = {};
    rows.value = [];
    pagination.value = { total: 0, offset: 0, limit: 0 };
    await fetchSummary();
  }

  const hasLoadedOnce = ref(false);
  watch(
    () => activeRef.value,
    async (v) => {
      if (v && !hasLoadedOnce.value) {
        hasLoadedOnce.value = true;
        await fetchSummary();
      }
    },
    { immediate: true }
  );

  watch(
    () => sampleIdRef.value,
    async () => {
      if (activeRef.value && hasLoadedOnce.value) {
        await reload();
      }
    }
  );

  const summary = computed(() => charts.value?.summary || derived.value?.summary || {});

  return {
    summaryLoading,
    rowsLoading,

    speciesInfo,

    // New contract-aware
    meta,
    contract,
    viz,
    derived,

    // Legacy
    charts,
    tables,
    observed,

    // Rows
    rows,
    pagination,
    summary,

    // Feature orders (for fingerprint/PCA)
    dinucFreqKeys,
    dinucBiasKeys,
    codonFreqKeys,

    // Actions
    reload,
    fetchSummary,
    ensureRows,
  };
}
