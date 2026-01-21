<template>
  <div class="proteome-module" v-loading="loading">
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

const props = defineProps({
  sampleId: { type: [String, Number], required: true },
});

const activeTab = ref("overview");
const { rows } = useProteomeDataset(props.sampleId);
const loading = computed(() => !rows.value.length);
</script>

<style scoped>
.proteome-module {
  width: 100%;
}
</style>
