<template>
  <div class="corr">
    <div class="controls">
      <el-select v-model="method" style="width: 160px">
        <el-option label="Pearson" value="pearson" />
        <el-option label="Spearman" value="spearman" />
      </el-select>
      <el-switch v-model="absMode" active-text="Absolute" />
      <el-popover placement="bottom" :width="380" trigger="click">
        <template #reference>
          <el-button>Features</el-button>
        </template>
        <el-checkbox-group v-model="selectedKeys">
          <el-checkbox v-for="k in featureKeys" :key="k" :label="k">
            {{ k }}
          </el-checkbox>
        </el-checkbox-group>
      </el-popover>
    </div>

    <el-card>
      <template #header><div class="hdr">Correlation Heatmap</div></template>
      <EChart :option="heatmapOption" height="520px" />
    </el-card>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import EChart from "../../../components/EChart.vue";
import { pearson, spearman } from "./proteomeUtils";

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

const featureKeys = [
  "Sequence_Length",
  "Molecular_Weight",
  "pI",
  "Net_Charge",
  "GRAVY",
  "Aromaticity",
  "Aliphatic_Index",
  "Instability_Index",
  "Flexibility",
  "Solvent_Accessibility",
  "Helix_Propensity",
  "Sheet_Propensity",
  "Turn_Propensity",
  "Sequence_Entropy",
  "Disulfide_Potential",
];

const selectedKeys = ref([...featureKeys]);
const method = ref("pearson");
const absMode = ref(false);

const heatmapOption = computed(() => {
  const keys = selectedKeys.value.length ? selectedKeys.value : featureKeys;
  const data = [];
  const calc = method.value === "spearman" ? spearman : pearson;
  keys.forEach((a, i) => {
    keys.forEach((b, j) => {
      const xs = props.rows.map((r) => r[a]);
      const ys = props.rows.map((r) => r[b]);
      let v = calc(xs, ys);
      if (absMode.value) v = Math.abs(v);
      data.push([j, i, Number(v.toFixed(3))]);
    });
  });
  return {
    tooltip: { position: "top" },
    grid: { left: "25%", right: "6%", top: 30, bottom: 40 },
    xAxis: { type: "category", data: keys },
    yAxis: { type: "category", data: keys },
    visualMap: { min: absMode.value ? 0 : -1, max: 1, calculable: true, orient: "horizontal", bottom: 0 },
    series: [{ type: "heatmap", data }],
  };
});
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
