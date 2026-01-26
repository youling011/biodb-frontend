<template>
  <div>
    <el-card>
      <div class="toolbar">
        <el-input v-model="kw" clearable placeholder="Search transcript/gene..." style="width: 260px" />
        <el-switch v-model="highComplexOnly" active-text="High complexity only" />
        <el-button type="primary" @click="exportPageCsv" style="margin-left: auto">
          Export Current Page CSV
        </el-button>
      </div>

      <div class="sliders">
        <div class="sitem">
          <div class="lab">Length</div>
          <el-slider v-model="lenRange" range :min="lenMin" :max="lenMax" :step="10" show-input />
        </div>
        <div class="sitem">
          <div class="lab">GC%</div>
          <el-slider v-model="gcRange" range :min="0" :max="100" :step="0.5" show-input />
        </div>
        <div class="sitem">
          <div class="lab">Entropy</div>
          <el-slider v-model="entRange" range :min="0" :max="2.2" :step="0.01" show-input />
        </div>
        <div class="sitem">
          <div class="lab">LZ</div>
          <el-slider v-model="lzRange" range :min="0" :max="1.2" :step="0.01" show-input />
        </div>
      </div>

      <VirtualTable
        :data="pageRows"
        :columns="tableColumns"
        :height="520"
        row-key="Gene_Name"
        @row-click="openRow"
      />

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
          <el-descriptions-item label="Gene/Tx">{{ picked.Gene_Name }}</el-descriptions-item>
          <el-descriptions-item label="Length">{{ picked.Sequence_Length }}</el-descriptions-item>
          <el-descriptions-item label="GC%">{{ picked.GC_content }}</el-descriptions-item>
          <el-descriptions-item label="Entropy">{{ picked.Sequence_Entropy }}</el-descriptions-item>
          <el-descriptions-item label="LZ">{{ picked.LZ_complexity }}</el-descriptions-item>
          <el-descriptions-item label="AT_skew">{{ picked.AT_skew }}</el-descriptions-item>
          <el-descriptions-item label="GC_skew">{{ picked.GC_skew }}</el-descriptions-item>
        </el-descriptions>

        <el-row :gutter="12" style="margin-top: 12px">
          <el-col :span="24">
            <el-card shadow="never">
              <template #header>
                <div class="hdr"><span>Atom Fingerprint (Total & per nt)</span></div>
              </template>
              <EChart :option="atomOption" height="260px" />
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="12" style="margin-top: 12px">
          <el-col :span="12">
            <el-card shadow="never">
              <template #header>
                <div class="hdr"><span>Dinucleotide Frequency (4×4)</span></div>
              </template>
              <EChart :option="dinucFreqOption" height="300px" />
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card shadow="never">
              <template #header>
                <div class="hdr"><span>Dinucleotide Bias (4×4)</span></div>
              </template>
              <EChart :option="dinucBiasOption" height="300px" />
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="12" style="margin-top: 12px">
          <el-col :span="24">
            <el-card shadow="never">
              <template #header>
                <div class="hdr"><span>Trinucleotide Top 12</span></div>
              </template>
              <EChart :option="triTopOption" height="280px" />
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="12" style="margin-top: 12px">
          <el-col :span="24">
            <el-card shadow="never">
              <template #header>
                <div class="hdr"><span>Base Spacing (Avg)</span></div>
              </template>
              <EChart :option="spacingOption" height="240px" />
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import EChart from "../../../components/EChart.vue";
import VirtualTable from "../../../components/VirtualTable.vue";
import { exportObjectsToCsv } from "../../../utils/exportCsv";
import { safeNum, extractDinucMatrix, extractTopTrinuc, round } from "./transcriptomeUtils";
import { makeTranscriptomeRows } from "../../../api/showcaseAdapter";

const props = defineProps({
  seed: { type: String, default: "TX:demo" },
  seedBump: { type: Number, default: 0 },
});

