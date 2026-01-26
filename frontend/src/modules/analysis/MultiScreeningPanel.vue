diff --git a/frontend/src/modules/analysis/MultiScreeningPanel.vue b/frontend/src/modules/analysis/MultiScreeningPanel.vue
index 1306cbacdc0efad2e318783504bbfa57c2e2c65c..633db0a71ec3f2a800f89c06e5a3ce0b607fb963 100644
--- a/frontend/src/modules/analysis/MultiScreeningPanel.vue
+++ b/frontend/src/modules/analysis/MultiScreeningPanel.vue
@@ -1,236 +1,295 @@
 <template>
   <div class="multi-panel" v-loading="loading">
     <div class="head">
       <div class="ttl">
         <h3>{{ title }}</h3>
         <el-tag size="small" effect="plain">{{ omics }}</el-tag>
       </div>
-      <el-button type="success" @click="run" :disabled="!ready">Run Screening</el-button>
+      <div class="head-actions">
+        <el-button @click="dictionaryOpen = true">Data Dictionary</el-button>
+        <el-button @click="provenanceOpen = true">Provenance</el-button>
+        <el-button type="success" @click="run" :disabled="!ready">Run Screening</el-button>
+      </div>
     </div>
 
-    <el-alert
-      v-if="omics === 'PROTEOME'"
-      type="info"
-      show-icon
-      :closable="false"
-      title="Proteome is currently a placeholder"
-      description="Phase 2 keeps the Proteome module position in the UI, but does not simulate proteome data yet. Screening is disabled for this tab."
-      style="margin-top: 12px;"
-    />
-
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
 
+            <el-form-item label="Method">
+              <el-select v-model="methodChoice">
+                <el-option label="default" value="default" />
+                <el-option label="robust" value="robust" />
+              </el-select>
+            </el-form-item>
+
+            <el-form-item label="Features">
+              <el-select v-model="selectedFeatures" multiple collapse-tags placeholder="Select features">
+                <el-option v-for="f in featureOptions" :key="f" :label="f" :value="f" />
+              </el-select>
+            </el-form-item>
+
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
-          :description="omics === 'PROTEOME'
-            ? 'Proteome data is not simulated yet. Please switch to Genome/Transcriptome.'
-            : 'Configure groups and run screening.'"
+          description="Configure groups and run screening."
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
-                  <el-input v-model="kw" clearable placeholder="Filter gene…" style="width: 220px">
+                  <el-input v-model="kw" clearable placeholder="Filter feature…" style="width: 220px">
                     <template #prefix><el-icon><Search /></el-icon></template>
                   </el-input>
                   <el-button type="primary" icon="Download" @click="exportCsv">Export CSV</el-button>
+                  <el-button @click="copyLink">Share</el-button>
                 </div>
               </div>
             </template>
 
-            <el-table :data="filteredDiff" stripe height="440">
-              <el-table-column prop="id" label="ID" width="140" />
-              <el-table-column prop="gene_name" label="Name" min-width="160" />
-              <el-table-column prop="log2fc" label="log2FC" sortable width="110" />
-              <el-table-column prop="p_value" label="p-value" sortable width="110" />
-              <el-table-column prop="key_feature_val" label="Key Feature Val" />
-              <el-table-column label="Significant" width="110">
-                <template #default="{ row }">
-                  <el-tag v-if="isSig(row)" type="danger">YES</el-tag>
-                  <el-tag v-else type="info">NO</el-tag>
-                </template>
-              </el-table-column>
-            </el-table>
+            <VirtualTable
+              :data="pagedDiff"
+              :columns="diffColumns"
+              :height="440"
+              row-key="id"
+            />
+            <div class="pager">
+              <el-pagination
+                background
+                layout="prev, pager, next, jumper, ->, total"
+                :total="filteredDiff.length"
+                :page-size="pageSize"
+                v-model:current-page="page"
+              />
+            </div>
           </el-card>
         </template>
       </el-col>
     </el-row>
   </div>
