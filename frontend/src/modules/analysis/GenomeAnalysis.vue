<template>
  <GenomeModule :sample-id="sampleId" :active="active" />
</template>

<script setup>
import GenomeModule from "./genome/GenomeModule.vue";

defineProps({
  sampleId: { type: [String, Number], required: true },
  active: { type: Boolean, default: false },
});
</script>
