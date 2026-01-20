<template>
  <div class="tx-module">
    <div class="head">
      <div class="ttl">
        <h3>Transcriptome Module</h3>
        <el-tag effect="plain">showcase mode (front-end synthetic data)</el-tag>
      </div>
      <div class="actions">
        <el-button type="primary" plain @click="reload">Refresh</el-button>
      </div>
    </div>

    <el-tabs v-model="tab" type="border-card" class="tabs">
      <el-tab-pane label="Overview" name="overview" lazy>
        <TranscriptomeOverview :seed="seed" :seed-bump="seedBump" />
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
</template>

<script setup>
import { computed, ref } from "vue";

import TranscriptomeOverview from "./TranscriptomeOverview.vue";
import TranscriptExplorer from "./TranscriptExplorer.vue";
import BiasAnalysis from "./BiasAnalysis.vue";
import ComplexityMotif from "./ComplexityMotif.vue";
import TranscriptFingerprintMap from "./TranscriptFingerprintMap.vue";
import ExportApi from "./ExportApi.vue";

const props = defineProps({
  sampleId: { type: [String, Number], default: "demo" },
  active: { type: Boolean, default: true },
});

const tab = ref("overview");

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
