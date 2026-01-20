<template>
  <div class="multi-panel" v-loading="loading">
    <div class="head">
      <div class="ttl">
        <h3>{{ title }}</h3>
        <el-tag size="small" effect="plain">{{ omics }}</el-tag>
      </div>
      <el-button type="success" @click="run" :disabled="!ready">Run Screening</el-button>
    </div>

    <el-alert
      v-if="omics === 'PROTEOME'"
      type="info"
      show-icon
      :closable="false"
      title="Proteome is currently a placeholder"
      description="Phase 2 keeps the Proteome module position in the UI, but does not simulate proteome data yet. Screening is disabled for this tab."
      style="margin-top: 12px;"
    />

    <el-row :gutter="16" style="margin-top: 12px;">
      <el-col :span="7">
        <el-card class="control">
          <h4><el-icon><Filter /></el-icon> Groups & Thresholds</h4>

          <el-form label-position="top">
            <el-form-item label="Group A">
              <el-select v-model="groupA" multiple collapse-tags placeholder="Select Group A">
                <el-option v-for="s in groupAOptions" :key="s.id" :label="s.species_name" :value="s.id" />
              </el-select>
            </el-form-item>

            <el-form-item label="Group B">
              <el-select v-model="groupB" multiple collapse-tags placeholder="Select Group B">
                <el-option v-for="s in groupBOptions" :key="s.id" :label="s.species_name" :value="s.id" />
              </el-select>
            </el-form-item>

            <el-divider content-position="center">Thresholds</el-divider>

            <el-form-item label="abs(log2FC) >= ">
              <el-slider v-model="thresholdFc" :min="0" :max="5" :step="0.1" show-input />
            </el-form-item>

            <el-form-item label="p-value <= ">
              <el-select v-model="thresholdP">
                <el-option label="0.05" :value="0.05" />
                <el-option label="0.01" :value="0.01" />
                <el-option label="0.001" :value="0.001" />
              </el-select>
            </el-form-item>

            <el-form-item>
              <el-switch v-model="onlySignificant" active-text="Significant only" />
            </el-form-item>
          </el-form>
        </el-card>

        <el-card v-if="hasResult" style="margin-top: 14px;">
          <div class="card-header">
            <span>Feature Importance</span>
            <el-button text @click="exportChart(impRef, `${omics}_importance.png`)"><el-icon><Download /></el-icon></el-button>
          </div>
          <EChart ref="impRef" :option="impOption" height="240px" />
        </el-card>
      </el-col>

      <el-col :span="17">
        <el-empty
          v-if="!hasResult"
          :description="omics === 'PROTEOME'
            ? 'Proteome data is not simulated yet. Please switch to Genome/Transcriptome.'
            : 'Configure groups and run screening.'"
          style="margin-top: 80px;"
        />

        <template v-else>
          <el-row :gutter="16" style="margin-bottom: 16px;">
            <el-col :span="14">
              <el-card shadow="never">
                <template #header>
                  <div class="card-header">
                    <span>Volcano</span>
                    <div class="hdr-actions">
                      <el-button text @click="exportChart(volcanoRef, `${omics}_volcano.png`)">
                        <el-icon><Download /></el-icon>
                      </el-button>
                    </div>
                  </div>
                </template>
                <EChart ref="volcanoRef" :option="volcanoOption" height="360px" />
              </el-card>
            </el-col>

            <el-col :span="10">
              <el-card shadow="never" header="PCA / Scatter">
                <EChart ref="pcaRef" :option="pcaOption" height="360px" />
              </el-card>
            </el-col>
          </el-row>

          <el-card shadow="never">
            <template #header>
              <div class="card-header">
                <span>Differential List</span>
                <div class="hdr-actions">
                  <el-input v-model="kw" clearable placeholder="Filter gene…" style="width: 220px">
                    <template #prefix><el-icon><Search /></el-icon></template>
                  </el-input>
                  <el-button type="primary" icon="Download" @click="exportCsv">Export CSV</el-button>
                </div>
              </div>
            </template>

            <el-table :data="filteredDiff" stripe height="440">
              <el-table-column prop="id" label="ID" width="140" />
              <el-table-column prop="gene_name" label="Name" min-width="160" />
              <el-table-column prop="log2fc" label="log2FC" sortable width="110" />
              <el-table-column prop="p_value" label="p-value" sortable width="110" />
              <el-table-column prop="key_feature_val" label="Key Feature Val" />
              <el-table-column label="Significant" width="110">
                <template #default="{ row }">
                  <el-tag v-if="isSig(row)" type="danger">YES</el-tag>
                  <el-tag v-else type="info">NO</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </template>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { ElMessage } from "element-plus";
import { runMultiScreening } from "../../api";
import { exportObjectsToCsv } from "../../utils/exportCsv";
import EChart from "../../components/EChart.vue";

const props = defineProps({
  title: { type: String, default: "Multi-omics Screening" },
  omics: { type: String, required: true },
  active: { type: Boolean, default: false },
  samples: { type: Array, required: true }, // 父层一次性加载后传入
  prefillGroupA: { type: Array, default: () => [] }, // 可选：从 Browse 选择跳转带入
});

const loading = ref(false);
const hasResult = ref(false);

const groupA = ref([]);
const groupB = ref([]);

