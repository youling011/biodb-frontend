<template>
  <div>
    <el-card>
      <div class="toolbar">
        <el-input v-model="kw" clearable placeholder="Search gene name..." style="width: 260px">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>

        <el-select v-model="cat" clearable placeholder="Function Category" style="width: 220px">
          <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
        </el-select>

        <el-switch v-model="codingOnly" active-text="Coding only" />

        <el-select v-model="columnKeys" multiple collapse-tags collapse-tags-tooltip placeholder="Columns" style="min-width: 320px">
          <el-option v-for="k in allColumnKeys" :key="k" :label="columnLabel(k)" :value="k" />
        </el-select>

        <el-button type="primary" @click="exportPageCsv" style="margin-left:auto">
          Export Current Page CSV
        </el-button>
      </div>

      <el-table :data="pageRows" stripe height="520" @row-click="openRow">
        <el-table-column
          v-for="c in tableColumns"
          :key="c.key"
          :prop="c.key"
          :label="c.label"
          :width="c.width"
          :sortable="c.sortable"
          :fixed="c.fixed"
        />
      </el-table>

      <div class="pager">
        <el-pagination
          background
          layout="prev, pager, next, jumper, ->, total"
          :total="filtered.length"
          :page-size="pageSize"
          v-model:current-page="page"
        />
      </div>
    </el-card>

    <el-drawer v-model="drawer" :title="drawerTitle" size="44%">
      <div v-if="picked" class="drawer-body">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="Gene">{{ picked.Gene_Name }}</el-descriptions-item>
          <el-descriptions-item label="Category">{{ picked.Function_Category }}</el-descriptions-item>
          <el-descriptions-item label="Strand">{{ picked.Strand }}</el-descriptions-item>
          <el-descriptions-item label="Length(bp)">{{ picked.Length_bp }}</el-descriptions-item>
          <el-descriptions-item label="GC(%)">{{ picked.GC_Content_Percent }}</el-descriptions-item>
          <el-descriptions-item label="C:N">{{ picked.C_N_Ratio }}</el-descriptions-item>
          <el-descriptions-item label="N:P">{{ picked.N_P_Ratio }}</el-descriptions-item>
        </el-descriptions>

        <el-row :gutter="12" style="margin-top: 12px;">
          <el-col :span="12">
            <el-card shadow="never">
              <template #header><div class="hdr"><span>Codon Composition (Top 12)</span></div></template>
              <EChart :option="codonOption" height="260px" />
            </el-card>
          </el-col>

          <el-col :span="12">
            <el-card shadow="never">
              <template #header><div class="hdr"><span>AA Composition (Top 12)</span></div></template>
              <EChart :option="aaOption" height="260px" />
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="12" style="margin-top: 12px;">
          <el-col :span="24">
            <el-card shadow="never">
              <template #header><div class="hdr"><span>Dinucleotide 4×4 Heatmap</span></div></template>
              <EChart :option="dinucOption" height="320px" />
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="12" style="margin-top: 12px;">
          <el-col :span="24">
            <el-card shadow="never">
              <template #header><div class="hdr"><span>Regulatory Context Snapshot</span></div></template>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="Promoter GC%">{{ picked.Promoter_GC_Content }}</el-descriptions-item>
                <el-descriptions-item label="Intergenic Len(bp)">{{ picked.Intergenic_Length_bp }}</el-descriptions-item>
                <el-descriptions-item label="Intergenic GC%">{{ picked.Intergenic_GC_Content }}</el-descriptions-item>
                <el-descriptions-item label="Promoter N Atoms">{{ picked.Promoter_N_Atoms }}</el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import EChart from "../../../components/EChart.vue";
import { exportObjectsToCsv } from "../../../utils/exportCsv";
import { buildBarOption, buildHeatmapOption } from "../shared/echartsKit";
import { buildTableColumns, hashStringToUint32, makeGenomeRows, round } from "../shared/showcaseKit";

// Showcase-first tab: self-generates data + options + table schema.
// Backward compatible with parent passing rows/categories, but unused by default.
const props = defineProps({
  seed: { type: [String, Number], default: "GENOME_EXPLORER" },
  seedBump: { type: Number, default: 0 },
  rows: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
  derivedCharts: { type: Object, default: () => ({}) },
  derivedTables: { type: Object, default: () => ({}) },
});

const localRows = ref([]);

function resolveSeed() {
  const base = (typeof props.seed === "number") ? (props.seed >>> 0) : hashStringToUint32(String(props.seed));
  return (base + (props.seedBump >>> 0)) >>> 0;
}

function regenerate() {
  localRows.value = makeGenomeRows({ seed: resolveSeed(), n: 2100 });
}

defineExpose({ regenerate });
onMounted(regenerate);
watch(() => [props.seed, props.seedBump], regenerate);

// --- Filters / pagination ---------------------------------------------------

const kw = ref("");
const cat = ref("");
const codingOnly = ref(false);

const page = ref(1);
const pageSize = 50;

const categories = computed(() => {
  const s = new Set(localRows.value.map((r) => String(r.Function_Category || "Unknown")));
  const arr = Array.from(s).sort((a, b) => a.localeCompare(b));
  const idx = arr.indexOf("none");
  if (idx >= 0) {
    arr.splice(idx, 1);
    arr.push("none");
  }
  return arr;
});

