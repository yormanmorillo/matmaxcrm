<script setup lang="ts">
import { Inbox } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    title?: string
    description?: string
    compact?: boolean
  }>(),
  { title: 'Sin resultados', description: '', compact: false },
)
</script>

<template>
  <div :class="compact ? 'px-4 py-8 text-center' : 'px-6 py-16 text-center'">
    <div class="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-faint">
      <slot name="icon"><Inbox class="h-5 w-5" /></slot>
    </div>
    <p class="text-sm font-semibold">{{ title }}</p>
    <p v-if="description" class="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-muted">
      {{ description }}
    </p>
    <div v-if="$slots.action" class="mt-4 flex justify-center">
      <slot name="action" />
    </div>
  </div>
</template>