const thresholdFc = ref(1.5);
const thresholdP = ref(0.05);
const onlySignificant = ref(false);
const kw = ref("");

const featureImportance = ref([]);
const diffList = ref([]);
const pcaData = ref([]);

const impRef = ref(null);
const volcanoRef = ref(null);
const pcaRef = ref(null);

const ready = computed(() => {
  if (props.omics === "PROTEOME") return false;
  return groupA.value.length > 0 && groupB.value.length > 0;
});

const groupAOptions = computed(() => {
  const b = new Set(groupB.value);
  return (props.samples || []).filter((s) => !b.has(s.id));
});
const groupBOptions = computed(() => {
  const a = new Set(groupA.value);
  return (props.samples || []).filter((s) => !a.has(s.id));
});

function isSig(r) {
  return Math.abs(Number(r.log2fc)) >= thresholdFc.value && Number(r.p_value) <= thresholdP.value;
}

const filteredDiff = computed(() => {
  let rows = diffList.value || [];
  if (onlySignificant.value) rows = rows.filter(isSig);
  const q = kw.value.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => (r.gene_name || "").toLowerCase().includes(q));
});

async function run() {
  if (props.omics === "PROTEOME") {
    ElMessage.info("Proteome is a placeholder in the current version (no simulated proteome data).");
    return;
  }
  if (!ready.value) {
    ElMessage.warning("Please select Group A and Group B.");
    return;
  }
  loading.value = true;
  try {
    const payload = {
      sample_ids: [...groupA.value, ...groupB.value],
      groups: { A: groupA.value, B: groupB.value },
      omics_type: props.omics,
      threshold_fc: thresholdFc.value,
      threshold_p: thresholdP.value,
    };

    const data = await runMultiScreening(payload);

    featureImportance.value = Array.isArray(data?.feature_importance) ? data.feature_importance : [];
    diffList.value = Array.isArray(data?.diff_monomers) ? data.diff_monomers : [];
    pcaData.value = Array.isArray(data?.pca_data) ? data.pca_data : [];

    const ok = (featureImportance.value.length + diffList.value.length + pcaData.value.length) > 0;
    if (!ok) {
      hasResult.value = false;
      ElMessage.warning(data?.message || "No screening result returned (backend may be empty). Please verify group selection and data availability.");
      return;
    }
    hasResult.value = true;
  } finally {
    loading.value = false;
  }
}

function exportCsv() {
  exportObjectsToCsv(
    `${props.omics}_multi_diff.csv`,
    filteredDiff.value,
    [
      { key: "id", label: "ID" },
      { key: "gene_name", label: "Name" },
      { key: "log2fc", label: "log2FC" },
      { key: "p_value", label: "p-value" },
      { key: "key_feature_val", label: "key_feature_val" },
    ]
  );
}

function exportChart(chartRef, filename) {
  const inst = chartRef?.value?.getInstance?.();
  if (!inst) return;
  const url = inst.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#ffffff" });
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// 图表 options
const impOption = computed(() => {
  const data = featureImportance.value || [];
  return {
    tooltip: { trigger: "axis" },
    grid: { left: "35%", right: "10%", top: 20, bottom: 20 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: data.map((i) => i.name) },
    series: [{ type: "bar", data: data.map((i) => i.score) }],
  };
});

const volcanoOption = computed(() => {
  const rows = (filteredDiff.value || []).map((r) => [Number(r.log2fc), -Math.log10(Number(r.p_value) || 1), r.gene_name]);
  return {
    tooltip: { formatter: (p) => `Name: ${p.data[2]}<br/>log2FC: ${p.data[0]}<br/>-log10(p): ${p.data[1].toFixed(2)}` },
    grid: { left: "10%", right: "6%", top: 20, bottom: 50 },
    xAxis: { name: "log2FC", scale: true },
    yAxis: { name: "-log10(p)", scale: true },
    series: [{ type: "scatter", data: rows, symbolSize: 6 }],
    markLine: {
      symbol: "none",
      data: [
        { xAxis: thresholdFc.value },
        { xAxis: -thresholdFc.value },
        { yAxis: -Math.log10(thresholdP.value) },
      ],
    },
  };
});

const pcaOption = computed(() => {
  const data = pcaData.value || [];
  const a = data.filter((i) => i.group === "A").map((i) => [i.x, i.y]);
  const b = data.filter((i) => i.group === "B").map((i) => [i.x, i.y]);
  return {
    tooltip: {},
    xAxis: { scale: true, name: "PC1" },
    yAxis: { scale: true, name: "PC2" },
    legend: { top: 10 },
    series: [
      { name: "Group A", type: "scatter", data: a },
      { name: "Group B", type: "scatter", data: b },
    ],
  };
});

// 预填 Group A（仅在模块首次激活时做一次，避免每次切换覆盖用户选择）
const prefilled = ref(false);
watch(
  () => props.active,
  (v) => {
    if (v && !prefilled.value && props.prefillGroupA?.length) {
      groupA.value = [...props.prefillGroupA];
      prefilled.value = true;
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.multi-panel { width: 100%; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.ttl { display: flex; align-items: center; gap: 10px; }
.ttl h3 { margin: 0; color: #2c3e50; }
.control { background: #f8f9fa; }
.card-header { display: flex; justify-content: space-between; align-items: center; font-weight: 800; }
.hdr-actions { display: flex; align-items: center; gap: 10px; }
</style>
