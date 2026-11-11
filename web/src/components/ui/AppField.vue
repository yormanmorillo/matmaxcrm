<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    required?: boolean
    error?: string
    hint?: string
    forId?: string
  }>(),
  { label: '', required: false, error: '', hint: '', forId: '' },
)
</script>

<template>
  <div>
    <label v-if="label" :for="forId" class="field-label">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>
    <slot />
    <p v-if="error" class="mt-1.5 text-[12px] font-medium text-danger">{{ error }}</p>
    <p v-else-if="hint" class="mt-1.5 text-[12px] text-faint">{{ hint }}</p>
  </div>
</template>
