<template>
  <TranscriptomeModule :sample-id="sampleId" :active="active" />
</template>

<script setup>
import TranscriptomeModule from "./transcriptome/TranscriptomeModule.vue";

defineProps({
  sampleId: { type: [String, Number], required: true },
  active: { type: Boolean, default: false },
});
</script>
