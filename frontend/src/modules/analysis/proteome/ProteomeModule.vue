<template>
  <div class="proteome-module" v-loading="loading">
    <div class="head">
      <div class="ttl">
        <h3>Proteome Module</h3>
        <el-tag effect="plain">protein-level physchem features</el-tag>
      </div>
      <div class="actions">
        <el-button @click="dictionaryOpen = true">Data Dictionary</el-button>
        <el-button @click="provenanceOpen = true">Provenance</el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="Overview" name="overview">
        <ProteomeOverview :rows="rows" />
      </el-tab-pane>
      <el-tab-pane label="Protein Explorer" name="explorer">
        <ProteinExplorer :rows="rows" />
      </el-tab-pane>
      <el-tab-pane label="PhysChem Landscape" name="landscape">
        <PhysChemLandscape :rows="rows" />
      </el-tab-pane>
      <el-tab-pane label="Composition Fingerprint" name="fingerprint">
        <CompositionFingerprint :rows="rows" />
      </el-tab-pane>
      <el-tab-pane label="Structure & Stability" name="structure">
        <StructureStability :rows="rows" />
      </el-tab-pane>
      <el-tab-pane label="Correlation Heatmap" name="correlation">
        <CorrelationHeatmap :rows="rows" />
      </el-tab-pane>
      <el-tab-pane label="Export & API" name="export">
        <ExportApi :rows="rows" />
      </el-tab-pane>
    </el-tabs>
  </div>
  <FeatureDictionaryDrawer v-model="dictionaryOpen" omics="PROTEOME" />
  <ProvenancePanel
    v-model="provenanceOpen"
    :mode="dataSourceState.source"
    :api-base="apiBase"
    :sample-id="props.sampleId"
    :rows-count="rows.length"
    :params="{ tab: activeTab }"
  />
</template>

<script setup>
import { computed, ref } from "vue";
import { useProteomeDataset } from "./useProteomeDataset";
import ProteomeOverview from "./ProteomeOverview.vue";
import ProteinExplorer from "./ProteinExplorer.vue";
import PhysChemLandscape from "./PhysChemLandscape.vue";
import CompositionFingerprint from "./CompositionFingerprint.vue";
import StructureStability from "./StructureStability.vue";
import CorrelationHeatmap from "./CorrelationHeatmap.vue";
import ExportApi from "./ExportApi.vue";
import FeatureDictionaryDrawer from "../../../components/FeatureDictionaryDrawer.vue";
import ProvenancePanel from "../../../components/ProvenancePanel.vue";
import { dataSourceState } from "../../../api";

const props = defineProps({
  sampleId: { type: [String, Number], required: true },
});

const activeTab = ref("overview");
const { rows } = useProteomeDataset(props.sampleId);
const loading = computed(() => !rows.value.length);
const dictionaryOpen = ref(false);
const provenanceOpen = ref(false);
const apiBase = String(import.meta.env.VITE_API_BASE_URL || "");
</script>

<style scoped>
.proteome-module {
  width: 100%;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.ttl {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ttl h3 {
  margin: 0;
  color: #2c3e50;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
