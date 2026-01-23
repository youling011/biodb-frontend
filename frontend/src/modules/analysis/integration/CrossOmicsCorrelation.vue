<template>
  <div class="cross-omics">
    <div class="controls">
      <el-select v-model="method" style="width: 160px">
        <el-option label="Pearson" value="pearson" />
        <el-option label="Spearman" value="spearman" />
        <el-option label="Robust" value="robust" />
      </el-select>
      <el-select v-model="transform" style="width: 140px">
        <el-option label="None" value="none" />
        <el-option label="CLR" value="clr" />
      </el-select>
      <el-tag size="small" type="info" effect="plain">{{ method.toUpperCase() }}</el-tag>
    </div>
    <el-card shadow="never">
      <template #header><div class="hdr">Cross-omics correlation</div></template>
      <EChart :option="option" height="460px" />
    </el-card>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import EChart from "../../../components/EChart.vue";
import { clrTransform, pearson, robustCorr, spearmanCorr } from "../shared/stats";
import { setQueryValues, getQueryString } from "../../../utils/urlState";

const props = defineProps({
  vectors: { type: Array, default: () => [] },
});

const method = ref(getQueryString("int_corr", "pearson"));
const transform = ref(getQueryString("int_tf", "none"));

watch([method, transform], () => {
  setQueryValues({ int_corr: method.value, int_tf: transform.value });
});

const option = computed(() => {
  const features = ["C", "H", "O", "N", "P", "S", "C:N", "C:P", "N:P"];
  const calc = method.value === "spearman" ? spearmanCorr : method.value === "robust" ? robustCorr : pearson;
  const data = [];

  features.forEach((a, i) => {
    features.forEach((b, j) => {
      let xs = props.vectors.map((v) => v.vector?.[a]);
      let ys = props.vectors.map((v) => v.vector?.[b]);
      if (transform.value === "clr") {
        xs = clrTransform(xs, 1);
        ys = clrTransform(ys, 1);
      }
      const v = calc(xs, ys) ?? 0;
      data.push([j, i, Number(v.toFixed(3))]);
    });
  });

  return {
    tooltip: { position: "top" },
    grid: { left: "25%", right: "6%", top: 30, bottom: 40 },
    xAxis: { type: "category", data: features },
    yAxis: { type: "category", data: features },
    visualMap: { min: -1, max: 1, calculable: true, orient: "horizontal", bottom: 0 },
    series: [{ type: "heatmap", data }],
  };
});
</script>

<style scoped>
.controls {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}
.hdr { font-weight: 600; }
</style>
