<template>
  <div class="tx-module">
    <div class="head">
      <div class="ttl">
        <h3>Transcriptome Module</h3>
        <el-tag effect="plain">showcase mode (front-end synthetic data)</el-tag>
      </div>
      <div class="actions">
        <el-button @click="dictionaryOpen = true">Data Dictionary</el-button>
        <el-button @click="provenanceOpen = true">Provenance</el-button>
        <el-button type="primary" plain @click="reload">Refresh</el-button>
      </div>
    </div>

    <el-tabs v-model="tab" type="border-card" class="tabs">
      <el-tab-pane label="Overview" name="overview" lazy>
        <TranscriptomeOverview :seed="seed" :seed-bump="seedBump" />
      </el-tab-pane>

      <el-tab-pane label="QC & Normalization" name="qc" lazy>
        <TranscriptomeQC :sample-id="props.sampleId" />
      </el-tab-pane>

      <el-tab-pane label="HVG" name="hvg" lazy>
        <HVGAnalysis :sample-id="props.sampleId" />
      </el-tab-pane>

      <el-tab-pane label="DE" name="de" lazy>
        <DifferentialExpression :sample-id="props.sampleId" />
      </el-tab-pane>

      <el-tab-pane label="Explorer" name="explorer" lazy>
        <TranscriptExplorer :seed="seed" :seed-bump="seedBump" />
      </el-tab-pane>

      <el-tab-pane label="Bias" name="bias" lazy>
        <BiasAnalysis :seed="seed" :seed-bump="seedBump" />
      </el-tab-pane>

      <el-tab-pane label="Complexity & Motif" name="complexity" lazy>
        <ComplexityMotif :seed="seed" :seed-bump="seedBump" />
      </el-tab-pane>

      <el-tab-pane label="Fingerprint Map" name="fingerprint" lazy>
        <TranscriptFingerprintMap :seed="seed" :seed-bump="seedBump" />
      </el-tab-pane>

      <el-tab-pane label="Export & API" name="export" lazy>
        <ExportApi :seed="seed" :seed-bump="seedBump" />
      </el-tab-pane>
    </el-tabs>
  </div>
  <FeatureDictionaryDrawer v-model="dictionaryOpen" omics="TRANSCRIPTOME" />
  <ProvenancePanel
    v-model="provenanceOpen"
    :mode="dataSourceState.source"
    :api-base="apiBase"
    :sample-id="props.sampleId"
    :seed="seed"
    :params="provenanceParams"
  />
</template>

<script setup>
import { computed, ref } from "vue";
import { getQueryNumber, getQueryString } from "../../../utils/urlState";

import TranscriptomeOverview from "./TranscriptomeOverview.vue";
import TranscriptExplorer from "./TranscriptExplorer.vue";
import TranscriptomeQC from "./TranscriptomeQC.vue";
import HVGAnalysis from "./HVGAnalysis.vue";
import DifferentialExpression from "./DifferentialExpression.vue";
import BiasAnalysis from "./BiasAnalysis.vue";
import ComplexityMotif from "./ComplexityMotif.vue";
import TranscriptFingerprintMap from "./TranscriptFingerprintMap.vue";
import ExportApi from "./ExportApi.vue";
import FeatureDictionaryDrawer from "../../../components/FeatureDictionaryDrawer.vue";
import ProvenancePanel from "../../../components/ProvenancePanel.vue";
import { dataSourceState } from "../../../api";

const props = defineProps({
  sampleId: { type: [String, Number], default: "demo" },
  active: { type: Boolean, default: true },
});

const tab = ref("overview");
const dictionaryOpen = ref(false);
const provenanceOpen = ref(false);
const apiBase = String(import.meta.env.VITE_API_BASE_URL || "");
const provenanceParams = computed(() => ({
  tab: tab.value,
  hvg: {
    algorithm: getQueryString("hvg_alg", "seurat_v3"),
    n_top_genes: getQueryNumber("hvg_top", 1000),
    batch_key: getQueryString("hvg_batch", ""),
    min_mean: getQueryNumber("hvg_min_mean", 0.01),
    max_mean: getQueryNumber("hvg_max_mean", 10),
    min_disp: getQueryNumber("hvg_min_disp", 0.5),
  },
  de: {
    method: getQueryString("de_method", "DESeq2"),
    group_a: getQueryString("de_a", "A"),
    group_b: getQueryString("de_b", "B"),
    fc: getQueryNumber("de_fc", 1),
    padj: getQueryNumber("de_padj", 0.05),
  },
  bias: {
    transform: getQueryString("tx_bias_tf", "none"),
    impute: getQueryString("tx_bias_imp", "drop"),
  },
  complexity: {
    normalize: getQueryString("tx_comp_norm", "0") === "1",
  },
}));

// One shared seed + bump: each tab deterministically regenerates its own charts/tables.
const seedBump = ref(0);
const seed = computed(() => `TX:${String(props.sampleId ?? "demo")}`);

function reload() {
  seedBump.value += 1;
}
</script>

<style scoped>
.tx-module {
  width: 100%;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
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
.tabs {
  margin-top: 8px;
}
</style>
