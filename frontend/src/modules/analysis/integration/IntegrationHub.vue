<template>
  <div class="integration">
    <div class="head">
      <div class="ttl">
        <h3>Integration Hub</h3>
        <el-tag effect="plain">cross-omics summary & joint PCA</el-tag>
      </div>
      <div class="actions">
        <el-button type="primary" @click="load">Refresh</el-button>
        <el-button @click="goToMulti">Send to MultiAnalysis</el-button>
      </div>
    </div>

    <AsyncStateBlock :state="state" :retry="load" empty-text="No samples to integrate.">
      <el-tabs v-model="tab" type="border-card">
        <el-tab-pane label="Cross-omics Summary" name="summary">
          <CrossOmicsCorrelation :vectors="vectors" />
        </el-tab-pane>
        <el-tab-pane label="Joint PCA" name="pca">
          <JointPCA :vectors="vectors" @selection="onSelection" />
        </el-tab-pane>
      </el-tabs>
    </AsyncStateBlock>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import AsyncStateBlock from "../../../components/AsyncStateBlock.vue";
import { getOmicsSummaryVector, getSamples } from "../../../api";
import CrossOmicsCorrelation from "./CrossOmicsCorrelation.vue";
import JointPCA from "./JointPCA.vue";
import { useRouter } from "vue-router";
import { setQueryList } from "../../../utils/urlState";
import { useAnalysisSelectionStore } from "../../../stores/analysisSelectionStore";

const router = useRouter();
const selectionStore = useAnalysisSelectionStore();

const loading = ref(false);
const error = ref("");
const vectors = ref([]);
const tab = ref("summary");

const state = computed(() => {
  if (loading.value) return "loading";
  if (error.value) return "error";
  if (!vectors.value.length) return "empty";
  return "ready";
});

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const data = await getSamples({ limit: 60, offset: 0 });
    const items = Array.isArray(data?.items) ? data.items : [];
    const out = [];
    for (const s of items) {
      const res = await getOmicsSummaryVector(s.id, s.omics_type);
      out.push({
        id: s.id,
        species_name: s.species_name,
        taxonomy: s.taxonomy,
        omics_type: s.omics_type,
        vector: res?.vector || {},
      });
    }
    vectors.value = out;
  } catch (e) {
    error.value = String(e?.message || e);
  } finally {
    loading.value = false;
  }
}

function onSelection(ids) {
  selectionStore.setSelected(ids);
  setQueryList("selected", ids);
}

function goToMulti() {
  const ids = selectionStore.state.selectedSampleIds || [];
  if (ids.length) {
    localStorage.setItem("biostoich_selected_samples", JSON.stringify(ids.map((id) => ({ id }))));
  }
  router.push({ name: "MultiAnalysis", query: { selected: ids.join(",") } });
}

load();
</script>

<style scoped>
.integration {
  max-width: 1400px;
  margin: 20px auto;
  padding: 0 20px;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.ttl {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ttl h3 {
  margin: 0;
}
.actions {
  display: flex;
  gap: 8px;
}
</style>
