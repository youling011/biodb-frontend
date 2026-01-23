<template>
  <div class="multi-container" v-loading="loading">
    <div class="header">
      <h2>Multi-Species Analysis</h2>
      <p>Separated by omics modules for independent iteration and optimization.</p>
    </div>

    <div class="cohort-bar">
      <el-select v-model="selectedCohort" placeholder="Load cohort" clearable style="width: 260px">
        <el-option v-for="c in cohorts" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
      <el-button @click="applyCohort" :disabled="!selectedCohort">Apply to Group A</el-button>
    </div>

    <el-tabs v-model="omicsTab" type="border-card">
      <el-tab-pane label="Genome" name="GENOME" lazy>
        <MultiScreeningPanel
          title="Genome Multi-Species Screening"
          omics="GENOME"
          :active="omicsTab === 'GENOME'"
          :samples="samples"
          :prefill-group-a="prefillGroupA"
        />
      </el-tab-pane>

      <el-tab-pane label="Transcriptome" name="TRANSCRIPTOME" lazy>
        <MultiScreeningPanel
          title="Transcriptome Multi-Species Screening"
          omics="TRANSCRIPTOME"
          :active="omicsTab === 'TRANSCRIPTOME'"
          :samples="samples"
          :prefill-group-a="prefillGroupA"
        />
      </el-tab-pane>

      <el-tab-pane label="Proteome" name="PROTEOME" lazy>
        <MultiScreeningPanel
          title="Proteome Multi-Species Screening"
          omics="PROTEOME"
          :active="omicsTab === 'PROTEOME'"
          :samples="samples"
          :prefill-group-a="prefillGroupA"
        />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { getSamples } from "../api";
import MultiScreeningPanel from "../modules/analysis/MultiScreeningPanel.vue";
import { getQueryString, setQueryValues } from "../utils/urlState";
import { listCohorts, getCohort } from "../utils/cohortStore";

const loading = ref(false);
const samples = ref([]);
const omicsTab = ref(getQueryString("omics", "GENOME"));
const route = useRoute();

// From Browse “Compare Selected” (if exists)
const prefillGroupA = ref([]);
const cohorts = ref(listCohorts());
const selectedCohort = ref("");

async function loadSamples() {
  loading.value = true;
  try {
    const data = await getSamples({ limit: 200, offset: 0 });
    samples.value = Array.isArray(data?.items) ? data.items : [];
  } finally {
    loading.value = false;
  }

  // Read Browse selection
  try {
    const saved = JSON.parse(localStorage.getItem("biostoich_selected_samples") || "[]");
    if (Array.isArray(saved) && saved.length > 0) {
      prefillGroupA.value = saved.map((x) => x.id);
      localStorage.removeItem("biostoich_selected_samples");
    }
  } catch {}

  const selectedQuery = String(route.query?.selected || "");
  if (selectedQuery) {
    prefillGroupA.value = selectedQuery.split(",").map((x) => Number(x)).filter((x) => Number.isFinite(x));
  }
}

onMounted(loadSamples);

watch(omicsTab, () => {
  setQueryValues({ omics: omicsTab.value });
});

function applyCohort() {
  const cohort = getCohort(selectedCohort.value);
  if (!cohort) return;
  prefillGroupA.value = cohort.ids || [];
}
</script>

<style scoped>
.multi-container {
  max-width: 1400px;
  margin: 20px auto;
  padding: 0 20px;
}

.header {
  margin-bottom: 16px;
}
.cohort-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}

</style>
