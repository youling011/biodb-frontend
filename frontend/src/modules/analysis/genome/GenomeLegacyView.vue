<template>
  <div>
    <el-alert
      type="info"
      show-icon
      :closable="false"
      title="Legacy View (Demo)"
      description="This tab was previously a placeholder. For demo/showcase purposes, it now renders legacy-style summary charts and tables using the same dataset that powers the other tabs."
      style="margin-bottom: 12px;"
    />

    <!-- Reuse Overview so the tab is never blank -->
    <GenomeOverview :rows="rows" :categories="categories" :derived="derived" />

    <el-divider />

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="hdr">
              <span>Element Boxplot (C/N/O/P)</span>
            </div>
          </template>
          <EChart :option="elementBoxplotOption" height="320px" />
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="hdr">
              <span>GC% vs Nitrogen Atoms (Scatter)</span>
            </div>
          </template>
          <EChart :option="gcNScatterOption" height="320px" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 14px;">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="hdr">
              <span>Top N-cost Genes (N/Length)</span>
            </div>
          </template>
          <el-table :data="topNCost" size="small" height="320" style="width: 100%">
            <el-table-column prop="Gene_Name" label="Gene" min-width="160" />
            <el-table-column prop="Length_bp" label="Length" width="90" />
            <el-table-column prop="Nitrogen_Atoms" label="N" width="90" />
            <el-table-column label="N/Len" width="90">
              <template #default="{ row }">
                {{ ratio(row.Nitrogen_Atoms, row.Length_bp) }}
              </template>
            </el-table-column>
            <el-table-column prop="Function_Category" label="Category" min-width="120" />
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="hdr">
              <span>Lowest C:N Genes</span>
            </div>
          </template>
          <el-table :data="lowCn" size="small" height="320" style="width: 100%">
            <el-table-column prop="Gene_Name" label="Gene" min-width="160" />
            <el-table-column prop="Carbon_Atoms" label="C" width="90" />
            <el-table-column prop="Nitrogen_Atoms" label="N" width="90" />
            <el-table-column label="C:N" width="90">
              <template #default="{ row }">
                {{ ratio(row.Carbon_Atoms, row.Nitrogen_Atoms) }}
              </template>
            </el-table-column>
            <el-table-column prop="Function_Category" label="Category" min-width="120" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed } from "vue";
import EChart from "../../../components/EChart.vue";
import GenomeOverview from "./GenomeOverview.vue";
import { buildBoxplotOption, buildScatterOption } from "../shared/echartsKit";

const props = defineProps({
  rows: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
  // { charts, tables, observed } (or a charts object)
  derived: { type: Object, default: () => ({}) },
});

function getDerivedCharts() {
  const d = props.derived || {};
  if (d?.charts && typeof d.charts === "object") return d.charts;
  if (d && typeof d === "object" && (d.element_boxplot || d.gc_scatter || d.cn_histogram)) return d;
  const fromRows = props.rows && props.rows.__derived && props.rows.__derived.charts;
  return (fromRows && typeof fromRows === "object") ? fromRows : {};
}

function getDerivedTables() {
  const d = props.derived || {};
  if (d?.tables && typeof d.tables === "object") return d.tables;
  const fromRows = props.rows && props.rows.__derived && props.rows.__derived.tables;
  return (fromRows && typeof fromRows === "object") ? fromRows : {};
}

const charts = computed(() => getDerivedCharts());
const tables = computed(() => getDerivedTables());

const elementBoxplotOption = computed(() => {
  const box = charts.value?.element_boxplot;
  // Expected: [[min,q1,median,q3,max], ...] for C/N/O/P
  const boxData = Array.isArray(box) ? box : [];
  return buildBoxplotOption(
    {
      categories: ["C", "N", "O", "P"],
      boxData,
      outliers: [],
    },
    {
      title: "",
      yName: "Atoms",
      toolbox: true,
    }
  );
});

const gcNScatterOption = computed(() => {
  const raw = charts.value?.gc_scatter;
  // Expected points: [gc, N, gene]
  const points = (Array.isArray(raw) ? raw : [])
    .map((p) => Array.isArray(p) ? ({ x: p[0], y: p[1], name: p[2] }) : null)
    .filter(Boolean);

  return buildScatterOption(
    { points },
    {
      title: "",
      xName: "GC%",
      yName: "Nitrogen Atoms",
      xMin: 0,
      xMax: 100,
      symbolSize: 5,
      dataZoom: true,
      tooltipFormatter: (params) => {
        const v = params?.value || [];
        const nm = params?.name ? `${params.name}<br/>` : "";
        return `${nm}GC%: ${v[0]}<br/>N: ${v[1]}`;
      },
    }
  );
});

const topNCost = computed(() => {
  const arr = tables.value?.top_n_cost;
  return Array.isArray(arr) ? arr : [];
});

const lowCn = computed(() => {
  const arr = tables.value?.low_cn_ratio;
  return Array.isArray(arr) ? arr : [];
});

function ratio(a, b) {
  const x = Number(a);
  const y = Math.max(1, Number(b));
  const r = Number.isFinite(x) ? x / y : 0;
  return (Math.round(r * 1000) / 1000).toFixed(3);
}
</script>

<style scoped>
.hdr { display: flex; align-items: center; justify-content: space-between; }
</style>
