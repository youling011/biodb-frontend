<template>
  <div class="landscape">
    <div class="controls">
      <el-select v-model="xKey" style="width: 200px">
        <el-option v-for="k in featureKeys" :key="k" :label="k" :value="k" />
      </el-select>
      <el-select v-model="yKey" style="width: 200px">
        <el-option v-for="k in featureKeys" :key="k" :label="k" :value="k" />
      </el-select>
      <el-select v-model="colorMode" style="width: 200px">
        <el-option label="Length groups" value="length" />
        <el-option label="Disulfide > 0" value="disulfide" />
      </el-select>
      <el-select v-model="lengthGroup" style="width: 200px">
        <el-option label="All lengths" value="all" />
        <el-option label="Short (Q1)" value="short" />
        <el-option label="Medium (Q2-Q3)" value="medium" />
        <el-option label="Long (Q4)" value="long" />
      </el-select>
      <el-button type="primary" plain @click="exportCsv">Export Selection</el-button>
    </div>

    <el-row :gutter="16">
      <el-col :span="16">
        <el-card>
          <template #header><div class="hdr">Scatter Explorer</div></template>
          <EChart :option="scatterOption" height="420px" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header><div class="hdr">Selected Proteins</div></template>
          <el-table :data="tableRows" height="420">
            <el-table-column prop="Protein_ID" label="Protein ID" width="140" />
            <el-table-column prop="Sequence_Length" label="Length" width="110" />
            <el-table-column :prop="xKey" :label="xKey" width="120" />
            <el-table-column :prop="yKey" :label="yKey" width="120" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import EChart from "../../../components/EChart.vue";
import { exportObjectsToCsv } from "../../../utils/exportCsv";

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

const featureKeys = [
  "pI",
  "Net_Charge",
  "GRAVY",
  "Solvent_Accessibility",
  "Aliphatic_Index",
  "Instability_Index",
  "Flexibility",
  "Hydrophilicity",
];

const xKey = ref("pI");
const yKey = ref("Net_Charge");
const colorMode = ref("length");
const lengthGroup = ref("all");

const lengthSorted = computed(() => props.rows.map((r) => r.Sequence_Length).sort((a, b) => a - b));
const q1 = computed(() => lengthSorted.value[Math.floor(lengthSorted.value.length * 0.25)] || 0);
const q3 = computed(() => lengthSorted.value[Math.floor(lengthSorted.value.length * 0.75)] || 0);

const filtered = computed(() => {
  if (lengthGroup.value === "all") return props.rows;
  if (lengthGroup.value === "short") return props.rows.filter((r) => r.Sequence_Length <= q1.value);
  if (lengthGroup.value === "medium") return props.rows.filter((r) => r.Sequence_Length > q1.value && r.Sequence_Length <= q3.value);
  return props.rows.filter((r) => r.Sequence_Length > q3.value);
});

const tableRows = computed(() => filtered.value.slice(0, 30));

const scatterOption = computed(() => {
  const groups = {
    short: [],
    medium: [],
    long: [],
    disulfide: [],
    noDisulfide: [],
  };
  filtered.value.forEach((r) => {
    const point = [r[xKey.value], r[yKey.value], r.Protein_ID];
    if (colorMode.value === "length") {
      if (r.Sequence_Length <= q1.value) groups.short.push(point);
      else if (r.Sequence_Length <= q3.value) groups.medium.push(point);
      else groups.long.push(point);
    } else {
      if (r.Disulfide_Potential > 0) groups.disulfide.push(point);
      else groups.noDisulfide.push(point);
    }
  });

  const series = colorMode.value === "length"
    ? [
        { name: "Short", data: groups.short },
        { name: "Medium", data: groups.medium },
        { name: "Long", data: groups.long },
      ]
    : [
        { name: "Disulfide > 0", data: groups.disulfide },
        { name: "Disulfide = 0", data: groups.noDisulfide },
      ];

  return {
    tooltip: { formatter: (p) => `${p.data[2]}<br/>${xKey.value}: ${p.data[0]}<br/>${yKey.value}: ${p.data[1]}` },
    legend: { top: 10 },
    grid: { left: "10%", right: "6%", top: 40, bottom: 50 },
    xAxis: { name: xKey.value, scale: true },
    yAxis: { name: yKey.value, scale: true },
    series: series.map((s) => ({ ...s, type: "scatter", symbolSize: 6 })),
  };
});

function exportCsv() {
  exportObjectsToCsv(
    "proteome_landscape_selection.csv",
    filtered.value,
    [
      { key: "Protein_ID", label: "Protein ID" },
      { key: "Sequence_Length", label: "Length" },
      { key: xKey.value, label: xKey.value },
      { key: yKey.value, label: yKey.value },
    ]
  );
}
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
