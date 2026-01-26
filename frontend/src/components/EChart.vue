diff --git a/frontend/src/components/EChart.vue b/frontend/src/components/EChart.vue
index 536267d8278d521f8e3c56d234bf9e88851c6fc2..672ef4461413d9273e3091ce4a94a527c00d07cb 100644
--- a/frontend/src/components/EChart.vue
+++ b/frontend/src/components/EChart.vue
@@ -1,54 +1,134 @@
 <template>
-  <div ref="elRef" :style="{ width: '100%', height }"></div>
+  <div class="chart-wrapper" :style="{ height }">
+    <div ref="elRef" class="chart-canvas"></div>
+    <div v-if="lodBadge" class="lod-badge">
+      {{ lodBadge }}
+    </div>
+    <div v-if="!hasData" class="chart-empty">
+      <el-empty :description="emptyText" />
+    </div>
+  </div>
 </template>
 
 <script setup>
-import { ref, onMounted, onBeforeUnmount, watch } from "vue";
+import { ref, onMounted, onBeforeUnmount, watch, computed } from "vue";
 import * as echarts from "echarts";
 
 const props = defineProps({
   option: { type: Object, required: true },
   height: { type: String, default: "360px" },
   loading: { type: Boolean, default: false },
+  emptyText: { type: String, default: "No data available" },
 });
 
 const elRef = ref(null);
 let chart = null;
 let ro = null;
 let onWinResize = null;
+let resizeFrame = null;
+
+const hasData = computed(() => {
+  const series = props.option?.series;
+  if (!series) return false;
+  if (Array.isArray(series)) {
+    return series.some((s) => {
+      if (Array.isArray(s?.data)) return s.data.length > 0;
+      return Boolean(s?.data);
+    });
+  }
+  return true;
+});
+
+const lodBadge = computed(() => {
+  const lod = props.option?.meta?.lod;
+  if (!lod?.enabled) return "";
+  const sampled = lod.sampledCount ?? "-";
+  const total = lod.originalCount ?? "-";
+  return `LOD / sampled (${sampled}/${total})`;
+});
 
 function applyOption() {
   if (!chart || !props.option) return;
+  if (!hasData.value) {
+    chart.clear();
+    return;
+  }
   chart.setOption(props.option, { notMerge: true, lazyUpdate: true });
   props.loading ? chart.showLoading() : chart.hideLoading();
 }
 
 onMounted(() => {
+  if (!elRef.value) return;
   chart = echarts.init(elRef.value);
   applyOption();
 
-  ro = new ResizeObserver(() => chart && chart.resize());
-  ro.observe(elRef.value);
+  if (window.ResizeObserver) {
+    ro = new ResizeObserver(() => scheduleResize());
+    ro.observe(elRef.value);
+  }
 
-  onWinResize = () => chart && chart.resize();
+  onWinResize = () => scheduleResize();
   window.addEventListener("resize", onWinResize);
 });
 
 onBeforeUnmount(() => {
   if (ro && elRef.value) ro.unobserve(elRef.value);
   ro = null;
   if (onWinResize) window.removeEventListener("resize", onWinResize);
   onWinResize = null;
+  if (resizeFrame) cancelAnimationFrame(resizeFrame);
+  resizeFrame = null;
 
   if (chart) chart.dispose();
   chart = null;
 });
 
 watch(() => props.option, applyOption, { deep: true });
 watch(() => props.loading, applyOption);
+watch(() => hasData.value, applyOption);
 
 function getInstance() {
   return chart;
 }
 defineExpose({ getInstance });
+
+function scheduleResize() {
+  if (!chart) return;
+  if (resizeFrame) return;
+  resizeFrame = requestAnimationFrame(() => {
+    resizeFrame = null;
+    chart.resize();
+  });
+}
 </script>
+
+<style scoped>
+.chart-wrapper {
+  position: relative;
+  width: 100%;
+}
+.chart-canvas {
+  width: 100%;
+  height: 100%;
+}
+.chart-empty {
+  position: absolute;
+  inset: 0;
+  display: flex;
+  align-items: center;
+  justify-content: center;
+  min-height: 200px;
+  background: #ffffff;
+}
+.lod-badge {
+  position: absolute;
+  top: 6px;
+  right: 10px;
+  background: rgba(64, 158, 255, 0.15);
+  color: #409eff;
+  font-size: 12px;
+  padding: 2px 8px;
+  border-radius: 12px;
+  z-index: 3;
+}
+</style>
