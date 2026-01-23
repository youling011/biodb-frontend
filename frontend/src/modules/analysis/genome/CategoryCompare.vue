<template>
  <div>
    <el-row :gutter="16">
      <el-col :span="14">
        <el-card>
          <template #header>
            <div class="hdr">
              <div class="hdr-left">
                <span>Annotation Boxplot</span>
                <el-select v-model="groupKey" size="small" style="width: 160px">
                  <el-option label="Function Category" value="Function_Category" />
                  <el-option label="GO term" value="GO_terms" />
                  <el-option label="KEGG" value="KEGG" />
                </el-select>
                <el-select v-model="metricKey" size="small" style="width: 220px">
                  <el-option v-for="m in metricOptions" :key="m.key" :label="m.label" :value="m.key" />
                </el-select>
              </div>
              <el-button size="small" @click="exportChart(boxRef, 'category_boxplot.png')">Export PNG</el-button>
            </div>
          </template>
          <EChart ref="boxRef" :option="boxOption" height="380px" />
        </el-card>
      </el-col>

      <el-col :span="10">
        <el-card>
          <template #header>
            <div class="hdr">
              <span>Annotation Means</span>
              <el-button size="small" @click="exportChart(meanRef, 'category_means.png')">Export PNG</el-button>
            </div>
          </template>
          <EChart ref="meanRef" :option="meanOption" height="380px" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 12px;">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="hdr">
              <span>Annotation Summary Table</span>
              <el-button size="small" @click="exportSummaryCsv">Export CSV</el-button>
            </div>
          </template>
          <div class="note">
            Summary uses category-level means; designed for quick comparisons across functional groups.
          </div>
          <el-table :data="summaryRows" stripe height="420">
            <el-table-column
              v-for="c in summaryColumns"
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
import { buildBarOption, buildBoxplotOption } from "../shared/echartsKit";
import { boxplotStats, groupBy, isFiniteNumber, mean } from "../shared/stats";
import { buildTableColumns, hashStringToUint32, makeGenomeRows, round } from "../../../api/showcaseAdapter";