+  <FeatureDictionaryDrawer v-model="dictionaryOpen" :omics="omics" />
+  <ProvenancePanel
+    v-model="provenanceOpen"
+    :mode="dataSourceState.source"
+    :api-base="apiBase"
+    :params="paramsSnapshot"
+  />
 </template>
 
 <script setup>
-import { ref, computed, watch } from "vue";
+import { h, ref, computed, watch } from "vue";
 import { ElMessage } from "element-plus";
 import { runMultiScreening } from "../../api";
 import { exportObjectsToCsv } from "../../utils/exportCsv";
 import EChart from "../../components/EChart.vue";
+import VirtualTable from "../../components/VirtualTable.vue";
+import FeatureDictionaryDrawer from "../../components/FeatureDictionaryDrawer.vue";
+import ProvenancePanel from "../../components/ProvenancePanel.vue";
+import { dataSourceState } from "../../api";
+import { getQueryList, getQueryNumber, getQueryString, setQueryList, setQueryValues } from "../../utils/urlState";
 
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
+const methodChoice = ref("default");
+const selectedFeatures = ref([]);
 const onlySignificant = ref(false);
 const kw = ref("");
+const page = ref(1);
+const pageSize = 200;
 
 const featureImportance = ref([]);
 const diffList = ref([]);
 const pcaData = ref([]);
 
 const impRef = ref(null);
 const volcanoRef = ref(null);
 const pcaRef = ref(null);
 
