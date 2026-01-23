<template>
  <div class="corr">
    <div class="controls">
      <el-select v-model="method" style="width: 160px">
        <el-option label="Pearson" value="pearson" />
        <el-option label="Spearman" value="spearman" />
        <el-option label="Robust" value="robust" />
      </el-select>
      <el-select v-model="transform" style="width: 140px">
        <el-option label="None" value="none" />
        <el-option label="log1p" value="log1p" />
        <el-option label="CLR" value="clr" />
      </el-select>
      <el-select v-model="impute" style="width: 140px">
        <el-option label="drop" value="drop" />
        <el-option label="zero" value="zero" />
        <el-option label="pseudocount" value="pseudocount" />
        <el-option label="median" value="median" />
      </el-select>
      <el-switch v-model="absMode" active-text="Absolute" />
      <el-tag size="small" type="info" effect="plain">method: {{ method }}</el-tag>
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
import { computed, ref, watch } from "vue";
import EChart from "../../../components/EChart.vue";
import { clrTransform, median, pearson, robustCorr, spearmanCorr } from "../shared/stats";
import { getQueryString, setQueryValues } from "../../../utils/urlState";

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
const method = ref(getQueryString("prot_corr", "pearson"));
const transform = ref(getQueryString("prot_tf", "none"));
const impute = ref(getQueryString("prot_imp", "drop"));
const absMode = ref(false);

watch([method, transform, impute], () => {
  setQueryValues({ prot_corr: method.value, prot_tf: transform.value, prot_imp: impute.value });
});

function prepareSeries(values) {
  const arr = values.map((v) => Number(v));
  if (impute.value === "drop") return arr.filter((v) => Number.isFinite(v));
  if (impute.value === "zero") return arr.map((v) => (Number.isFinite(v) ? v : 0));
  if (impute.value === "pseudocount") return arr.map((v) => (Number.isFinite(v) ? v : 1));
  if (impute.value === "median") {
    const med = median(arr.filter((v) => Number.isFinite(v))) || 0;
    return arr.map((v) => (Number.isFinite(v) ? v : med));
  }
  return arr;
}

const heatmapOption = computed(() => {
  const keys = selectedKeys.value.length ? selectedKeys.value : featureKeys;
  const data = [];
  const calc = method.value === "spearman" ? spearmanCorr : method.value === "robust" ? robustCorr : pearson;
  keys.forEach((a, i) => {
    keys.forEach((b, j) => {
      let xs = prepareSeries(props.rows.map((r) => r[a]));
      let ys = prepareSeries(props.rows.map((r) => r[b]));
      if (transform.value === "log1p") {
        xs = xs.map((v) => Math.log1p(Math.max(0, v)));
        ys = ys.map((v) => Math.log1p(Math.max(0, v)));
      }
      if (transform.value === "clr") {
        xs = clrTransform(xs, 1);
        ys = clrTransform(ys, 1);
      }
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
