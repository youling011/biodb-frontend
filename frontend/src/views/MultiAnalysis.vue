<template>
  <div class="multi-container" v-loading="loading">
    <div class="header">
      <h2>Multi-Species Analysis</h2>
      <p>Separated by omics modules for independent iteration and optimization.</p>
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

      <!-- Proteome is intentionally disabled in the current phase.
           Keep the tab for UX continuity, but do NOT trigger multi_screening or mock generation. -->
      <el-tab-pane label="Proteome" name="PROTEOME" lazy>
        <div class="disabled-pane">
          <el-alert
            title="Proteome module is not available"
            type="warning"
            :closable="false"
            show-icon
            description="Proteome data simulation and analysis APIs are disabled in this phase. This tab is reserved for future iterations."
          />
          <el-empty description="No proteome data available yet." />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getSamples } from "../api";
import MultiScreeningPanel from "../modules/analysis/MultiScreeningPanel.vue";

const loading = ref(false);
const samples = ref([]);
const omicsTab = ref("GENOME");

// From Browse “Compare Selected” (if exists)
const prefillGroupA = ref([]);

async function loadSamples() {
  loading.value = true;
  try {
    const data = await getSamples();
    samples.value = Array.isArray(data) ? data : [];
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
}

onMounted(loadSamples);
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

.disabled-pane {
  padding: 16px;
}

.disabled-pane :deep(.el-alert) {
  margin-bottom: 12px;
}
</style>
