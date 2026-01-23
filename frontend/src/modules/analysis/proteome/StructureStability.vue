<template>
  <div class="structure">
    <div class="controls">
      <el-select v-model="colorBy" style="width: 200px">
        <el-option label="Color by GRAVY" value="GRAVY" />
        <el-option label="Color by pI" value="pI" />
        <el-option label="Color by Length" value="Sequence_Length" />
      </el-select>
      <el-slider v-model="instabilityThreshold" :min="10" :max="80" :step="5" style="width: 220px" />
      <el-switch v-model="disulfideOnly" active-text="Disulfide > 0" />
    </div>

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card>
          <template #header><div class="hdr">Helix / Sheet / Turn Distributions</div></template>
          <EChart :option="helixHist" height="240px" />
          <EChart :option="sheetHist" height="240px" style="margin-top: 10px;" />
          <EChart :option="turnHist" height="240px" style="margin-top: 10px;" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><div class="hdr">Helix vs Sheet</div></template>
          <EChart :option="scatterOption" height="320px" />
        </el-card>
        <el-card style="margin-top: 14px;">
          <template #header><div class="hdr">Instability Distribution</div></template>
          <EChart :option="instabilityHist" height="240px" />
        </el-card>
        <el-card style="margin-top: 14px;">
          <template #header><div class="hdr">Disulfide Potential</div></template>
          <EChart :option="disulfideHist" height="220px" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import EChart from "../../../components/EChart.vue";
import { histOption } from "./proteomeUtils";

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

const colorBy = ref("GRAVY");
const instabilityThreshold = ref(40);
const disulfideOnly = ref(false);

const filtered = computed(() => {
  if (!disulfideOnly.value) return props.rows;
  return props.rows.filter((r) => r.Disulfide_Potential > 0);
});

const helixHist = computed(() => histOption(filtered.value.map((r) => r.Helix_Propensity), "Helix", 22));
const sheetHist = computed(() => histOption(filtered.value.map((r) => r.Sheet_Propensity), "Sheet", 22));
const turnHist = computed(() => histOption(filtered.value.map((r) => r.Turn_Propensity), "Turn", 22));

const scatterOption = computed(() => {
  const data = filtered.value.map((r) => [r.Helix_Propensity, r.Sheet_Propensity, r[colorBy.value]]);
  return {
    tooltip: { formatter: (p) => `Helix: ${p.data[0]}<br/>Sheet: ${p.data[1]}<br/>${colorBy.value}: ${p.data[2]}` },
    grid: { left: "10%", right: "6%", top: 20, bottom: 50 },
    xAxis: { name: "Helix", scale: true },
    yAxis: { name: "Sheet", scale: true },
    visualMap: { min: 0, max: 2, dimension: 2, right: 10, top: 10 },
    series: [{ type: "scatter", data, symbolSize: 6 }],
  };
});

const instabilityHist = computed(() => {
  const option = histOption(filtered.value.map((r) => r.Instability_Index), "Instability", 24);
  option.markLine = {
    symbol: "none",
    data: [{ xAxis: instabilityThreshold.value }],
  };
  return option;
});

const disulfideHist = computed(() => histOption(filtered.value.map((r) => r.Disulfide_Potential), "Disulfide", 20));
</script>

<style scoped>
.controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.hdr { font-weight: 600; }
</style>
