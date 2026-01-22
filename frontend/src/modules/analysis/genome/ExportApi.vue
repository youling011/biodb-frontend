<template>
  <div class="wrap">
    <el-card>
      <div class="hdr">
        <div class="left">
          <span>Export & API</span>
          <el-tag effect="plain" type="info">showcase</el-tag>
        </div>
        <div class="actions">
          <el-button icon="Refresh" @click="regenerate">Re-generate</el-button>
          <el-button type="primary" icon="Download" @click="exportCore">Export Core CSV</el-button>
          <el-button icon="Download" @click="exportPreview">Export Preview CSV</el-button>
          <el-button icon="Download" @click="exportAll">Export Full CSV</el-button>
        </div>
      </div>

      <el-divider />

      <el-descriptions :column="2" border>
        <el-descriptions-item label="Rows">{{ localRows.length }}</el-descriptions-item>
        <el-descriptions-item label="Mode">Front-end Showcase (no backend required)</el-descriptions-item>
        <el-descriptions-item label="Schema Note" :span="2">
          This tab exports the same in-memory dataset used by the Genome module. It also provides a preview table
          with dynamically generated columns.
        </el-descriptions-item>
      </el-descriptions>

      <el-divider content-position="left">Quick Visual Checks</el-divider>

      <el-row :gutter="16">
        <el-col :span="8">
          <el-card shadow="never">
            <template #header>
              <div class="subhdr">
                <span>Length (bp)</span>
                <el-button text @click="exportChart(lenRef, 'genome_length_hist.png')">Export PNG</el-button>
              </div>
            </template>
            <EChart ref="lenRef" :option="lengthHistOption" height="260px" />
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card shadow="never">
            <template #header>
              <div class="subhdr">
                <span>GC% (gene body)</span>
                <el-button text @click="exportChart(gcRef, 'genome_gc_hist.png')">Export PNG</el-button>
              </div>
            </template>
            <EChart ref="gcRef" :option="gcHistOption" height="260px" />
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card shadow="never">
            <template #header>
              <div class="subhdr">
                <span>Category Counts</span>
                <el-button text @click="exportChart(catRef, 'genome_category_counts.png')">Export PNG</el-button>
              </div>
            </template>
            <EChart ref="catRef" :option="categoryBarOption" height="260px" />
          </el-card>
        </el-col>
      </el-row>

      <el-divider content-position="left">Preview Table (dynamic schema)</el-divider>
      <div class="note">
        For readability, this preview shows a selected subset of fields. Use “Export Full CSV” to export the entire wide table.
      </div>

      <el-table :data="previewRows" stripe height="440">
        <el-table-column
          v-for="c in previewColumns"
          :key="c.key"
          :prop="c.key"
          :label="c.label"
          :width="c.width"
          :sortable="c.sortable"
          :fixed="c.fixed"
        />
      </el-table>

      <el-divider content-position="left">Field Groups</el-divider>
      <el-table :data="fieldGroups" stripe>
        <el-table-column prop="group" label="Group" width="220" />
        <el-table-column prop="examples" label="Example Fields" />
        <el-table-column prop="usage" label="Recommended Usage" width="320" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import EChart from "../../../components/EChart.vue";
import { exportObjectsToCsv } from "../../../utils/exportCsv";
import { buildBarOption, buildHistOption } from "../shared/echartsKit";
import { buildTableColumns, hashStringToUint32, makeGenomeRows, round } from "../../../api/showcaseAdapter";
import { histogram, safeNum } from "./genomeUtils";

const props = defineProps({
  // Preferred: parent passes stable rows (for cross-tab consistency)
  rows: { type: Array, default: () => [] },

  // Optional: allow deterministic self-generation when used standalone
  seed: { type: [String, Number], default: "GENOME_EXPORT" },
  seedBump: { type: Number, default: 0 },
});

const localRows = ref([]);

