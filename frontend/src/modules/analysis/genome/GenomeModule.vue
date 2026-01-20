<template>
  <div class="genome-module" v-loading="loading">
    <div class="head">
      <div class="ttl">
        <h3>Genome Module</h3>
        <el-tag effect="plain">per-gene stoichiometric features</el-tag>
        <el-tag v-if="sourceTag" effect="plain" type="info">{{ sourceTag }}</el-tag>
      </div>
      <div class="actions">
        <el-button icon="Refresh" @click="reload">Refresh</el-button>
      </div>
    </div>

    <el-tabs v-model="tab" type="border-card" class="tabs">
      <el-tab-pane label="Overview" name="overview" lazy>
        <GenomeOverview :rows="rows" :categories="categories" :seed="seed" :seed-bump="seedBump" />
      </el-tab-pane>

      <el-tab-pane label="Gene Explorer" name="explorer" lazy>
        <GeneExplorer :rows="rows" :categories="categories" :derived-charts="charts" :derived-tables="tables" :seed="seed" :seed-bump="seedBump" />
      </el-tab-pane>

      <el-tab-pane label="Category Compare" name="category" lazy>
        <CategoryCompare :rows="rows" :categories="categories" :derived-charts="charts" :derived-tables="tables" :seed="seed" :seed-bump="seedBump" />
      </el-tab-pane>

      <el-tab-pane label="Regulatory Context" name="regulatory" lazy>
        <RegulatoryContext :rows="rows" :categories="categories" :derived-charts="charts" :derived-tables="tables" />
      </el-tab-pane>

      <el-tab-pane label="Fingerprint Map" name="fingerprint" lazy>
        <FingerprintMap :rows="rows" :categories="categories" :derived-charts="charts" :derived-tables="tables" />
      </el-tab-pane>

      <el-tab-pane label="Export & API" name="export" lazy>
        <ExportApi :rows="rows" />
      </el-tab-pane>

      <el-tab-pane label="Legacy View" name="legacy" lazy>
        <el-row :gutter="16">
          <el-col :span="14">
            <el-card>
              <template #header>
                <div class="legacy-hdr">
                  <span>Legacy Showcase (Atoms Budget)</span>
                  <el-button size="small" @click="exportLegacyCsv">Export CSV</el-button>
                </div>
              </template>
              <EChart :option="legacyBudgetOption" height="360px" />
            </el-card>
          </el-col>
          <el-col :span="10">
            <el-card>
              <template #header>
                <div class="legacy-hdr">
                  <span>Top Genes (N:P)</span>
                </div>
              </template>
              <el-table :data="legacyTopRows" stripe height="360">
                <el-table-column
                  v-for="c in legacyColumns"
                  :key="c.key"
                  :prop="c.key"
                  :label="c.label"
                  :width="c.width"
                  :sortable="c.sortable"
                  :fixed="c.fixed"
                />
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import GenomeOverview from "./GenomeOverview.vue";
import GeneExplorer from "./GeneExplorer.vue";
import CategoryCompare from "./CategoryCompare.vue";
import RegulatoryContext from "./RegulatoryContext.vue";
import FingerprintMap from "./FingerprintMap.vue";
import ExportApi from "./ExportApi.vue";
import EChart from "../../../components/EChart.vue";
import { exportObjectsToCsv } from "../../../utils/exportCsv";
import { buildTableColumns, hashStringToUint32, makeGenomeRows, round } from "../../../api/showcaseAdapter";

const props = defineProps({
  sampleId: { type: [String, Number], required: true },
  active: { type: Boolean, default: false },
});

const tab = ref("overview");

// Showcase mode for the Genome module (front-end only):
// - rows/categories are generated locally (deterministic by sampleId + seedBump)
// - charts/tables are left as optional pass-through (for non-modified tabs)
const seedBump = ref(0);
const seed = computed(() => {
  const base = hashStringToUint32(`GENOME::${String(props.sampleId)}`);
  return (base + (seedBump.value >>> 0)) >>> 0;
});

const loading = ref(false);
const rows = ref([]);

function regenerate() {
  rows.value = makeGenomeRows({ seed: seed.value, n: 1900 });
}

function reload() {
  seedBump.value += 1;
  regenerate();
}

