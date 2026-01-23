<template>
  <div class="joint-pca">
    <div class="controls">
      <el-select v-model="colorBy" style="width: 160px">
        <el-option label="Taxonomy" value="taxonomy" />
        <el-option label="Omics" value="omics" />
      </el-select>
      <el-select v-model="transform" style="width: 140px">
        <el-option label="None" value="none" />
        <el-option label="CLR" value="clr" />
      </el-select>
      <el-switch v-model="standardize" active-text="Standardize" />
      <el-button size="small" @click="clearSelection">Clear selection</el-button>
    </div>
    <el-card shadow="never">
      <template #header>
        <div class="hdr">Joint PCA</div>
      </template>
      <EChart ref="chartRef" :option="option" height="520px" />
      <div class="note">Use brush selection to select samples and push to MultiAnalysis.</div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import EChart from "../../../components/EChart.vue";
import { runPCA } from "../shared/pca";
import { setQueryList, setQueryValues, getQueryString } from "../../../utils/urlState";

const props = defineProps({
  vectors: { type: Array, default: () => [] },
});
const emit = defineEmits(["selection"]);

const colorBy = ref(getQueryString("int_color", "taxonomy"));
const transform = ref(getQueryString("int_pca_tf", "none"));
const standardize = ref(getQueryString("int_pca_std", "1") !== "0");
const chartRef = ref(null);

watch([colorBy, transform, standardize], () => {
  setQueryValues({
    int_color: colorBy.value,
    int_pca_tf: transform.value,
    int_pca_std: standardize.value ? 1 : 0,
  });
});

const option = computed(() => {
  const feats = ["C", "H", "O", "N", "P", "S", "C:N", "C:P", "N:P"];
  const matrix = props.vectors.map((v) => feats.map((k) => Number(v.vector?.[k] || 0)));
  const res = runPCA(matrix, {
    k: 2,
    standardize: standardize.value,
    clr: transform.value === "clr",
  });
  const scores = res.scores || [];

  const data = props.vectors.map((v, i) => ({
    value: [scores?.[i]?.[0] ?? 0, scores?.[i]?.[1] ?? 0],
    name: `${v.species_name} (${v.omics_type})`,
    id: v.id,
    group: colorBy.value === "taxonomy" ? v.taxonomy : v.omics_type,
  }));

  const groups = Array.from(new Set(data.map((d) => d.group)));
  const series = groups.map((g) => ({
    name: g,
    type: "scatter",
    data: data.filter((d) => d.group === g),
    symbolSize: 8,
  }));

  return {
    toolbox: { feature: { brush: { type: ["rect", "polygon", "clear"] } } },
    brush: { toolbox: ["rect", "polygon", "clear"], xAxisIndex: "all", yAxisIndex: "all" },
    tooltip: { trigger: "item" },
    xAxis: { type: "value", name: "PC1" },
    yAxis: { type: "value", name: "PC2" },
    legend: { top: 10 },
    series,
  };
});

function clearSelection() {
  emit("selection", []);
  setQueryList("selected", []);
}

function bindBrush() {
  const inst = chartRef.value?.getInstance?.();
  if (!inst) return;
  inst.off("brushSelected");
  inst.on("brushSelected", (params) => {
    const selected = params.batch?.[0]?.selected || [];
    const ids = [];
    selected.forEach((sel) => {
      sel.dataIndex.forEach((idx) => {
        const data = inst.getOption().series[sel.seriesIndex].data[idx];
        if (data?.id) ids.push(data.id);
      });
    });
    emit("selection", ids);
    setQueryList("selected", ids);
  });
}

onMounted(bindBrush);
watch(option, bindBrush);
</script>

<style scoped>
.controls {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}
.hdr { font-weight: 600; }
.note { margin-top: 8px; color: #606266; font-size: 12px; }
</style>
