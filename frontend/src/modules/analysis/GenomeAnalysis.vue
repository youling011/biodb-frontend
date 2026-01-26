<template>
  <GenomeModule :sample-id="sampleId" :active="active" />
</template>

<script setup>
import GenomeModule from "./genome/GenomeModule.vue";

defineOptions({ name: "GenomeAnalysis" });

defineProps({
  sampleId: { type: [String, Number], required: true },
  active: { type: Boolean, default: false },
});
</script>
