<template>
  <div class="async-state">
    <el-skeleton v-if="state === 'loading'" animated :rows="4" />
    <el-empty
      v-else-if="state === 'empty'"
      :description="emptyText"
    >
      <el-button v-if="retry" type="primary" @click="retry">Retry</el-button>
      <el-button v-if="clear" @click="clear">Clear Filters</el-button>
    </el-empty>
    <el-result
      v-else-if="state === 'error'"
      icon="error"
      :title="errorTitle"
      :sub-title="errorText"
    >
      <template #extra>
        <el-button type="primary" @click="retry">Retry</el-button>
        <el-button v-if="fallback" @click="fallback">Switch to Demo</el-button>
        <el-button v-if="details" @click="showDetails = !showDetails">{{ showDetails ? "Hide" : "Details" }}</el-button>
      </template>
      <div v-if="details && showDetails" class="details">
        {{ details }}
      </div>
    </el-result>
    <slot v-else />
  </div>
</template>

<script setup>
import { ref } from "vue";

defineProps({
  state: { type: String, default: "ready" }, // ready | loading | empty | error
  emptyText: { type: String, default: "No data available." },
  errorTitle: { type: String, default: "Request failed" },
  errorText: { type: String, default: "Please retry or switch to demo mode." },
  retry: { type: Function, default: null },
  clear: { type: Function, default: null },
  fallback: { type: Function, default: null },
  details: { type: String, default: "" },
});
const showDetails = ref(false);
</script>

<style scoped>
.async-state {
  width: 100%;
}
.details {
  margin-top: 10px;
  color: #909399;
  font-size: 12px;
  white-space: pre-wrap;
}
</style>
