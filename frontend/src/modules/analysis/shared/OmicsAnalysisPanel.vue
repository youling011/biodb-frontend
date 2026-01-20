<template>
  <el-card class="omics-panel" shadow="never">
    <template #header>
      <div class="hdr">
        <div class="left">
          <div class="title">{{ title }}</div>
          <div v-if="subtitle" class="subtitle">{{ subtitle }}</div>
        </div>
        <div class="right">
          <el-tag v-if="sourceTag" size="small" effect="plain">{{ sourceTag }}</el-tag>
          <slot name="actions" />
        </div>
      </div>
    </template>

    <div v-if="loading" class="state">
      <el-skeleton :rows="3" animated />
    </div>

    <div v-else-if="empty" class="state">
      <el-empty description="No data" />
    </div>

    <div v-else>
      <slot />
    </div>
  </el-card>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  loading: { type: Boolean, default: false },
  empty: { type: Boolean, default: false },
  // expected values: backend | demo_mode | demo_fallback | any other string
  source: { type: String, default: "" },
});

const sourceTag = computed(() => {
  const s = String(props.source || "").trim();
  if (!s) return "";
  if (s === "backend") return "backend";
  if (s === "demo_mode") return "DEMO";
  if (s === "demo_fallback") return "fallback";
  return s;
});
</script>

<style scoped>
.omics-panel {
  margin-bottom: 12px;
}

.hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.left {
  min-width: 0;
}

.title {
  font-weight: 800;
  line-height: 1.2;
}

.subtitle {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.right {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.state {
  padding: 10px 2px;
}
</style>