// Self-generated dataset for this tab.
const hvgSet = computed(() => {
  try {
    const raw = JSON.parse(localStorage.getItem("biostoich_hvg_genes") || "[]");
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
});

const deMap = computed(() => {
  try {
    const raw = JSON.parse(localStorage.getItem("biostoich_de_table") || "[]");
    if (!Array.isArray(raw)) return new Map();
    return new Map(raw.map((r) => [r.gene, r]));
  } catch {
    return new Map();
  }
});

const rows = computed(() =>
  makeTranscriptomeRows({ seed: `${props.seed}:${props.seedBump}:explorer`, n: 3200 })
    .map((r) => ({
      ...r,
      is_hvg: hvgSet.value.has(r.Gene_Name),
      log2fc: deMap.value.get(r.Gene_Name)?.log2fc ?? null,
    }))
);

const kw = ref("");
const highComplexOnly = ref(false);

const lenMin = computed(() => {
  const v = rows.value.map((r) => safeNum(r.Sequence_Length, 0)).filter((x) => x > 0);
  return v.length ? Math.min(...v) : 0;
});
const lenMax = computed(() => {
  const v = rows.value.map((r) => safeNum(r.Sequence_Length, 0)).filter((x) => x > 0);
  return v.length ? Math.max(...v) : 1;
});

// slider state
const lenRange = ref([0, 6000]);
const gcRange = ref([0, 100]);
const entRange = ref([0, 2.2]);
const lzRange = ref([0, 1.2]);

// when rows first arrive, set lenRange to real min/max once
const inited = ref(false);
watch(
  rows,
  (rs) => {
    if (!inited.value && rs && rs.length) {
      inited.value = true;
      lenRange.value = [lenMin.value, lenMax.value];
    }
  },
  { immediate: true }
);

watch(
  () => [props.seed, props.seedBump],
  () => {
    // Reset sliders and paging whenever dataset regenerates.
    inited.value = false;
    page.value = 1;
    drawer.value = false;
    picked.value = null;
  }
);

const filtered = computed(() => {
  const q = kw.value.trim().toLowerCase();
  const [l0, l1] = lenRange.value;
  const [g0, g1] = gcRange.value;
  const [e0, e1] = entRange.value;
  const [z0, z1] = lzRange.value;

  return (rows.value || [])
    .filter((r) => safeNum(r.Sequence_Length, 0) >= l0 && safeNum(r.Sequence_Length, 0) <= l1)
    .filter((r) => safeNum(r.GC_content, 0) >= g0 && safeNum(r.GC_content, 0) <= g1)
    .filter((r) => safeNum(r.Sequence_Entropy, 0) >= e0 && safeNum(r.Sequence_Entropy, 0) <= e1)
    .filter((r) => safeNum(r.LZ_complexity, 0) >= z0 && safeNum(r.LZ_complexity, 0) <= z1)
    .filter((r) =>
      highComplexOnly.value
        ? safeNum(r.Sequence_Entropy, 0) >= 1.9 && safeNum(r.LZ_complexity, 0) >= 0.25
        : true
    )
    .filter((r) => (q ? String(r.Gene_Name || "").toLowerCase().includes(q) : true));
});

const pageSize = 60;
const page = ref(1);

watch(
  () => filtered.value.length,
  () => {
    page.value = 1;
  }
);

const pageRows = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filtered.value.slice(start, start + pageSize);
});

const tableColumns = computed(() => [
  { key: "Gene_Name", label: "Gene/Tx", width: 180, fixed: "left", sortable: false },
  { key: "is_hvg", label: "HVG", width: 80, sortable: true },
  { key: "log2fc", label: "log2FC", width: 90, sortable: true },
  { key: "Sequence_Length", label: "Length", width: 110, sortable: true },
  { key: "GC_content", label: "GC%", width: 110, sortable: true },
  { key: "Sequence_Entropy", label: "Entropy", width: 120, sortable: true },
  { key: "LZ_complexity", label: "LZ", width: 110, sortable: true },
  { key: "AT_skew", label: "AT_skew", width: 110, sortable: true },
  { key: "GC_skew", label: "GC_skew", width: 110, sortable: true },
  { key: "N_count", label: "N atoms", width: 120, sortable: true },
  { key: "P_count", label: "P atoms", width: 120, sortable: true },
  { key: "H_ACA_box_freq", label: "H_ACA_box", width: 130, sortable: true },
  { key: "C_D_box_freq", label: "C_D_box", width: 120, sortable: true },
]);

