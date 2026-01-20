<template>
  <div class="detail-container" v-loading="metaLoading">
    <div class="species-header" v-if="sample">
      <el-button @click="$router.push('/browse')" icon="ArrowLeft" link>Back to List</el-button>

      <div class="title-area">
        <h1>{{ sample.species_name }}</h1>
        <el-tag effect="dark" type="success" size="large">{{ sample.taxonomy }}</el-tag>
        <el-tag effect="plain" type="info" size="large">{{ sample.omics_type }}</el-tag>
      </div>

      <p class="desc">
        Analysis modules are separated by omics layer. Each module is independently extensible but belongs to the unified analysis workflow.
      </p>

      <div class="id-hint" v-if="sample && (omicsIds.GENOME || omicsIds.TRANSCRIPTOME)">
        <el-tag effect="plain" type="success" v-if="omicsIds.GENOME">Genome sample id: {{ omicsIds.GENOME }}</el-tag>
        <el-tag effect="plain" type="warning" v-if="omicsIds.TRANSCRIPTOME">Transcriptome sample id: {{ omicsIds.TRANSCRIPTOME }}</el-tag>
        <el-tag effect="plain" type="info" v-if="omicsIds.PROTEOME">Proteome sample id: {{ omicsIds.PROTEOME }}</el-tag>
      </div>
    </div>

    <el-tabs v-model="omicsTab" type="border-card" class="omics-tabs">
      <el-tab-pane label="Genome" name="GENOME" lazy>
        <div v-if="omicsIds.GENOME">
          <GenomeAnalysis :sample-id="omicsIds.GENOME" :active="omicsTab === 'GENOME'" />
        </div>
        <el-empty v-else description="Genome sample not found for this species." />
      </el-tab-pane>

      <el-tab-pane label="Transcriptome" name="TRANSCRIPTOME" lazy>
        <div v-if="omicsIds.TRANSCRIPTOME">
          <TranscriptomeAnalysis :sample-id="omicsIds.TRANSCRIPTOME" :active="omicsTab === 'TRANSCRIPTOME'" />
        </div>
        <el-empty v-else description="Transcriptome sample not found for this species." />
      </el-tab-pane>

      <el-tab-pane label="Proteome" name="PROTEOME" lazy>
        <!-- Proteome is a placeholder; keep UI but do not imply data exists -->
        <ProteomeAnalysis :sample-id="omicsIds.PROTEOME || omicsIds.GENOME || omicsIds.TRANSCRIPTOME || id" :active="omicsTab === 'PROTEOME'" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { getSample, getSpeciesOmics } from "../api";

import GenomeAnalysis from "../modules/analysis/GenomeAnalysis.vue";
import TranscriptomeAnalysis from "../modules/analysis/TranscriptomeAnalysis.vue";
import ProteomeAnalysis from "../modules/analysis/ProteomeAnalysis.vue";

const props = defineProps(["id"]);

const sample = ref(null);
const metaLoading = ref(false);

// IMPORTANT:
// SpeciesDetail.vue is routed by a *sample id* (one row in SpeciesSample),
// but the UI tabs want to show Genome/Transcriptome for the *same species*.
// Therefore we must resolve the sibling sample IDs (same species_name) for each omics.
const omicsIds = ref({
  GENOME: null,
  TRANSCRIPTOME: null,
  PROTEOME: null,
});

const omicsTab = ref("GENOME");

async function resolveOmicsIds() {
  if (!sample.value?.id) {
    omicsIds.value = { GENOME: null, TRANSCRIPTOME: null, PROTEOME: null };
    return;
  }
  try {
    omicsIds.value = await getSpeciesOmics(sample.value.id);
  } catch (e) {
    // On any failure, keep current id as the only resolvable sample to avoid blocking UI.
    omicsIds.value = {
      GENOME: sample.value?.omics_type === "GENOME" ? sample.value?.id : null,
      TRANSCRIPTOME: sample.value?.omics_type === "TRANSCRIPTOME" ? sample.value?.id : null,
      PROTEOME: sample.value?.omics_type === "PROTEOME" ? sample.value?.id : null,
    };
  }
}

async function loadMeta() {
  metaLoading.value = true;
  try {
    sample.value = await getSample(props.id);
    await resolveOmicsIds();

    // Default tab should match the opened sample's omics_type.
    // This avoids showing an empty GENOME tab when user opens a TRANSCRIPTOME sample.
    if (sample.value?.omics_type) omicsTab.value = sample.value.omics_type;
  } finally {
    metaLoading.value = false;
  }
}

onMounted(loadMeta);

watch(
  () => props.id,
  () => loadMeta()
);

// If sample meta updates (e.g., hot reload), re-resolve.
watch(
  () => sample.value?.species_name,
  () => resolveOmicsIds()
);
</script>

<style scoped>
.detail-container { max-width: 1400px; margin: 20px auto; padding: 0 20px; }
.species-header { margin-bottom: 18px; }
.title-area { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin: 10px 0; }
.title-area h1 { margin: 0; color: #2c3e50; font-size: 2rem; }
.desc { color: #606266; max-width: 980px; }
.omics-tabs { margin-top: 10px; }
.id-hint { margin-top: 8px; display:flex; gap: 8px; flex-wrap: wrap; }
</style>
