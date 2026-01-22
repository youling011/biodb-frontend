<template>
  <el-drawer v-model="open" size="40%" title="Provenance">
    <el-descriptions :column="1" border>
      <el-descriptions-item label="Mode">{{ mode }}</el-descriptions-item>
      <el-descriptions-item label="API Base">{{ apiBase }}</el-descriptions-item>
      <el-descriptions-item label="Last Error">{{ lastError || "-" }}</el-descriptions-item>
      <el-descriptions-item label="Sample ID">{{ sampleId || "-" }}</el-descriptions-item>
      <el-descriptions-item label="Seed">{{ seed || "-" }}</el-descriptions-item>
      <el-descriptions-item label="Rows">{{ rowsCount ?? "-" }}</el-descriptions-item>
    </el-descriptions>

    <el-divider content-position="left">Parameters</el-divider>
    <pre class="params">{{ JSON.stringify(params || {}, null, 2) }}</pre>
  </el-drawer>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: "demo" },
  apiBase: { type: String, default: "" },
  lastError: { type: String, default: "" },
  sampleId: { type: [String, Number], default: "" },
  seed: { type: [String, Number], default: "" },
  rowsCount: { type: Number, default: null },
  params: { type: Object, default: () => ({}) },
});
const emit = defineEmits(["update:modelValue"]);

const open = ref(props.modelValue);
watch(() => props.modelValue, (v) => (open.value = v));
watch(open, (v) => emit("update:modelValue", v));
</script>

<style scoped>
.params {
  background: #f6f8fb;
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  white-space: pre-wrap;
}
</style>