function resolveSeed() {
  const base = typeof props.seed === "number" ? (props.seed >>> 0) : hashStringToUint32(String(props.seed));
  return (base + (props.seedBump >>> 0)) >>> 0;
}

function regenerate() {
  if (props.rows && props.rows.length) {
    localRows.value = props.rows;
    return;
  }
  localRows.value = makeGenomeRows({ seed: resolveSeed(), n: 2200 });
}

defineExpose({ regenerate });

onMounted(regenerate);
watch(() => [props.seed, props.seedBump, props.rows], regenerate);

// --- Export helpers --------------------------------------------------------

const coreCols = [
  "Gene_Name",
  "Function_Category",
  "Strand",
  "Length_bp",
  "GC_Content_Percent",
  "Carbon_Atoms",
  "Hydrogen_Atoms",
  "Oxygen_Atoms",
  "Nitrogen_Atoms",
  "Phosphorus_Atoms",
  "A_Count",
  "T_Count",
  "C_Count",
  "G_Count",
  "C_N_Ratio",
  "C_P_Ratio",
  "N_P_Ratio",
  "Protein_N_Atoms",
  "Promoter_GC_Content",
  "Intergenic_Length_bp",
  "Intergenic_GC_Content",
];

function exportCore() {
  const rows = localRows.value || [];
  exportObjectsToCsv(
    "genome_core_features.csv",
    rows,
    coreCols.map((k) => ({ key: k, label: k }))
  );
}

function exportPreview() {
  const rows = previewRows.value || [];
  exportObjectsToCsv(
    "genome_preview_features.csv",
    rows,
    previewColumns.value.map((c) => ({ key: c.key, label: c.label }))
  );
}

function exportAll() {
  const rows = localRows.value || [];
  const keys = Object.keys(rows[0] || {});
  exportObjectsToCsv(
    "genome_full_features.csv",
    rows,
    keys.map((k) => ({ key: k, label: k }))
  );
}

// --- Charts ---------------------------------------------------------------

const lenRef = ref(null);
const gcRef = ref(null);
const catRef = ref(null);

