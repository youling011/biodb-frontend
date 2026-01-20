<template>
  <el-card>
    <div class="hdr">
      <span>Export & API</span>
      <div class="actions">
        <el-button type="primary" @click="exportCore">Export Core CSV</el-button>
        <el-button @click="exportAll">Export Full CSV</el-button>
      </div>
    </div>

    <el-divider />

    <el-descriptions :column="1" border>
      <el-descriptions-item label="Rows">{{ rows.length }}</el-descriptions-item>
      <el-descriptions-item label="Mode">
        Showcase mode (front-end synthetic rows). Each refresh regenerates deterministically using (seed, seedBump).
      </el-descriptions-item>
    </el-descriptions>

    <el-divider content-position="left">Field Groups</el-divider>

    <el-table :data="fieldGroups" stripe>
      <el-table-column prop="group" label="Group" width="220" />
      <el-table-column prop="examples" label="Example Fields" />
      <el-table-column prop="usage" label="Recommended Usage" width="360" />
    </el-table>

    <el-divider content-position="left">Preview</el-divider>

    <el-table :data="previewRows" stripe height="420">
      <el-table-column
        v-for="c in previewColumns"
        :key="c.key"
        :prop="c.key"
        :label="c.label"
        :width="c.width"
        :min-width="c.minWidth"
        :fixed="c.fixed"
      />
    </el-table>
  </el-card>
</template>

<script setup>
import { computed } from "vue";
import { exportObjectsToCsv } from "../../../utils/exportCsv";
import { makeTranscriptomeRows } from "../shared/showcaseKit";

const props = defineProps({
  seed: { type: String, default: "TX:demo" },
  seedBump: { type: Number, default: 0 },
});

// Self-generated dataset for this tab.
const rows = computed(() =>
  makeTranscriptomeRows({ seed: `${props.seed}:${props.seedBump}:export`, n: 2200 })
);

const coreCols = [
  "Gene_Name",
  "Sequence_Length",
  "GC_content",
  "C_count",
  "H_count",
  "O_count",
  "N_count",
  "P_count",
  "Sequence_Entropy",
  "LZ_complexity",
  "AT_skew",
  "GC_skew",
  "C_D_box_freq",
  "H_ACA_box_freq",
  "A_avg_spacing",
  "T_avg_spacing",
  "C_avg_spacing",
  "G_avg_spacing",
];

function exportCore() {
  exportObjectsToCsv(
    "transcriptome_core_features.csv",
    rows.value || [],
    coreCols.map((k) => ({ key: k, label: k }))
  );
}

function exportAll() {
  const rs = rows.value || [];
  const keys = Object.keys(rs[0] || {});
  exportObjectsToCsv(
    "transcriptome_full_features.csv",
    rs,
    keys.map((k) => ({ key: k, label: k }))
  );
}

const fieldGroups = computed(() => [
  {
    group: "Atoms",
    examples: "C_count/H_count/O_count/N_count/P_count",
    usage: "Budget, density, stoichiometric ratios; comparative and outlier analysis",
  },
  {
    group: "Complexity",
    examples: "Sequence_Entropy, LZ_complexity",
    usage: "Low-complexity detection, structural signal candidates, filtering",
  },
  {
    group: "Skew",
    examples: "AT_skew, GC_skew",
    usage: "Bias analytics; later link to strand/replication/annotation",
  },
  {
    group: "Dinucleotide",
    examples: "AA_freq..GG_freq; AA_bias..GG_bias",
    usage: "4×4 heatmap, fingerprinting, cross-sample comparison",
  },
  {
    group: "Codon-like (64D)",
    examples: "TTT_freq..GGG_freq (64 keys)",
    usage: "Embedding (PCA/UMAP), clustering, compositional signatures",
  },
  {
    group: "Motif/spacing",
    examples: "C_D_box_freq, H_ACA_box_freq; A_avg_spacing..G_avg_spacing",
    usage: "Signal page, motif outliers, periodicity hints",
  },
]);

const previewRows = computed(() => (rows.value || []).slice(0, 40));

const previewColumns = computed(() => {
  // Prefer a concise, readable preview: core columns + a few dinuc/codon fields.
  const rs = rows.value || [];
  const keys = Object.keys(rs[0] || {});
  const extra = keys
    .filter((k) => /^(AA|AT|AC|AG|TA|TT|TC|TG|CA|CT|CC|CG|GA|GT|GC|GG)_(freq|bias)$/.test(k))
    .slice(0, 6)
    .concat(keys.filter((k) => /^[ATCG]{3}_freq$/.test(k)).slice(0, 6));

  const cols = [...new Set([...coreCols, ...extra])].slice(0, 18);
  const widthFor = (k) => {
    if (k === "Gene_Name") return 160;
    if (k === "Sequence_Length") return 120;
    if (k === "GC_content") return 100;
    if (k.endsWith("_count")) return 110;
    if (k.endsWith("_freq") || k.endsWith("_bias")) return 110;
    return 110;
  };

  return cols.map((k, idx) => ({
    key: k,
    label: k,
    width: widthFor(k),
    minWidth: 110,
    fixed: idx === 0 ? "left" : undefined,
  }));
});
</script>

<style scoped>
.hdr {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 800;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
