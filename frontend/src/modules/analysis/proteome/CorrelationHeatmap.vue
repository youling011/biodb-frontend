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
      <el-tag v-if="loading" size="small" type="warning" effect="plain">Computing {{ Math.round(progress * 100) }}%</el-tag>
      <el-button v-if="loading" size="small" @click="cancelJob">Cancel</el-button>
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
      <EChart :option="heatmapOption" height="520px" :loading="loading" />
    </el-card>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import EChart from "../../../components/EChart.vue";
import { getQueryString, setQueryValues } from "../../../utils/urlState";
import { runWorkerJob } from "../../../utils/jobClient";

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
const absMode = ref(getQueryString("prot_abs", "0") === "1");
const loading = ref(false);
const progress = ref(0);
const heatmapData = ref([]);
let abortController = null;

watch([method, transform, impute, absMode], () => {
  setQueryValues({
    prot_corr: method.value,
    prot_tf: transform.value,
    prot_imp: impute.value,
    prot_abs: absMode.value ? 1 : 0,
  });
});

function cancelJob() {
  abortController?.abort();
  abortController = null;
  loading.value = false;
}

async function runJob() {
  if (!props.rows.length) {
    heatmapData.value = [];
    return;
  }
  cancelJob();
  abortController = new AbortController();
  loading.value = true;
  progress.value = 0;
  try {
    const keys = selectedKeys.value.length ? selectedKeys.value : featureKeys;
    const data = await runWorkerJob(
      "corr",
      { rows: props.rows, keys, method: method.value, transform: transform.value, impute: impute.value },
      {
        signal: abortController.signal,
        onProgress: (p) => {
          progress.value = p;
        },
      }
    );
    heatmapData.value = data || [];
  } finally {
    loading.value = false;
    progress.value = 0;
  }
}

const heatmapOption = computed(() => {
  const keys = selectedKeys.value.length ? selectedKeys.value : featureKeys;
  const data = (heatmapData.value || []).map((d) => {
    if (!absMode.value) return d;
    return [d[0], d[1], Math.abs(d[2])];
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

watch([() => props.rows, method, transform, impute, selectedKeys], runJob, { immediate: true, deep: true });
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
