<template>
  <div>
    <el-row :gutter="16">
      <el-col :span="6">
        <el-card class="kpi">
          <div class="k">Genes</div>
          <div class="v">{{ geneCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="kpi">
          <div class="k">Coding Genes</div>
          <div class="v">{{ codingCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="kpi">
          <div class="k">Avg GC%</div>
          <div class="v">{{ avgGc.toFixed(2) }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="kpi">
          <div class="k">Avg C:N</div>
          <div class="v">{{ avgCn.toFixed(3) }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 14px;">
      <el-col :span="14">
        <el-card>
          <template #header>
            <div class="hdr">
              <span>Stoichiometric Budget (Total Atoms)</span>
              <el-button size="small" @click="exportChart(budgetRef, 'genome_budget.png')">Export PNG</el-button>
            </div>
          </template>
          <EChart ref="budgetRef" :option="budgetOption" height="360px" />
        </el-card>
      </el-col>

      <el-col :span="10">
        <el-card>
          <template #header>
            <div class="hdr">
              <span>Coding vs Non-coding</span>
              <el-button size="small" @click="exportChart(pieRef, 'coding_pie.png')">Export PNG</el-button>
            </div>
          </template>
          <EChart ref="pieRef" :option="pieOption" height="360px" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 14px;">
      <el-col :span="12">
        <el-card>
          <template #header><div class="hdr"><span>Length Distribution</span></div></template>
          <EChart :option="lenHist" height="280px" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><div class="hdr"><span>GC% Distribution</span></div></template>
          <EChart :option="gcHist" height="280px" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 14px;">
      <el-col :span="12">
        <el-card>
          <template #header><div class="hdr"><span>C:N Ratio Distribution</span></div></template>
          <EChart :option="cnHist" height="280px" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><div class="hdr"><span>Promoter GC% Distribution</span></div></template>
          <EChart :option="pgcHist" height="280px" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 14px;">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="hdr">
              <span>Top Genes (N:P Ratio)</span>
              <el-button size="small" @click="exportTopCsv">Export CSV</el-button>
            </div>
          </template>
          <el-table :data="topRows" stripe height="420">
            <el-table-column
              v-for="c in topColumns"
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
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import EChart from "../../../components/EChart.vue";
import { exportObjectsToCsv } from "../../../utils/exportCsv";
import { buildTableColumns, hashStringToUint32, makeGenomeRows, round } from "../../../api/showcaseAdapter";

// Showcase-first panel:
// - Generates its own aesthetic data.
// - Keeps backward-compatible props but does not rely on backend contracts.
const props = defineProps({
  // For determinism across route/sampleId changes
  seed: { type: [String, Number], default: "GENOME_OVERVIEW" },
  seedBump: { type: Number, default: 0 },

  // Backward-compatible (unused by default)
  rows: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
});

const localRows = ref([]);

function resolveSeed() {
  const base = (typeof props.seed === "number")
    ? (props.seed >>> 0)
    : hashStringToUint32(String(props.seed));
  return (base + (props.seedBump >>> 0)) >>> 0;
}

function regenerate() {
  localRows.value = makeGenomeRows({ seed: resolveSeed(), n: 1800 });
}

defineExpose({ regenerate });

onMounted(regenerate);
watch(() => [props.seed, props.seedBump], regenerate);

const geneCount = computed(() => localRows.value.length);
const codingCount = computed(() => localRows.value.filter((r) => String(r.Function_Category || "") !== "none").length);
const avgGc = computed(() => {
  if (!localRows.value.length) return 0;
  const s = localRows.value.reduce((a, r) => a + Number(r.GC_Content_Percent || 0), 0);
  return s / localRows.value.length;
});
const avgCn = computed(() => {
  if (!localRows.value.length) return 0;
  const s = localRows.value.reduce((a, r) => a + Number(r.C_N_Ratio || 0), 0);
  return s / localRows.value.length;
});

// --- Charts ----------------------------------------------------------------

const budgetRef = ref(null);
const pieRef = ref(null);

function sumBy(key) {
  let s = 0;
  for (const r of localRows.value) s += Number(r?.[key] || 0);
  return s;
}

const budgetOption = computed(() => {
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
    series: series.map((s) => ({ ...s, type: "bar", stack: "atoms", large: true })),
  };
});

const pieOption = computed(() => {
  const coding = codingCount.value;
  const non = Math.max(0, geneCount.value - coding);
  return {
    tooltip: { trigger: "item" },
    series: [
      {
        type: "pie",
        radius: ["35%", "70%"],
        data: [
          { name: "Coding", value: coding },
          { name: "Non-coding", value: non },
        ],
        label: { formatter: "{b}: {d}%" },
      },
    ],
  };
});

function histogram(values, bins = 28) {
  const xs = (values || []).map((v) => Number(v)).filter((v) => Number.isFinite(v));
  if (!xs.length) return { edges: [], counts: [] };
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const span = max - min || 1;
  const step = span / bins;
  const counts = new Array(bins).fill(0);
  for (const x of xs) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((x - min) / step)));
    counts[idx] += 1;
  }
  const edges = new Array(bins).fill(0).map((_, i) => [min + i * step, min + (i + 1) * step]);
  return { edges, counts };
}

function histOption(values, name, bins) {
  const { edges, counts } = histogram(values, bins);
  const labels = edges.map((e) => `${round(e[0], 2)}-${round(e[1], 2)}`);
  return {
    tooltip: { trigger: "axis" },
    grid: { left: "10%", right: "6%", top: 20, bottom: 65 },
    xAxis: { type: "category", data: labels, axisLabel: { rotate: 45, hideOverlap: true } },
    yAxis: { type: "value", name: "Count" },
    series: [{ type: "bar", data: counts, name, barWidth: "85%", large: true }],
  };
}

const lenHist = computed(() => histOption(localRows.value.map((r) => r.Length_bp), "Length", 30));
const gcHist = computed(() => histOption(localRows.value.map((r) => r.GC_Content_Percent), "GC%", 26));
const cnHist = computed(() => histOption(localRows.value.map((r) => r.C_N_Ratio), "C:N", 26));
const pgcHist = computed(() => histOption(localRows.value.map((r) => r.Promoter_GC_Content), "Promoter GC%", 26));

// --- Table (dynamic columns) ------------------------------------------------

const topRows = computed(() => {
  return [...localRows.value]
    .sort((a, b) => Number(b?.N_P_Ratio || 0) - Number(a?.N_P_Ratio || 0))
    .slice(0, 40)
    .map((r) => ({
      Gene_Name: r.Gene_Name,
      Function_Category: r.Function_Category,
      Length_bp: r.Length_bp,
      GC_Content_Percent: r.GC_Content_Percent,
      C_N_Ratio: round(r.C_N_Ratio, 5),
      N_P_Ratio: round(r.N_P_Ratio, 5),
      Nitrogen_Atoms: r.Nitrogen_Atoms,
    }));
});

const topColumns = computed(() => {
  return buildTableColumns(
    ["Gene_Name", "Function_Category", "Length_bp", "GC_Content_Percent", "C_N_Ratio", "N_P_Ratio", "Nitrogen_Atoms"],
    {
      labelMap: {
        Gene_Name: "Gene",
        Function_Category: "Category",
        Length_bp: "Length",
        GC_Content_Percent: "GC%",
        C_N_Ratio: "C:N",
        N_P_Ratio: "N:P",
        Nitrogen_Atoms: "N Atoms",
      },
      widthMap: {
        Gene_Name: 160,
        Function_Category: 140,
        Length_bp: 110,
        GC_Content_Percent: 110,
        C_N_Ratio: 110,
        N_P_Ratio: 110,
        Nitrogen_Atoms: 120,
      },
    }
  );
});

function exportTopCsv() {
  exportObjectsToCsv("genome_overview_top_genes.csv", topRows.value, topColumns.value);
}

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
</script>

<style scoped>
.kpi { border-radius: 10px; }
.hdr { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.k { font-size: 12px; opacity: 0.75; }
.v { font-size: 22px; font-weight: 600; }
</style>