-const ready = computed(() => {
-  if (props.omics === "PROTEOME") return false;
-  return groupA.value.length > 0 && groupB.value.length > 0;
+const ready = computed(() => groupA.value.length > 0 && groupB.value.length > 0);
+
+const omicsSamplesFiltered = computed(() => (props.samples || []).filter((s) => s.omics_type === props.omics));
+const prefix = computed(() => (props.omics === "GENOME" ? "g" : props.omics === "TRANSCRIPTOME" ? "t" : "p"));
+
+const featureOptions = computed(() => {
+  if (props.omics === "PROTEOME") {
+    return ["C_per_res", "H_per_res", "O_per_res", "N_per_res", "S_per_res", "pI", "Net_Charge", "GRAVY", "Aromaticity", "Aliphatic_Index", "Instability_Index", "Solvent_Accessibility"];
+  }
+  return ["GC_Content_Percent", "C_N_Ratio", "Length_bp", "Nitrogen_Atoms", "Carbon_Atoms"];
 });
 
 const groupAOptions = computed(() => {
   const b = new Set(groupB.value);
-  return (props.samples || []).filter((s) => !b.has(s.id));
+  return omicsSamplesFiltered.value.filter((s) => !b.has(s.id));
 });
 const groupBOptions = computed(() => {
   const a = new Set(groupA.value);
-  return (props.samples || []).filter((s) => !a.has(s.id));
+  return omicsSamplesFiltered.value.filter((s) => !a.has(s.id));
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
 
+watch([kw, onlySignificant], () => {
+  page.value = 1;
+});
+
+const pagedDiff = computed(() => {
+  const start = (page.value - 1) * pageSize;
+  return filteredDiff.value.slice(start, start + pageSize);
+});
+
+const diffColumns = [
+  { key: "id", label: "ID", width: 140 },
+  { key: "gene_name", label: "Name", width: 180 },
+  { key: "log2fc", label: "log2FC", width: 110, sortable: true },
+  { key: "p_value", label: "p-value", width: 110, sortable: true },
+  { key: "key_feature_val", label: "Key Feature Val", width: 160 },
+  {
+    key: "significant",
+    label: "Significant",
+    width: 110,
+    cellRenderer: ({ rowData }) =>
+      h(
+        "span",
+        {
+          class: ["sig-pill", isSig(rowData) ? "sig-yes" : "sig-no"],
+        },
+        isSig(rowData) ? "YES" : "NO"
+      ),
+  },
+];
+
 async function run() {
-  if (props.omics === "PROTEOME") {
-    ElMessage.info("Proteome is a placeholder in the current version (no simulated proteome data).");
-    return;
-  }
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
+      method: methodChoice.value,
+      features: selectedFeatures.value,
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
@@ -292,36 +351,107 @@ const pcaOption = computed(() => {
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
+
+const dictionaryOpen = ref(false);
+const provenanceOpen = ref(false);
+const paramsSnapshot = computed(() => ({
+  groupA: groupA.value,
+  groupB: groupB.value,
+  kw: kw.value,
+  fc: thresholdFc.value,
+  p: thresholdP.value,
+  method: methodChoice.value,
+  features: selectedFeatures.value,
+  only_significant: onlySignificant.value,
+}));
+
+const apiBase = String(import.meta.env.VITE_API_BASE_URL || "");
+
+function hydrateFromUrl() {
+  const p = prefix.value;
+  const available = new Set(omicsSamplesFiltered.value.map((s) => s.id));
+  groupA.value = getQueryList(`${p}A`).map((x) => Number(x)).filter((id) => available.has(id));
+  groupB.value = getQueryList(`${p}B`).map((x) => Number(x)).filter((id) => available.has(id));
+  thresholdFc.value = getQueryNumber(`${p}F`, thresholdFc.value);
+  thresholdP.value = getQueryNumber(`${p}P`, thresholdP.value);
+  kw.value = getQueryString(`${p}Kw`, "");
+  selectedFeatures.value = getQueryList(`${p}Feat`);
+  methodChoice.value = getQueryString(`${p}Method`, "default");
+  onlySignificant.value = getQueryString(`${p}Sig`, "0") === "1";
+}
+
+function syncToUrl() {
+  const p = prefix.value;
+  setQueryList(`${p}A`, groupA.value);
+  setQueryList(`${p}B`, groupB.value);
+  setQueryValues({
+    [`${p}F`]: thresholdFc.value,
+    [`${p}P`]: thresholdP.value,
+    [`${p}Kw`]: kw.value,
+    [`${p}Method`]: methodChoice.value,
+    [`${p}Sig`]: onlySignificant.value ? 1 : 0,
+  });
+  setQueryList(`${p}Feat`, selectedFeatures.value);
+}
+
+let syncTimer = null;
+watch([groupA, groupB, thresholdFc, thresholdP, kw, selectedFeatures, methodChoice, onlySignificant], () => {
+  if (syncTimer) clearTimeout(syncTimer);
+  syncTimer = setTimeout(syncToUrl, 200);
+});
+
+function copyLink() {
+  syncToUrl();
+  const href = window.location.href;
+  if (!navigator.clipboard?.writeText) {
+    window.prompt("Copy this link:", href);
+    return;
+  }
+  navigator.clipboard.writeText(href)
+    .then(() => {
+      ElMessage.success("Link copied.");
+    })
+    .catch(() => {
+      window.prompt("Copy this link:", href);
+    });
+}
+
+watch(() => props.omics, hydrateFromUrl, { immediate: true });
 </script>
 
 <style scoped>
 .multi-panel { width: 100%; }
 .head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
+.head-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
 .ttl { display: flex; align-items: center; gap: 10px; }
 .ttl h3 { margin: 0; color: #2c3e50; }
 .control { background: #f8f9fa; }
 .card-header { display: flex; justify-content: space-between; align-items: center; font-weight: 800; }
 .hdr-actions { display: flex; align-items: center; gap: 10px; }
+.pager { margin-top: 12px; display: flex; justify-content: flex-end; }
+.sig-pill { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
+.sig-yes { background: #fde2e2; color: #f56c6c; }
+.sig-no { background: #f4f4f5; color: #909399; }
 </style>