function exportPageCsv() {
  exportObjectsToCsv(
    "transcript_explorer_page.csv",
    pageRows.value,
    tableColumns.value.map((c) => ({ key: c.key, label: c.label }))
  );
}

// drawer
const drawer = ref(false);
const picked = ref(null);
const drawerTitle = computed(() => picked.value?.Gene_Name || "Transcript Detail");
function openRow(r) {
  picked.value = r;
  drawer.value = true;
}

const atomOption = computed(() => {
  const r = picked.value || {};
  const L = Math.max(1, safeNum(r.Sequence_Length, 1));
  const items = [
    ["C", safeNum(r.C_count, 0), safeNum(r.C_count, 0) / L],
    ["H", safeNum(r.H_count, 0), safeNum(r.H_count, 0) / L],
    ["O", safeNum(r.O_count, 0), safeNum(r.O_count, 0) / L],
    ["N", safeNum(r.N_count, 0), safeNum(r.N_count, 0) / L],
    ["P", safeNum(r.P_count, 0), safeNum(r.P_count, 0) / L],
  ];
  return {
    tooltip: { trigger: "axis" },
    legend: { top: 10 },
    grid: { left: "12%", right: "6%", top: 45, bottom: 30 },
    xAxis: { type: "category", data: items.map((x) => x[0]) },
    yAxis: { type: "value" },
    series: [
      { name: "Total", type: "bar", data: items.map((x) => x[1]) },
      { name: "Per nt", type: "line", data: items.map((x) => round(x[2], 6)) },
    ],
  };
});

function heatmapOption(matrix, { min = 0, max = 1 } = {}) {
  const labels = matrix.labels;
  return {
    tooltip: { formatter: (p) => `${labels[p.data[1]]}${labels[p.data[0]]}: ${p.data[2]}` },
    grid: { left: 70, right: 10, top: 20, bottom: 55 },
    xAxis: { type: "category", data: labels },
    yAxis: { type: "category", data: labels },
    visualMap: { min, max, orient: "horizontal", left: "center", bottom: 10, calculable: true },
    series: [{ type: "heatmap", data: matrix.data, label: { show: true, formatter: (p) => p.data[2] } }],
  };
}

const dinucFreqOption = computed(() => {
  const m = extractDinucMatrix(picked.value || {}, "freq");
  return heatmapOption(m, { min: 0, max: 0.2 });
});

const dinucBiasOption = computed(() => {
  const m = extractDinucMatrix(picked.value || {}, "bias");
  return heatmapOption(m, { min: 0, max: 4 });
});

const triTopOption = computed(() => {
  const items = extractTopTrinuc(picked.value || {}, 12);
  return {
    tooltip: { trigger: "axis" },
    grid: { left: "20%", right: "6%", top: 20, bottom: 30 },
    xAxis: { type: "value", name: "freq" },
    yAxis: { type: "category", data: items.map((x) => x.name) },
    series: [{ type: "bar", data: items.map((x) => x.value), barWidth: "80%" }],
  };
});

const spacingOption = computed(() => {
  const r = picked.value || {};
  const items = [
    ["A", safeNum(r.A_avg_spacing, 0)],
    ["T", safeNum(r.T_avg_spacing, 0)],
    ["C", safeNum(r.C_avg_spacing, 0)],
    ["G", safeNum(r.G_avg_spacing, 0)],
  ];
  return {
    tooltip: { trigger: "axis" },
    grid: { left: "12%", right: "6%", top: 20, bottom: 30 },
    xAxis: { type: "category", data: items.map((x) => x[0]) },
    yAxis: { type: "value", name: "avg spacing" },
    series: [{ type: "bar", data: items.map((x) => x[1]), barWidth: "60%" }],
  };
});
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.sliders {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}
.sitem .lab {
  color: #909399;
  font-size: 12px;
  margin-bottom: 6px;
}
.pager {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}
.drawer-body {
  padding: 4px;
}
.hdr {
  font-weight: 800;
}
</style>
