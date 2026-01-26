diff --git a/frontend/src/modules/analysis/ProteomeAnalysis.vue b/frontend/src/modules/analysis/ProteomeAnalysis.vue
index bb08ead4a5822693a6ea4a7bf3d64390d9c70391..3732008962f62a487d8b5786318914f08c7e368f 100644
--- a/frontend/src/modules/analysis/ProteomeAnalysis.vue
+++ b/frontend/src/modules/analysis/ProteomeAnalysis.vue
@@ -1,40 +1,14 @@
 <template>
-  <div class="proteome-disabled" v-loading="false">
-    <el-card class="card">
-      <template #header>
-        <div class="hdr">
-          <span>Proteome Stoichiometry Module</span>
-          <el-tag type="warning" effect="plain">Disabled</el-tag>
-        </div>
-      </template>
-
-      <el-alert
-        type="warning"
-        show-icon
-        :closable="false"
-        title="Proteome module is not available in this version."
-        description="This portal currently supports Genome and Transcriptome only. The Proteome tab is preserved for compatibility and will be enabled once proteome data and analysis APIs are implemented."
-      />
-
-      <div style="height: 10px;"></div>
-      <el-empty description="No proteome data (disabled)" />
-    </el-card>
-  </div>
+  <ProteomeModule :sample-id="sampleId" />
 </template>
 
 <script setup>
-// Required-only phase:
-// - Do NOT request backend and do NOT trigger mock generation.
-// - Keep the tab/component present to avoid routing or tab errors.
+import ProteomeModule from "./proteome/ProteomeModule.vue";
+
+defineOptions({ name: "ProteomeAnalysis" });
 
 defineProps({
   sampleId: { type: [String, Number], required: true },
   active: { type: Boolean, default: false },
 });
 </script>
-
-<style scoped>
-.proteome-disabled { width: 100%; }
-.card { border-radius: 12px; }
-.hdr { display: flex; align-items: center; justify-content: space-between; }
-</style>
