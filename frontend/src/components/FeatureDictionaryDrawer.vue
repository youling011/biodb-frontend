<template>
  <el-drawer v-model="open" size="40%" title="Data Dictionary">
    <div class="controls">
      <el-input v-model="search" placeholder="Search key/label/desc..." clearable />
      <el-select v-model="group" placeholder="Group" clearable>
        <el-option v-for="g in groups" :key="g" :label="g" :value="g" />
      </el-select>
    </div>

    <el-table :data="filtered" height="520" stripe>
      <el-table-column prop="key" label="Key" width="180" />
      <el-table-column prop="label" label="Label" width="180" />
      <el-table-column prop="group" label="Group" width="140" />
      <el-table-column prop="unit" label="Unit" width="100" />
      <el-table-column prop="desc" label="Description" />
      <el-table-column label="Copy" width="120">
        <template #default="{ row }">
          <el-button size="small" @click="copy(row.key)">Copy</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-drawer>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { featureRegistry, featureGroups } from "../modules/analysis/shared/featureRegistry";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  omics: { type: String, default: "" },
});
const emit = defineEmits(["update:modelValue"]);

const open = ref(props.modelValue);
const search = ref("");
const group = ref("");

watch(() => props.modelValue, (v) => (open.value = v));
watch(open, (v) => emit("update:modelValue", v));

const groups = featureGroups;

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return featureRegistry.filter((f) => {
    if (props.omics && f.applicable_omics && !f.applicable_omics.includes(props.omics)) return false;
    if (group.value && f.group !== group.value) return false;
    if (!q) return true;
    const hay = `${f.key} ${f.label} ${f.desc}`.toLowerCase();
    return hay.includes(q);
  });
});

function copy(text) {
  navigator.clipboard.writeText(text);
  ElMessage.success(`Copied: ${text}`);
}
</script>

<style scoped>
.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
</style>