watch(
  () => [props.sampleId, props.active],
  () => {
    // Generate once when mounted or when sample changes.
    regenerate();
  },
  { immediate: true }
);

const categories = computed(() => {
  const s = new Set((rows.value || []).map((r) => String(r.Function_Category || "Unknown")));
  const arr = Array.from(s);
  arr.sort((a, b) => a.localeCompare(b));
  // Put non-coding at the end if present
  const idx = arr.indexOf("none");
  if (idx >= 0) {
    arr.splice(idx, 1);
    arr.push("none");
  }
  return arr;
});

// Keep these for compatibility with unmodified tabs.
const charts = ref({});
const tables = ref({});

const sourceTag = computed(() => "showcase_random");

// --- Legacy Showcase --------------------------------------------------------

function sumBy(key) {
  let s = 0;
  for (const r of rows.value || []) s += Number(r?.[key] || 0);
  return s;
}

const legacyBudgetOption = computed(() => {
  const dna = {
    C: sumBy("Carbon_Atoms"),
    N: sumBy("Nitrogen_Atoms"),
    O: sumBy("Oxygen_Atoms"),
    P: sumBy("Phosphorus_Atoms"),
  };
  const promoter = {
    C: sumBy("Promoter_C_Atoms"),
    N: sumBy("Promoter_N_Atoms"),
    O: sumBy("Promoter_O_Atoms"),
    P: sumBy("Promoter_P_Atoms"),
  };
  const intergenic = {
    C: sumBy("Intergenic_C_Atoms"),
    N: sumBy("Intergenic_N_Atoms"),
    O: sumBy("Intergenic_O_Atoms"),
    P: sumBy("Intergenic_P_Atoms"),
  };
  const protein = {
    C: sumBy("Protein_C_Atoms"),
    N: sumBy("Protein_N_Atoms"),
    O: sumBy("Protein_O_Atoms"),
    P: 0,
  };

  const regions = ["Gene body", "Promoter", "Intergenic", "Protein"];
  const series = [
    { name: "C", data: [dna.C, promoter.C, intergenic.C, protein.C] },
    { name: "N", data: [dna.N, promoter.N, intergenic.N, protein.N] },
    { name: "O", data: [dna.O, promoter.O, intergenic.O, protein.O] },
    { name: "P", data: [dna.P, promoter.P, intergenic.P, protein.P] },
  ];

  return {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { top: 10 },
    grid: { left: "10%", right: "6%", top: 50, bottom: 40 },
    xAxis: { type: "category", data: regions },
    yAxis: { type: "value" },
    series: series.map((s) => ({ ...s, type: "bar", stack: "atoms" })),
  };
});

const legacyTopRows = computed(() => {
  const sorted = [...(rows.value || [])]
    .sort((a, b) => Number(b?.N_P_Ratio || 0) - Number(a?.N_P_Ratio || 0))
    .slice(0, 20)
    .map((r) => ({
      Gene_Name: r.Gene_Name,
      Function_Category: r.Function_Category,
      Length_bp: r.Length_bp,
      GC_Content_Percent: r.GC_Content_Percent,
      N_P_Ratio: round(r.N_P_Ratio, 5),
    }));
  return sorted;
});

const legacyColumns = computed(() => {
  return buildTableColumns(
    ["Gene_Name", "Function_Category", "Length_bp", "GC_Content_Percent", "N_P_Ratio"],
    {
      labelMap: {
        Gene_Name: "Gene",
        Function_Category: "Category",
        Length_bp: "Length",
        GC_Content_Percent: "GC%",
        N_P_Ratio: "N:P",
      },
      widthMap: { Gene_Name: 160, Function_Category: 140, Length_bp: 110, GC_Content_Percent: 110, N_P_Ratio: 110 },
    }
  );
});

function exportLegacyCsv() {
  const cols = legacyColumns.value || [];
  exportObjectsToCsv("genome_legacy_top_genes.csv", legacyTopRows.value, cols);
}
</script>

<style scoped>
.genome-module { width: 100%; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.ttl { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.actions { display: flex; align-items: center; gap: 10px; }
.tabs { width: 100%; }
.legacy-hdr { display:flex; align-items:center; justify-content: space-between; gap: 10px; }
</style>
