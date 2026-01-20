<template>
  <div class="panel" v-loading="loading">
    <div class="panel-head">
      <div class="panel-title">
        <h3>{{ title }}</h3>
        <el-tag size="small" effect="plain">{{ omics }}</el-tag>
      </div>

      <div class="panel-actions">
        <el-radio-group v-model="viewMode" size="default">
          <el-radio-button label="overview">Overview</el-radio-button>
          <el-radio-button label="correlation">Correlation</el-radio-button>
        </el-radio-group>

        <el-button type="primary" plain icon="Document" @click="dialogVisible = true">
          Raw Matrix ({{ rawData.length }})
        </el-button>

        <el-button icon="Refresh" @click="reload">Refresh</el-button>
      </div>
    </div>

    <el-empty v-if="!hasData && loaded" description="No analysis data returned for this omics module." />

    <template v-else>
      <template v-if="viewMode === 'overview'">
        <el-row :gutter="20" style="margin-top: 16px;">
          <el-col :span="12">
            <el-card shadow="never" class="viz-card">
              <template #header>
                <div class="card-header">
                  <span><el-icon><Histogram /></el-icon> Element Fingerprint</span>
                  <el-button text @click="exportChart(elementRef, `${omics}_element.png`)">
                    <el-icon><Download /></el-icon>
                  </el-button>
                </div>
              </template>
              <EChart ref="elementRef" :option="boxplotOption" height="350px" />
            </el-card>
          </el-col>

          <el-col :span="12">
            <el-card shadow="never" class="viz-card">
              <template #header>
                <div class="card-header">
                  <span><el-icon><TrendCharts /></el-icon> C:N Distribution</span>
                  <el-button text @click="exportChart(cnRef, `${omics}_cn_hist.png`)">
                    <el-icon><Download /></el-icon>
                  </el-button>
                </div>
              </template>
              <EChart ref="cnRef" :option="histOption" height="350px" />
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="20" style="margin-top: 16px;">
          <el-col :span="14">
            <el-card shadow="never" class="viz-card">
              <template #header>
                <div class="card-header">
                  <span>GC vs Nitrogen Cost</span>
                  <el-button text @click="exportChart(scatterRef, `${omics}_scatter.png`)">
                    <el-icon><Download /></el-icon>
                  </el-button>
                </div>
              </template>
              <EChart ref="scatterRef" :option="scatterOption" height="380px" />
            </el-card>
          </el-col>

          <el-col :span="10">
            <el-card shadow="never" class="viz-card">
              <template #header>
                <div class="card-header">
                  <span>Promoter vs Gene Body</span>
                  <el-button text @click="exportChart(radarRef, `${omics}_radar.png`)">
                    <el-icon><Download /></el-icon>
                  </el-button>
                </div>
              </template>
              <EChart ref="radarRef" :option="radarOption" height="380px" />
            </el-card>
          </el-col>
        </el-row>

        <div class="extreme-section" style="margin-top: 18px;">
          <el-divider content-position="left">
            <el-icon><List /></el-icon> Extreme Screening
          </el-divider>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-card shadow="hover" class="rank-card">
                <template #header>
                  <div class="rank-header">
                    <span class="rank-title">Top 10 High Nitrogen Density</span>
                    <span class="rank-sub">(N_atoms / length)</span>
                  </div>
                </template>

                <el-table :data="tables.top_n_cost" size="small" stripe height="300" @row-click="openEntity">
                  <el-table-column prop="Gene_Name" :label="entityLabel" width="140" />
                  <el-table-column prop="Nitrogen_Atoms" label="N Atoms" sortable />
                  <el-table-column prop="Length_bp" label="Length" sortable />
                  <el-table-column label="N Density" sortable>
                    <template #default="{ row }">
                      {{ safeDiv(row.Nitrogen_Atoms, row.Length_bp).toFixed(3) }}
                    </template>
                  </el-table-column>
                </el-table>
              </el-card>
            </el-col>

            <el-col :span="12">
              <el-card shadow="hover" class="rank-card">
                <template #header>
                  <div class="rank-header">
                    <span class="rank-title">Top 10 Low C:N Ratio</span>
                    <span class="rank-sub">(nitrogen-rich)</span>
                  </div>
                </template>

                <el-table :data="tables.low_cn_ratio" size="small" stripe height="300" @row-click="openEntity">
                  <el-table-column prop="Gene_Name" :label="entityLabel" width="140" />
                  <el-table-column prop="C_N_Ratio" label="C:N Ratio" sortable width="130">
                    <template #default="{ row }">
                      <el-tag type="danger" size="small">{{ row.C_N_Ratio }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="Carbon_Atoms" label="C Atoms" sortable />
                  <el-table-column prop="Nitrogen_Atoms" label="N Atoms" sortable />
                </el-table>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </template>

      <template v-else>
        <el-card shadow="never" class="viz-card" style="margin-top: 16px;">
          <template #header>
            <div class="card-header">
              <span><el-icon><DataLine /></el-icon> Correlation Heatmap (raw sample)</span>
              <el-button text @click="exportChart(corrRef, `${omics}_corr.png`)">
                <el-icon><Download /></el-icon>
              </el-button>
            </div>
          </template>
          <div class="corr-hint">
            Correlation is computed from returned raw sample rows ({{ rawData.length }}).
          </div>
          <EChart ref="corrRef" :option="corrOption" height="520px" />
        </el-card>
      </template>
    </template>

    <!-- Raw Matrix -->
    <el-dialog v-model="dialogVisible" :title="`${title} - Raw Data Matrix`" width="90%">
      <div class="raw-toolbar">
        <el-input v-model="rawKeyword" clearable placeholder="Filter by name / function…" style="width: 320px">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>

        <el-popover placement="bottom" :width="420" trigger="click">
          <template #reference>
            <el-button>Columns</el-button>
          </template>
          <div class="col-box">
            <el-checkbox-group v-model="visibleColKeys">
              <el-checkbox v-for="c in allColumns" :key="c.key" :label="c.key">
                {{ c.label }}
              </el-checkbox>
            </el-checkbox-group>
          </div>
        </el-popover>

        <el-button type="primary" icon="Download" @click="exportRawCsv" style="margin-left:auto">
          Export CSV
        </el-button>
      </div>

      <el-table
        :data="filteredRawRows"
        border
        height="520"
        stripe
        style="width: 100%"
        @row-click="openEntity"
      >
        <el-table-column
          v-for="c in visibleColumns"
          :key="c.key"
          :prop="c.key"
          :label="c.label"
          :width="c.width"
          :sortable="c.sortable"
          :fixed="c.fixed"
        />
      </el-table>

      <template #footer>
        <el-button @click="dialogVisible = false">Close</el-button>
      </template>
    </el-dialog>

    <!-- Entity Drawer -->
    <el-drawer v-model="drawerVisible" :title="drawerTitle" size="34%">
      <div v-if="entityDetail" class="drawer-body">
        <el-descriptions :column="1" border>
          <el-descriptions-item :label="entityLabel">{{ entityDetail.Gene_Name }}</el-descriptions-item>
          <el-descriptions-item label="Function">{{ entityDetail.Function_Category }}</el-descriptions-item>
          <el-descriptions-item label="Strand">{{ entityDetail.Strand }}</el-descriptions-item>
          <el-descriptions-item label="Length">{{ entityDetail.Length_bp }}</el-descriptions-item>
          <el-descriptions-item label="GC%">{{ entityDetail.GC_Content_Percent }}</el-descriptions-item>
          <el-descriptions-item label="Promoter GC%">{{ entityDetail.Promoter_GC_Content }}</el-descriptions-item>
          <el-descriptions-item label="C Atoms">{{ entityDetail.Carbon_Atoms }}</el-descriptions-item>
          <el-descriptions-item label="N Atoms">{{ entityDetail.Nitrogen_Atoms }}</el-descriptions-item>
          <el-descriptions-item label="O Atoms">{{ entityDetail.Oxygen_Atoms }}</el-descriptions-item>
          <el-descriptions-item label="P Atoms">{{ entityDetail.Phosphorus_Atoms }}</el-descriptions-item>
          <el-descriptions-item label="C:N Ratio">{{ entityDetail.C_N_Ratio }}</el-descriptions-item>
        </el-descriptions>

        <div class="mini">
          <div class="mini-title">Quick Metrics</div>
          <div class="mini-row">
            <el-tag type="danger">N Density: {{ safeDiv(entityDetail.Nitrogen_Atoms, entityDetail.Length_bp).toFixed(3) }}</el-tag>
            <el-tag type="warning">C:N: {{ entityDetail.C_N_Ratio }}</el-tag>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from "vue";
import { getSpeciesAnalysis } from "../../api";
import { exportObjectsToCsv } from "../../utils/exportCsv";
import EChart from "../../components/EChart.vue";

const props = defineProps({
  sampleId: { type: [String, Number], required: true },
  omics: { type: String, required: true }, // GENOME / TRANSCRIPTOME / PROTEOME
  title: { type: String, default: "Omics Analysis" },
  active: { type: Boolean, default: false }, // 由父层 tab 控制：激活后才 fetch
});

const loading = ref(false);
const loaded = ref(false);
const viewMode = ref("overview");

const dialogVisible = ref(false);
const rawKeyword = ref("");

const rawData = ref([]);
const fullScatter = ref([]);
const charts = reactive({
  element_boxplot: [],
  cn_histogram: { bins: [], counts: [] },
  promoter_radar: { indicators: [], values: [] },
});
const tables = reactive({ top_n_cost: [], low_cn_ratio: [] });

const hasData = computed(() => {
  return (rawData.value?.length || 0) > 0 || (fullScatter.value?.length || 0) > 0;
});

const entityLabel = computed(() => {
  if (props.omics === "PROTEOME") return "Protein";
  if (props.omics === "TRANSCRIPTOME") return "Transcript";
  return "Gene";
});

const elementRef = ref(null);
const cnRef = ref(null);
const scatterRef = ref(null);
const radarRef = ref(null);
const corrRef = ref(null);

// raw table columns (可按组学后续扩展不同列)
const allColumns = [
  { key: "Gene_Name", label: "Name", width: 160, sortable: true, fixed: "left" },
  { key: "Function_Category", label: "Function", width: 140, sortable: true },
  { key: "Length_bp", label: "Length", width: 110, sortable: true },
  { key: "Strand", label: "Strand", width: 90, sortable: true },
  { key: "Carbon_Atoms", label: "C", width: 90, sortable: true },
  { key: "Hydrogen_Atoms", label: "H", width: 90, sortable: true },
  { key: "Oxygen_Atoms", label: "O", width: 90, sortable: true },
  { key: "Nitrogen_Atoms", label: "N", width: 90, sortable: true },
  { key: "Phosphorus_Atoms", label: "P", width: 90, sortable: true },
  { key: "C_N_Ratio", label: "C:N", width: 100, sortable: true },
  { key: "GC_Content_Percent", label: "GC%", width: 100, sortable: true },
  { key: "Promoter_GC_Content", label: "Promoter GC%", width: 140, sortable: true },
];

const visibleColKeys = ref([
  "Gene_Name",
  "Function_Category",
  "Length_bp",
  "Carbon_Atoms",
  "Nitrogen_Atoms",
  "Oxygen_Atoms",
  "Phosphorus_Atoms",
  "C_N_Ratio",
  "GC_Content_Percent",
  "Promoter_GC_Content",
]);

const visibleColumns = computed(() => {
  const set = new Set(visibleColKeys.value);
  return allColumns.filter((c) => set.has(c.key));
});

const filteredRawRows = computed(() => {
  const q = rawKeyword.value.trim().toLowerCase();
  if (!q) return rawData.value || [];
  return (rawData.value || []).filter((r) => {
    const name = (r.Gene_Name || "").toLowerCase();
    const fn = (r.Function_Category || "").toLowerCase();
    return name.includes(q) || fn.includes(q);
  });
});

// drawer
const drawerVisible = ref(false);
const entityDetail = ref(null);
const drawerTitle = computed(() => entityDetail.value?.Gene_Name || `${entityLabel.value} Detail`);

function openEntity(row) {
  entityDetail.value = row;
  drawerVisible.value = true;
}

function safeDiv(a, b) {
  const x = Number(a);
  const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y) || y === 0) return 0;
  return x / y;
}