function exportChart(chartRef, filename) {
  const inst = chartRef?.value?.getInstance?.() || chartRef?.value?.chart;
  if (!inst) return;
  const url = inst.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#ffffff" });
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const lengthHistOption = computed(() => {
  const vals = (localRows.value || []).map((r) => safeNum(r.Length_bp, NaN)).filter((x) => Number.isFinite(x));
  const { edges, counts } = histogram(vals, { bins: 34 });
  return buildHistOption(
    { edges: edges.map((x) => round(x, 0)), counts },
    { xName: "Length", xUnit: "bp", yName: "Count", toolbox: true, dataZoom: false }
  );
});

const gcHistOption = computed(() => {
  const vals = (localRows.value || []).map((r) => safeNum(r.GC_Content_Percent, NaN)).filter((x) => Number.isFinite(x));
  const { edges, counts } = histogram(vals, { bins: 30, min: 20, max: 80 });
  return buildHistOption(
    { edges: edges.map((x) => round(x, 1)), counts },
    { xName: "GC", xUnit: "%", yName: "Count", toolbox: true, dataZoom: false }
  );
});

const categoryBarOption = computed(() => {
  const m = new Map();
  for (const r of localRows.value || []) {
    const c = String(r.Function_Category || "other");
    m.set(c, (m.get(c) || 0) + 1);
  }
  const categories = Array.from(m.keys()).sort((a, b) => a.localeCompare(b));
  const values = categories.map((c) => m.get(c) || 0);
  return buildBarOption(
    { categories, values },
    { xName: "Function Category", yName: "Genes", rotate: categories.length > 10 ? 45 : 0, dataZoom: true, toolbox: true }
  );
});

// --- Preview table (dynamic schema) ---------------------------------------

const previewKeys = [
  "Gene_Name",
  "Function_Category",
  "Length_bp",
  "GC_Content_Percent",
  "Nitrogen_Atoms",
  "Phosphorus_Atoms",
  "N_P_Ratio",
  "Promoter_GC_Content",
  "Intergenic_Length_bp",
  "Protein_N_Atoms",
];

const previewColumns = computed(() =>
  buildTableColumns(previewKeys, {
    labelMap: {
      Gene_Name: "Gene",
      Function_Category: "Category",
      Length_bp: "Length(bp)",
      GC_Content_Percent: "GC%",
      Nitrogen_Atoms: "N atoms",
      Phosphorus_Atoms: "P atoms",
      N_P_Ratio: "N:P",
      Promoter_GC_Content: "Promoter GC%",
      Intergenic_Length_bp: "Intergenic(bp)",
      Protein_N_Atoms: "Protein N",
    },
    widthMap: {
      Gene_Name: 170,
      Function_Category: 150,
      Length_bp: 110,
      GC_Content_Percent: 90,
      Nitrogen_Atoms: 110,
      Phosphorus_Atoms: 110,
      N_P_Ratio: 90,
      Promoter_GC_Content: 110,
      Intergenic_Length_bp: 120,
      Protein_N_Atoms: 110,
    },
    sortable: true,
    fixedFirst: true,
  })
);

const previewRows = computed(() => {
  const rs = localRows.value || [];
  return rs.slice(0, 120).map((r) => {
    const out = {};
    for (const k of previewKeys) out[k] = r?.[k];
    // Make a couple numeric values look tidy
    if (out.GC_Content_Percent !== undefined) out.GC_Content_Percent = round(safeNum(out.GC_Content_Percent, 0), 2);
    if (out.N_P_Ratio !== undefined) out.N_P_Ratio = round(safeNum(out.N_P_Ratio, 0), 3);
    if (out.Promoter_GC_Content !== undefined) out.Promoter_GC_Content = round(safeNum(out.Promoter_GC_Content, 0), 2);
    return out;
  });
});

// --- Field groups ---------------------------------------------------------

const fieldGroups = computed(() => [
  {
    group: "DNA atoms & base counts",
    examples: "Carbon_Atoms / Nitrogen_Atoms / A_Count / ... / Phosphorus_Atoms",
    usage: "Budget, densities (N/bp), ratio distributions",
  },
  {
    group: "Protein atoms",
    examples: "Protein_C_Atoms / Protein_N_Atoms / ...",
    usage: "Coding vs non-coding, protein cost profiling",
  },
  {
    group: "Codon proportions (64)",
    examples: "Codon_AAA_Proportion ... Codon_GGG_Proportion",
    usage: "Codon usage fingerprint, embedding & clustering",
  },
  {
    group: "AA proportions (20)",
    examples: "AA_A_Proportion ... AA_V_Proportion",
    usage: "Protein composition fingerprint, trait prediction input",
  },
  {
    group: "Dinucleotide proportions (16)",
    examples: "Dinuc_AA_Proportion ... Dinuc_GG_Proportion",
    usage: "Sequence bias matrix, promoter/intergenic bias",
  },
  {
    group: "Promoter / Intergenic",
    examples: "Promoter_* / Intergenic_*",
    usage: "Regulatory context: promoter-vs-gene, intergenic structure",
  },
  {
    group: "Category averages",
    examples: "Category_Avg_C_Atoms ... Category_Avg_P_Atoms",
    usage: "Deviation analysis: gene vs category baseline",
  },
]);
</script>

<style scoped>
.wrap { padding: 4px; }
.hdr { display:flex; justify-content: space-between; align-items:center; font-weight: 800; gap: 10px; flex-wrap: wrap; }
.left { display:flex; align-items:center; gap: 8px; }
.actions { display:flex; gap: 8px; flex-wrap: wrap; }
.subhdr { display:flex; justify-content: space-between; align-items:center; }
.note { margin: 8px 0 10px; color: #666; font-size: 12px; }
</style>
