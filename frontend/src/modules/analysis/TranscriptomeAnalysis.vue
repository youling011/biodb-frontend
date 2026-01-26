<template>
  <TranscriptomeModule :sample-id="sampleId" :active="active" />
</template>

<script setup>
import TranscriptomeModule from "./transcriptome/TranscriptomeModule.vue";

defineOptions({ name: "TranscriptomeAnalysis" });

defineProps({
  sampleId: { type: [String, Number], required: true },
  active: { type: Boolean, default: false },
});
</script>
