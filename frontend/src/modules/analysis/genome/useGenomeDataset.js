// frontend/src/modules/analysis/genome/useGenomeDataset.js
// Showcase patch (front-end only):
// - Provide a stable, deterministic dataset even without any backend.
// - Preserve the public return shape so legacy panels won't break.

import { ref, watch, computed } from "vue";
import { ensureGenomeRows, resolveSeed, safeNum } from "./genomeUtils";

function computeObserved(rows) {
  const rs = rows || [];
  const n = rs.length || 1;

  const avg = (key) => rs.reduce((s, r) => s + safeNum(r?.[key], 0), 0) / n;

  return {
    n_rows: rs.length,
    mean_length_bp: avg("Length_bp"),
    mean_gc_percent: avg("GC_Content_Percent"),
    mean_n_atoms: avg("Nitrogen_Atoms"),
    mean_p_atoms: avg("Phosphorus_Atoms"),
    mean_np_ratio: avg("N_P_Ratio"),
  };
}

export function useGenomeDataset(sampleIdRef, activeRef) {
  const summaryLoading = ref(false);
  const rowsLoading = ref(false);
  const loaded = ref(false);

  const loading = computed(() => summaryLoading.value || rowsLoading.value);

  const speciesInfo = ref(null);
  const contract = ref({
    version: "showcase",
    recommended_bins: {
      length_bp: 34,
      gc: 30,
    },
    recommended_axis_ranges: {
      gc: [20, 80],
    },
    fingerprint: {
      genome: {
        codon: [],
        aa: [],
        dinuc: [],
      },
    },
  });

  const viz = ref({ bins: {}, axis: {}, fingerprint: { codon: [], aa: [], dinuc: [] } });

  const charts = ref({});
  const tables = ref({});
  const observed = ref({});
  const genomeDerived = ref({});

  const rows = ref([]);
  const pagination = ref({ total: 0, offset: 0, limit: 0 });

  const seedBump = ref(0);

  function seedBase() {
    // Deterministic by sample id, but stable even if sampleId is empty.
    const sid = sampleIdRef?.value ? String(sampleIdRef.value) : "NA";
    return resolveSeed(`GENOME_DATASET::${sid}`, seedBump.value);
  }

  async function fetchSummary() {
    summaryLoading.value = true;
    try {
      const sid = sampleIdRef?.value ? String(sampleIdRef.value) : "NA";
      speciesInfo.value = {
        sample_id: sid,
        omics: "GENOME",
        source: "showcase_random",
        updated_at: new Date().toISOString(),
      };

      // Populate viz helpers (fingerprint keys will be inferred by components from row keys)
      viz.value = {
        bins: contract.value?.recommended_bins || {},
        axis: contract.value?.recommended_axis_ranges || {},
        fingerprint: { codon: [], aa: [], dinuc: [] },
      };

      charts.value = {};
      tables.value = {};
      genomeDerived.value = {
        source: "showcase",
      };
    } finally {
      summaryLoading.value = false;
    }
  }

  async function ensureRows({ limit = 5000, offset = 0, fields = "", sort_by = "", sort_dir = "", filter = "" } = {}) {
    rowsLoading.value = true;
    try {
      const { rows: genRows } = ensureGenomeRows({
        seed: seedBase(),
        n: 2200,
        seedBump: 0,
        suffix: "ROWS",
      });

      const total = genRows.length;
      const start = Math.max(0, Number(offset) || 0);
      const end = Math.min(total, start + (Number(limit) || total));

      let sliced = genRows.slice(start, end);
      if (filter && typeof filter === "object") {
        sliced = sliced.filter((r) =>
          Object.entries(filter).every(([k, v]) => {
            const val = r?.[k];
            if (v && typeof v === "object") {
              const min = Number(v.min ?? -Infinity);
              const max = Number(v.max ?? Infinity);
              const n = Number(val);
              return n >= min && n <= max;
            }
            if (Array.isArray(v)) return v.includes(val);
            if (typeof v === "string") return String(val || "").includes(v);
            return val === v;
          })
        );
      }

      if (fields) {
        const wanted = Array.isArray(fields) ? fields : String(fields).split(",").map((f) => f.trim()).filter(Boolean);
        if (wanted.length) {
          sliced = sliced.map((r) => {
            const out = {};
            for (const k of wanted) out[k] = r?.[k];
            return out;
          });
        }
      }

      if (sort_by) {
        const dir = String(sort_dir || "asc").toLowerCase();
        sliced = sliced.slice().sort((a, b) => {
          const av = a?.[sort_by];
          const bv = b?.[sort_by];
          if (av === bv) return 0;
          if (dir === "desc") return av > bv ? -1 : 1;
          return av > bv ? 1 : -1;
        });
      }

      rows.value = sliced;
      pagination.value = { total, offset: start, limit: end - start };

      observed.value = computeObserved(genRows);
      loaded.value = true;
    } finally {
      rowsLoading.value = false;
    }
  }

  async function reload() {
    charts.value = {};
    tables.value = {};
    observed.value = {};
    genomeDerived.value = {};
    rows.value = [];
    pagination.value = { total: 0, offset: 0, limit: 0 };
    loaded.value = false;

    await fetchSummary();
    await ensureRows({ limit: 5000, offset: 0 });
  }

  const hasLoadedOnce = ref(false);
  watch(
    () => activeRef?.value,
    async (v) => {
      if (v && !hasLoadedOnce.value) {
        hasLoadedOnce.value = true;
        await reload();
      }
    },
    { immediate: true }
  );

  watch(
    () => sampleIdRef?.value,
    async () => {
      if (activeRef?.value && hasLoadedOnce.value) {
        // change seed on sample switch
        seedBump.value += 1;
        await reload();
      }
    }
  );

  const categories = computed(() => {
    const s = new Set();
    for (const r of rows.value || []) s.add(String(r.Function_Category || "other"));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  });

  return {
    // Backward compatible
    loading,
    loaded,
    rows,
    categories,
    reload,

    // Expose fields used by existing UI
    summaryLoading,
    rowsLoading,
    speciesInfo,
    contract,
    viz,
    charts,
    tables,
    observed,
    genomeDerived,
    pagination,
    fetchSummary,
    ensureRows,
  };
}