const filtered = computed(() => {
  const k = kw.value.trim().toLowerCase();
  return (localRows.value || [])
    .filter((r) => (k ? String(r.Gene_Name || "").toLowerCase().includes(k) : true))
    .filter((r) => (cat.value ? String(r.Function_Category || "") === cat.value : true))
    .filter((r) => (codingOnly.value ? String(r.Function_Category || "") !== "none" : true));
});

watch([kw, cat, codingOnly], () => {
  page.value = 1;
});

const pageRows = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filtered.value.slice(start, start + pageSize);
});

// --- Dynamic columns --------------------------------------------------------

const allColumnKeys = [
  "Gene_Name",
  "Function_Category",
  "Strand",
  "Length_bp",
  "GC_Content_Percent",
  "C_N_Ratio",
  "N_P_Ratio",
  "Nitrogen_Atoms",
  "Promoter_GC_Content",
  "Intergenic_Length_bp",
  "Intergenic_GC_Content",
  "Promoter_N_Atoms",
];

const labelMap = {
  Gene_Name: "Gene",
  Function_Category: "Category",
  Strand: "Strand",
  Length_bp: "Length",
  GC_Content_Percent: "GC%",
  C_N_Ratio: "C:N",
  N_P_Ratio: "N:P",
  Nitrogen_Atoms: "N Atoms",
  Promoter_GC_Content: "Promoter GC%",
  Intergenic_Length_bp: "Intergenic Len",
  Intergenic_GC_Content: "Intergenic GC%",
  Promoter_N_Atoms: "Promoter N",
};

const widthMap = {
  Gene_Name: 170,
  Function_Category: 150,
  Strand: 90,
  Length_bp: 110,
  GC_Content_Percent: 110,
  C_N_Ratio: 110,
  N_P_Ratio: 110,
  Nitrogen_Atoms: 120,
  Promoter_GC_Content: 140,
  Intergenic_Length_bp: 140,
  Intergenic_GC_Content: 140,
  Promoter_N_Atoms: 130,
};

function columnLabel(k) {
  return labelMap[k] || k;
}

const columnKeys = ref([
  "Gene_Name",
  "Function_Category",
  "Length_bp",
  "GC_Content_Percent",
  "C_N_Ratio",
  "N_P_Ratio",
  "Nitrogen_Atoms",
  "Promoter_GC_Content",
  "Intergenic_Length_bp",
]);

const tableColumns = computed(() => buildTableColumns(columnKeys.value, { labelMap, widthMap, sortable: true, fixedFirst: true }));

function exportPageCsv() {
  exportObjectsToCsv("genome_gene_explorer_page.csv", pageRows.value, tableColumns.value);
}

// --- Drawer + per-gene charts ----------------------------------------------

const drawer = ref(false);
const picked = ref(null);
const drawerTitle = computed(() => (picked.value ? `Gene: ${picked.value.Gene_Name}` : "Gene"));

function openRow(r) {
  picked.value = r;
  drawer.value = true;
}

function extractPrefixedProportions(row, prefix) {
  const r = row || {};
  const out = [];
  for (const k of Object.keys(r)) {
    if (!k.startsWith(prefix) || !k.endsWith("_Proportion")) continue;
    const name = k.slice(prefix.length, k.length - "_Proportion".length);
    const v = Number(r[k]);
    if (Number.isFinite(v)) out.push({ k: name, v });
  }
  out.sort((a, b) => b.v - a.v);
  return out;
}

function topBarOption(prefix, title) {
  const r = picked.value;
  if (!r) return buildBarOption({ categories: [], values: [] }, { title });

  const items = extractPrefixedProportions(r, prefix).slice(0, 12);
  return buildBarOption(
    {
      categories: items.map((x) => x.k),
      values: items.map((x) => round(x.v, 6)),
    },
    {
      title,
      xName: "Feature",
      yName: "Proportion",
      rotate: 45,
      horizontal: false,
      dataZoom: false,
      toolbox: true,
    }
  );
}

const codonOption = computed(() => topBarOption("Codon_", "Codon Composition (Top 12)"));
const aaOption = computed(() => topBarOption("AA_", "AA Composition (Top 12)"));

const dinucOption = computed(() => {
  const r = picked.value;
  if (!r) return buildHeatmapOption({ xLabels: [], yLabels: [], values: [] }, { xName: "Base", yName: "Base" });

  const base = ["A", "C", "G", "T"];
  const m = new Map();
  for (const k of Object.keys(r)) {
    if (!k.startsWith("Dinuc_") || !k.endsWith("_Proportion")) continue;
    const di = k.slice("Dinuc_".length, k.length - "_Proportion".length);
    const v = Number(r[k]);
    if (Number.isFinite(v)) m.set(di, v);
  }

  const values = [];
  for (let y = 0; y < base.length; y++) {
    for (let x = 0; x < base.length; x++) {
      const di = `${base[y]}${base[x]}`;
      values.push([x, y, round(m.get(di) || 0, 6)]);
    }
  }

  return buildHeatmapOption(
    { xLabels: base, yLabels: base, values },
    {
      xName: "2nd base",
      yName: "1st base",
      valueName: "Proportion",
      dataZoom: false,
      toolbox: true,
      tooltipFormatter: (p) => {
        const d = p?.data || [];
        return `Dinuc: ${base[d[1]]}${base[d[0]]}<br/>Value: ${d[2]}`;
      },
    }
  );
});
</script>

<style scoped>
.toolbar { display:flex; gap: 12px; align-items:center; flex-wrap: wrap; }
.pager { margin-top: 12px; display:flex; justify-content: flex-end; }
.drawer-body { padding-right: 10px; }
.hdr { font-weight: 800; }
</style>
