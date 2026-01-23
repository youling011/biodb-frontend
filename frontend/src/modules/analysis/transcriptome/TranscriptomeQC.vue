<template>
  <div class="tx-qc">
    <AsyncStateBlock
      :state="state"
      empty-text="No QC metrics available."
      :retry="load"
    >
      <el-card class="data-layer" shadow="never">
        <div class="layer-title">Data Layer Declaration</div>
        <div class="layer-tags">
          <el-tag type="info" effect="plain">raw counts: {{ layer.raw ? 'yes' : 'no' }}</el-tag>
          <el-tag type="success" effect="plain">normalized: {{ layer.normalized ? 'yes' : 'no' }}</el-tag>
          <el-tag type="warning" effect="plain">log1p: {{ layer.log1p ? 'yes' : 'no' }}</el-tag>
        </div>
      </el-card>

      <el-row :gutter="12" style="margin-top: 12px;">
        <el-col :xs="24" :lg="8">
          <el-card shadow="never">
            <template #header><div class="card-hdr"><span>Total counts</span></div></template>
            <EChart :option="countsHist" height="280px" />
          </el-card>
        </el-col>
        <el-col :xs="24" :lg="8">
          <el-card shadow="never">
            <template #header><div class="card-hdr"><span>Detected genes</span></div></template>
            <EChart :option="genesBox" height="280px" />
          </el-card>
        </el-col>
        <el-col :xs="24" :lg="8">
          <el-card shadow="never">
            <template #header><div class="card-hdr"><span>Counts vs Genes</span></div></template>
            <EChart :option="countsScatter" height="280px" />
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" style="margin-top: 12px;">
        <template #header>
          <div class="card-hdr">
            <span>Normalization Parameters</span>
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="Size factor">{{ normalization.size_factor }}</el-descriptions-item>
          <el-descriptions-item label="log1p">{{ normalization.log1p ? 'yes' : 'no' }}</el-descriptions-item>
          <el-descriptions-item label="Regress covariates">{{ normalization.regress_covariates?.join(', ') || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card shadow="never" style="margin-top: 12px;">
        <template #header><div class="card-hdr"><span>QC Metrics</span></div></template>
        <el-table :data="qcMetrics" height="320" stripe>
          <el-table-column prop="sample" label="Sample" width="120" />
          <el-table-column prop="total_counts" label="Total Counts" width="140" sortable />
          <el-table-column prop="detected_genes" label="Detected Genes" width="150" sortable />
          <el-table-column prop="mito_ratio" label="Mito Ratio" width="120" />
          <el-table-column prop="batch" label="Batch" width="120" />
        </el-table>
      </el-card>
    </AsyncStateBlock>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import AsyncStateBlock from "../../../components/AsyncStateBlock.vue";
import EChart from "../../../components/EChart.vue";
import { getTranscriptomeQC } from "../../../api";
import { buildBoxplotOption, buildHistOption, buildScatterOption } from "../shared/echartsKit";
import { buildEChartsBoxplot } from "../shared/stats";

const props = defineProps({
  sampleId: { type: [String, Number], required: true },
});

const loading = ref(false);
const qcMetrics = ref([]);
const normalization = ref({});
const layer = ref({ raw: false, normalized: false, log1p: false });
const error = ref("");

const state = computed(() => {
  if (loading.value) return "loading";
  if (error.value) return "error";
  if (!qcMetrics.value.length) return "empty";
  return "ready";
});

async function load() {
  if (!props.sampleId) return;
  loading.value = true;
  error.value = "";
  try {
    const data = await getTranscriptomeQC(props.sampleId, {});
    qcMetrics.value = Array.isArray(data?.qc_metrics) ? data.qc_metrics : [];
    normalization.value = data?.normalization || {};
    layer.value = data?.data_layer || {};
  } catch (e) {
    error.value = String(e?.message || e);
  } finally {
    loading.value = false;
  }
}

watch(() => props.sampleId, load, { immediate: true });

function buildSimpleHist(values, bins = 12) {
  const arr = values.filter((v) => Number.isFinite(Number(v)));
  if (!arr.length) return { bins: [], counts: [] };
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const step = (max - min) / bins || 1;
  const counts = new Array(bins).fill(0);
  for (const v of arr) {
    const idx = Math.min(bins - 1, Math.floor((v - min) / step));
    counts[idx] += 1;
  }
  const labels = counts.map((_, i) => `${Math.round(min + i * step)}-${Math.round(min + (i + 1) * step)}`);
  return { bins: labels, counts };
}

const countsHist = computed(() => {
  const hist = buildSimpleHist(qcMetrics.value.map((m) => m.total_counts));
  return buildHistOption(hist, { title: "", xName: "Total counts", dataZoom: true });
});

const genesBox = computed(() => {
  const data = buildEChartsBoxplot({ "Detected genes": qcMetrics.value.map((m) => m.detected_genes) });
  return buildBoxplotOption(data, { title: "" });
});

const countsScatter = computed(() => buildScatterOption({
  points: qcMetrics.value.map((m) => ({ x: m.total_counts, y: m.detected_genes, name: m.sample })),
}, {
  xName: "Total counts",
  yName: "Detected genes",
}));
</script>

<style scoped>
.tx-qc {
  width: 100%;
}
.data-layer {
  background: #f7f9fc;
}
.layer-title {
  font-weight: 600;
  margin-bottom: 6px;
}
.layer-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.card-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
