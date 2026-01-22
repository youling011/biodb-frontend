<template>
  <div class="fingerprint">
    <div class="controls">
      <el-select v-model="subsetMode" style="width: 220px">
        <el-option label="Top 40 longest" value="longest" />
        <el-option label="Top 40 shortest" value="shortest" />
        <el-option label="pI tertiles: acidic" value="acidic" />
        <el-option label="pI tertiles: neutral" value="neutral" />
        <el-option label="pI tertiles: basic" value="basic" />
      </el-select>
      <el-select v-model="sortMode" style="width: 200px">
        <el-option label="Sort by length" value="length" />
        <el-option label="Sort by pI" value="pI" />
        <el-option label="Sort by GRAVY" value="gravy" />
      </el-select>
    </div>

    <el-row :gutter="16">
      <el-col :span="14">
        <el-card>
          <template #header><div class="hdr">AA Composition Heatmap</div></template>
          <EChart :option="heatmapOption" height="420px" />
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card>
          <template #header><div class="hdr">Average AA Profile</div></template>
          <EChart :option="avgOption" height="240px" />
        </el-card>

        <el-card style="margin-top: 14px;">
          <template #header><div class="hdr">AA Category Ratios</div></template>
          <EChart :option="catOption" height="240px" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import EChart from "../../../components/EChart.vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

const subsetMode = ref("longest");
const sortMode = ref("length");

const aaKeys = computed(() => props.rows.length ? Object.keys(props.rows[0]).filter((k) => k.startsWith("AA_")) : []);

const subset = computed(() => {
  const rows = [...props.rows];
  if (subsetMode.value === "longest") {
    return rows.sort((a, b) => b.Sequence_Length - a.Sequence_Length).slice(0, 40);
  }
  if (subsetMode.value === "shortest") {
    return rows.sort((a, b) => a.Sequence_Length - b.Sequence_Length).slice(0, 40);
  }
  const sortedPI = rows.map((r) => r.pI).sort((a, b) => a - b);
  const t1 = sortedPI[Math.floor(sortedPI.length / 3)];
  const t2 = sortedPI[Math.floor((2 * sortedPI.length) / 3)];
  if (subsetMode.value === "acidic") return rows.filter((r) => r.pI <= t1).slice(0, 40);
  if (subsetMode.value === "neutral") return rows.filter((r) => r.pI > t1 && r.pI <= t2).slice(0, 40);
  return rows.filter((r) => r.pI > t2).slice(0, 40);
});

const sortedSubset = computed(() => {
  const rows = [...subset.value];
  if (sortMode.value === "length") return rows.sort((a, b) => b.Sequence_Length - a.Sequence_Length);
  if (sortMode.value === "pI") return rows.sort((a, b) => b.pI - a.pI);
  return rows.sort((a, b) => b.GRAVY - a.GRAVY);
});

const heatmapOption = computed(() => {
  const xs = aaKeys.value.map((k) => k.replace("AA_", ""));
  const ys = sortedSubset.value.map((r) => r.Protein_ID);
  const data = [];
  sortedSubset.value.forEach((row, i) => {
    aaKeys.value.forEach((k, j) => {
      data.push([j, i, row[k]]);
    });
  });
  return {
    tooltip: { position: "top" },
    grid: { left: "25%", right: "10%", top: 30, bottom: 30 },
    xAxis: { type: "category", data: xs },
    yAxis: { type: "category", data: ys },
    visualMap: { min: 0, max: 12, calculable: true, orient: "horizontal", bottom: 0 },
    series: [{ type: "heatmap", data }],
  };
});

const avgOption = computed(() => {
  const avg = aaKeys.value.map((k) => {
    const vals = sortedSubset.value.map((r) => r[k]);
    const v = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
    return v;
  });
  return {
    tooltip: { trigger: "axis" },
    grid: { left: "10%", right: "6%", top: 20, bottom: 50 },
    xAxis: { type: "category", data: aaKeys.value.map((k) => k.replace("AA_", "")) },
    yAxis: { type: "value" },
    series: [{ type: "bar", data: avg }],
  };
});

const catOption = computed(() => {
  const avg = (key) => {
    const vals = sortedSubset.value.map((r) => r[key]);
    return vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
  };
  const data = [
    { name: "Acidic", value: avg("Acidic_AA") },
    { name: "Basic", value: avg("Basic_AA") },
    { name: "Polar", value: avg("Polar_AA") },
    { name: "Nonpolar", value: avg("Nonpolar_AA") },
  ];
  return {
    tooltip: { trigger: "axis" },
    grid: { left: "20%", right: "10%", top: 20, bottom: 20 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: data.map((d) => d.name) },
    series: [{ type: "bar", data: data.map((d) => d.value) }],
  };
});
</script>

<style scoped>
.controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.hdr { font-weight: 600; }
</style>
