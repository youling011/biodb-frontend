<!-- frontend/src/components/DataSourceBanner.vue -->
<!--
Recommended (Phase 3 follow-up): Global banner indicating backend/demo/fallback mode.

Usage suggestion (not part of required changes):
  - Import and place at top of App.vue or the main layout:
      <DataSourceBanner />
-->

<template>
  <div v-if="banner.show" class="data-source-banner">
    <el-alert
      :type="banner.type"
      :closable="false"
      show-icon
      class="data-source-banner__alert"
    >
      <template #title>
        <div class="data-source-banner__title">
          <span>{{ banner.title }}</span>
          <el-tag v-if="state.source" size="small" class="data-source-banner__tag">
            {{ state.source }}
          </el-tag>
        </div>
      </template>
      <div class="data-source-banner__body">
        <div class="data-source-banner__message">{{ banner.message }}</div>
        <div v-if="state.last_error" class="data-source-banner__error">
          {{ state.last_error }}
        </div>
      </div>
    </el-alert>
  </div>
</template>

<script setup>
import { useDataSourceStore } from "../stores/dataSource";

const { state, banner } = useDataSourceStore();
</script>

<style scoped>
.data-source-banner {
  padding: 8px 16px;
}
.data-source-banner__alert {
  border-radius: 10px;
}
.data-source-banner__title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.data-source-banner__tag {
  margin-left: 6px;
}
.data-source-banner__body {
  line-height: 1.4;
}
.data-source-banner__message {
  margin-top: 2px;
}
.data-source-banner__error {
  margin-top: 6px;
  opacity: 0.85;
  font-size: 12px;
  word-break: break-word;
}
</style>
