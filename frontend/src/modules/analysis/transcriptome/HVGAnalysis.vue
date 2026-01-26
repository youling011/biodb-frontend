<template>
  <div class="hvg-panel">
    <div class="toolbar">
      <el-form :inline="true" label-position="top">
        <el-form-item label="Algorithm">
          <el-select v-model="algorithm" style="width: 160px">
            <el-option label="Seurat v2" value="seurat_v2" />
            <el-option label="Seurat v3" value="seurat_v3" />
            <el-option label="scanpy" value="scanpy" />
          </el-select>
        </el-form-item>
        <el-form-item label="Top genes">
          <el-select v-model="nTop" style="width: 120px">
            <el-option label="500" :value="500" />
            <el-option label="1000" :value="1000" />
            <el-option label="2000" :value="2000" />
          </el-select>
        </el-form-item>
        <el-form-item label="Batch key">
          <el-input v-model="batchKey" placeholder="batch" style="width: 140px" />
        </el-form-item>
        <el-form-item label="min_mean">
          <el-input-number v-model="minMean" :min="0" :step="0.1" />
        </el-form-item>
        <el-form-item label="max_mean">
          <el-input-number v-model="maxMean" :min="0" :step="0.1" />
        </el-form-item>
        <el-form-item label="min_disp">
          <el-input-number v-model="minDisp" :min="0" :step="0.1" />
        </el-form-item>
        <el-form-item label="">
          <el-button type="primary" @click="load">Apply</el-button>
        </el-form-item>
      </el-form>
    </div>

    <AsyncStateBlock :state="state" empty-text="No HVG result." :retry="load">
      <el-row :gutter="12">
        <el-col :xs="24" :lg="16">
          <el-card shadow="never">
            <template #header><div class="card-hdr"><span>Mean-Variance</span></div></template>
            <EChart :option="meanVarOption" height="420px" />
          </el-card>
        </el-col>
        <el-col :xs="24" :lg="8">
          <el-card shadow="never">
            <template #header>
              <div class="card-hdr">
                <span>Top HVGs</span>
                <el-button size="small" @click="sendToDE">Send to DE</el-button>
              </div>
            </template>
            <el-input v-model="kw" placeholder="Search gene" clearable style="margin-bottom: 8px" />
            <el-table :data="filteredTable" height="360" stripe>
              <el-table-column prop="gene" label="Gene" width="140" />
              <el-table-column prop="mean" label="Mean" width="100" />
              <el-table-column prop="variance" label="Var" width="100" />
              <el-table-column prop="score" label="Score" />
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </AsyncStateBlock>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import AsyncStateBlock from "../../../components/AsyncStateBlock.vue";
import EChart from "../../../components/EChart.vue";
import { getTranscriptomeHVG } from "../../../api";
import { buildMeanVarOption } from "../shared/echartsKit";
import { getQueryNumber, getQueryString, setQueryValues } from "../../../utils/urlState";

const props = defineProps({
  sampleId: { type: [String, Number], required: true },
});

const loading = ref(false);
const error = ref("");
const result = ref({ points: [], fit: [], hvg_table: [] });

const algorithm = ref(getQueryString("hvg_alg", "seurat_v3"));
const nTop = ref(getQueryNumber("hvg_top", 1000));
const batchKey = ref(getQueryString("hvg_batch", ""));
const minMean = ref(getQueryNumber("hvg_min_mean", 0.01));
const maxMean = ref(getQueryNumber("hvg_max_mean", 10));
const minDisp = ref(getQueryNumber("hvg_min_disp", 0.5));
const kw = ref("");

const state = computed(() => {
  if (loading.value) return "loading";
  if (error.value) return "error";
  if (!result.value?.points?.length) return "empty";
  return "ready";
});

async function load() {
  if (!props.sampleId) return;
  loading.value = true;
  error.value = "";
  try {
    const data = await getTranscriptomeHVG(props.sampleId, {
      algorithm: algorithm.value,
      n_top_genes: nTop.value,
      batch_key: batchKey.value,
      min_mean: minMean.value,
      max_mean: maxMean.value,
      min_disp: minDisp.value,
    });
    result.value = data || {};
  } catch (e) {
    error.value = String(e?.message || e);
  } finally {
    loading.value = false;
  }
}

watch(() => props.sampleId, load, { immediate: true });
watch([algorithm, nTop, batchKey, minMean, maxMean, minDisp], () => {
  setQueryValues({
    hvg_alg: algorithm.value,
    hvg_top: nTop.value,
    hvg_batch: batchKey.value,
    hvg_min_mean: minMean.value,
    hvg_max_mean: maxMean.value,
    hvg_min_disp: minDisp.value,
  });
});

const meanVarOption = computed(() => buildMeanVarOption(result.value, {
  xName: "Mean",
  yName: "Variance",
}));

const filteredTable = computed(() => {
  const rows = Array.isArray(result.value?.hvg_table) ? result.value.hvg_table : [];
  const q = kw.value.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => String(r.gene || "").toLowerCase().includes(q));
});

function sendToDE() {
  const genes = filteredTable.value.slice(0, 200).map((r) => r.gene);
  localStorage.setItem("biostoich_hvg_genes", JSON.stringify(genes));
}
</script>

<style scoped>
.hvg-panel {
  width: 100%;
}
.toolbar {
  margin-bottom: 10px;
}
.card-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