// Showcase-first tab: self-generates data + options + table schema.
const props = defineProps({
  seed: { type: [String, Number], default: "GENOME_CATEGORY_COMPARE" },
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
  localRows.value = makeGenomeRows({ seed: resolveSeed(), n: 2200 });
}

defineExpose({ regenerate });
onMounted(regenerate);
watch(() => [props.seed, props.seedBump], regenerate);

const metricOptions = [
  {
    key: "N_density",
    label: "N atoms / bp",
    unit: "atoms/bp",
    get: (r) => {
      const L = Number(r.Length_bp || 0);
      return L > 0 ? Number(r.Nitrogen_Atoms || 0) / L : null;
    },
  },
  {
    key: "C_N_Ratio",
    label: "C:N ratio",
    unit: "",
    get: (r) => Number(r.C_N_Ratio),
  },
  {
    key: "N_P_Ratio",
    label: "N:P ratio",
    unit: "",
    get: (r) => Number(r.N_P_Ratio),
  },
  {
    key: "GC_Content_Percent",
    label: "Gene GC%",
    unit: "%",
    get: (r) => Number(r.GC_Content_Percent),
  },
  {
    key: "Length_bp",
    label: "Gene length (bp)",
    unit: "bp",
    get: (r) => Number(r.Length_bp),
  },
];

const metricKey = ref("N_density");
const metric = computed(() => metricOptions.find((m) => m.key === metricKey.value) || metricOptions[0]);

const groupKey = ref("Function_Category");

const grouped = computed(() => {
  const rows = localRows.value || [];
  if (groupKey.value === "GO_terms") {
    const out = new Map();
    rows.forEach((r) => {
      const terms = Array.isArray(r.GO_terms) ? r.GO_terms : ["Unknown"];
      terms.forEach((t) => {
        const key = String(t || "Unknown");
        if (!out.has(key)) out.set(key, []);
        out.get(key).push(r);
      });
    });
    return out;
  }
  return groupBy(rows, (r) => String(r[groupKey.value] || "Unknown"));
});
const cats = computed(() => {
  const base = Array.from(grouped.value.keys()).map(String).sort((a, b) => a.localeCompare(b));
  const idx = base.indexOf("none");
  if (idx >= 0) {
    base.splice(idx, 1);
    base.push("none");
  }
  return base;
});

function computeBoxplot() {
  const out = { categories: cats.value, boxData: [], outliers: [] };
  const get = metric.value.get;

  cats.value.forEach((c, idx) => {
    const rs = grouped.value.get(c) || [];
    const vals = rs.map(get).filter((x) => isFiniteNumber(x));
    const st = boxplotStats(vals);

    out.boxData.push([st.whiskerLow, st.q1, st.median, st.q3, st.whiskerHigh].map((x) => (x === null ? 0 : x)));
    for (const o of st.outliers || []) out.outliers.push([idx, o]);
  });

  return out;
}

const boxRef = ref(null);
const meanRef = ref(null);

const boxOption = computed(() => {
  const d = computeBoxplot();
  return buildBoxplotOption(
    { categories: d.categories, boxData: d.boxData, outliers: d.outliers },
    {
      xName: "Function_Category",
      yName: metric.value.label,
      yUnit: metric.value.unit,
      rotate: 30,
      dataZoom: true,
      toolbox: true,
    }
  );
});

const meanOption = computed(() => {
  const get = metric.value.get;
  const values = cats.value.map((c) => {
    const rs = grouped.value.get(c) || [];
    const vals = rs.map(get).filter((x) => isFiniteNumber(x));
    const m = mean(vals);
    return m === null ? 0 : m;
  });

  return buildBarOption(
    { categories: cats.value, values: values.map((v) => round(v, 6)) },
    {
      xName: "Function_Category",
      yName: `Mean ${metric.value.label}`,
      yUnit: metric.value.unit,
      rotate: 45,
      horizontal: true,
      dataZoom: true,
      toolbox: true,
    }
  );
});

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

// --- Summary table ---------------------------------------------------------

const summaryRows = computed(() => {
  const rows = cats.value.map((c) => {
    const rs = grouped.value.get(c) || [];
    const asNum = (arr) => arr.map((x) => Number(x)).filter((x) => Number.isFinite(x));
    const m = (arr) => {
      const v = mean(asNum(arr));
      return v === null ? 0 : v;
    };

    return {
      Function_Category: c,
      n: rs.length,
      mean_GC: round(m(rs.map((r) => r.GC_Content_Percent)), 3),
      mean_len: round(m(rs.map((r) => r.Length_bp)), 2),
      mean_CN: round(m(rs.map((r) => r.C_N_Ratio)), 5),
      mean_NP: round(m(rs.map((r) => r.N_P_Ratio)), 5),
      mean_N_density: round(m(rs.map((r) => (Number(r.Length_bp || 0) > 0 ? Number(r.Nitrogen_Atoms || 0) / Number(r.Length_bp) : null))), 6),
    };
  });
  // sort by category size desc (more readable)
  rows.sort((a, b) => Number(b.n || 0) - Number(a.n || 0));
  return rows;
});

const summaryColumns = computed(() => {
  return buildTableColumns(
    ["Function_Category", "n", "mean_GC", "mean_len", "mean_CN", "mean_NP", "mean_N_density"],
    {
      labelMap: {
        Function_Category: "Category",
        n: "Genes",
        mean_GC: "Mean GC%",
        mean_len: "Mean Length",
        mean_CN: "Mean C:N",
        mean_NP: "Mean N:P",
        mean_N_density: "Mean N/bp",
      },
      widthMap: { Function_Category: 170, n: 110, mean_GC: 120, mean_len: 130, mean_CN: 120, mean_NP: 120, mean_N_density: 120 },
    }
  );
});

function exportSummaryCsv() {
  exportObjectsToCsv("genome_category_summary.csv", summaryRows.value, summaryColumns.value);
}
</script>

<style scoped>
.hdr { display:flex; justify-content: space-between; align-items:center; font-weight: 800; gap: 10px; }
.hdr-left { display:flex; align-items:center; gap: 10px; flex-wrap: wrap; }
.note { color:#909399; font-size: 12px; margin-bottom: 10px; }
</style>