function exportRawCsv() {
  exportObjectsToCsv(
    `${props.omics}_raw_matrix.csv`,
    filteredRawRows.value,
    visibleColumns.value.map((c) => ({ key: c.key, label: c.label }))
  );
}

function exportChart(chartRef, filename) {
  const inst = chartRef?.value?.getInstance?.();
  if (!inst) return;
  const url = inst.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#ffffff" });
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function fetchData() {
  loading.value = true;
  try {
    const data = await getSpeciesAnalysis(props.sampleId, { omics: props.omics });

    rawData.value = data.raw_data_sample || [];
    fullScatter.value = data.charts?.gc_scatter || [];

    charts.element_boxplot = data.charts?.element_boxplot || [];
    charts.cn_histogram = data.charts?.cn_histogram || { bins: [], counts: [] };
    charts.promoter_radar = data.charts?.promoter_radar || { indicators: [], values: [] };

    tables.top_n_cost = data.tables?.top_n_cost || [];
    tables.low_cn_ratio = data.tables?.low_cn_ratio || [];
    loaded.value = true;
  } finally {
    loading.value = false;
  }
}

function reload() {
  fetchData();
}

// 仅在 tab 激活后首次加载，避免三个模块同时请求
const hasLoadedOnce = ref(false);
watch(
  () => props.active,
  (v) => {
    if (v && !hasLoadedOnce.value) {
      hasLoadedOnce.value = true;
      fetchData();
    }
  },
  { immediate: true }
);

// 如果同一模块切换了 sampleId，且模块处于 active，则刷新
watch(
  () => props.sampleId,
  () => {
    if (props.active && hasLoadedOnce.value) fetchData();
  }
);

// ----- Chart options -----
const boxplotOption = computed(() => {
  const src = charts.element_boxplot || [];
  return {
    tooltip: {
      trigger: "item",
      formatter: (p) => {
        const d = p.data;
        if (!d || d.length < 5) return "";
        return [`min: ${d[0]}`, `Q1: ${d[1]}`, `median: ${d[2]}`, `Q3: ${d[3]}`, `max: ${d[4]}`].join("<br/>");
      },
    },
    grid: { left: "10%", right: "6%", top: 30, bottom: 40 },
    xAxis: { type: "category", data: ["Carbon", "Nitrogen", "Oxygen", "Phosphorus"] },
    yAxis: { type: "value", name: "Atom Count" },
    series: [{ type: "boxplot", data: src }],
  };
});

const histOption = computed(() => {
  const d = charts.cn_histogram || { bins: [], counts: [] };
  return {
    tooltip: { trigger: "axis" },
    grid: { left: "10%", right: "6%", top: 30, bottom: 60 },
    xAxis: { type: "category", data: d.bins, name: "C:N Ratio" },
    yAxis: { type: "value", name: "Count" },
    series: [{ type: "bar", data: d.counts, barWidth: "85%" }],
  };
});

const scatterOption = computed(() => {
  const data = fullScatter.value || [];
  return {
    tooltip: { formatter: (p) => `${entityLabel.value}: ${p.data[2]}<br/>GC: ${p.data[0]}%<br/>N: ${p.data[1]}` },
    grid: { left: "10%", right: "6%", top: 30, bottom: 50 },
    xAxis: { name: "GC (%)", scale: true },
    yAxis: { name: "Nitrogen Atoms", scale: true },
    series: [{ type: "scatter", data, symbolSize: 7 }],
  };
});

const radarOption = computed(() => {
  const d = charts.promoter_radar || { indicators: [], values: [] };
  return {
    tooltip: {},
    radar: { indicator: d.indicators, radius: "65%" },
    series: [{ type: "radar", data: [{ value: d.values, name: "Average", areaStyle: {} }] }],
  };
});

const corrOption = computed(() => {
  const keys = [
    "Carbon_Atoms",
    "Nitrogen_Atoms",
    "Oxygen_Atoms",
    "Phosphorus_Atoms",
    "Length_bp",
    "C_N_Ratio",
    "GC_Content_Percent",
    "Promoter_GC_Content",
  ];
  const rows = rawData.value || [];
  const matrix = pearsonCorrMatrix(rows, keys);

  const data = [];
  for (let y = 0; y < keys.length; y++) {
    for (let x = 0; x < keys.length; x++) data.push([x, y, Number(matrix[y][x].toFixed(3))]);
  }

  return {
    tooltip: { formatter: (p) => `${keys[p.data[1]]} vs ${keys[p.data[0]]}: <b>${p.data[2]}</b>` },
    grid: { left: 120, right: 50, top: 30, bottom: 120 },
    xAxis: { type: "category", data: keys, axisLabel: { rotate: 45 } },
    yAxis: { type: "category", data: keys },
    visualMap: { min: -1, max: 1, calculable: true, orient: "horizontal", left: "center", bottom: 20 },
    series: [{
      type: "heatmap",
      data,
      label: { show: true, formatter: (p) => p.data[2] },
      emphasis: { itemStyle: { shadowBlur: 8 } },
    }],
  };
});

function pearsonCorrMatrix(rows, keys) {
  const cols = keys.map((k) =>
    (rows || []).map((r) => Number(r?.[k])).filter((v) => Number.isFinite(v))
  );
  const n = Math.min(...cols.map((c) => c.length), rows.length);
  const trimmed = cols.map((c) => c.slice(0, n));

  const means = trimmed.map((c) => c.reduce((a, b) => a + b, 0) / (c.length || 1));
  const stds = trimmed.map((c, i) => {
    const m = means[i];
    const v = c.reduce((a, b) => a + (b - m) * (b - m), 0) / Math.max(1, c.length - 1);
    return Math.sqrt(v) || 1e-9;
  });

  const corr = Array.from({ length: keys.length }, () => Array(keys.length).fill(0));
  for (let i = 0; i < keys.length; i++) {
    for (let j = 0; j < keys.length; j++) {
      const xi = trimmed[i];
      const yj = trimmed[j];
      const mi = means[i], mj = means[j];
      const si = stds[i], sj = stds[j];
      const len = Math.min(xi.length, yj.length);
      let sum = 0;
      for (let k = 0; k < len; k++) sum += ((xi[k] - mi) / si) * ((yj[k] - mj) / sj);
      corr[i][j] = sum / Math.max(1, len - 1);
    }
  }
  return corr;
}
</script>

<style scoped>
.panel { width: 100%; }
.panel-head { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; }
.panel-title { display: flex; align-items: center; gap: 10px; }
.panel-title h3 { margin: 0; color: #2c3e50; }
.panel-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.viz-card { border-radius: 8px; }
.card-header { display: flex; justify-content: space-between; align-items: center; font-weight: 800; }

.rank-header { display: flex; flex-direction: column; gap: 4px; }
.rank-title { font-weight: 800; }
.rank-sub { color: #909399; font-size: 12px; }

.raw-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.col-box { max-height: 280px; overflow: auto; padding: 6px 4px; }

.corr-hint { color: #909399; font-size: 13px; margin-bottom: 10px; }

.drawer-body { padding: 2px; }
.mini { margin-top: 16px; }
.mini-title { font-weight: 800; margin-bottom: 8px; }
.mini-row { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
