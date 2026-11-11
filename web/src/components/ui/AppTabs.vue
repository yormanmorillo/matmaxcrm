<script setup lang="ts">
import { cn } from '@/lib/cn'
import type { TabItem } from '@/types/ui'

defineProps<{
  tabs: TabItem[]
  modelValue: string
}>()

const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>()
</script>

<template>
  <div class="flex gap-1 overflow-x-auto border-b border-line">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      :class="
        cn(
          'relative -mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px] font-medium transition-colors',
          modelValue === tab.key
            ? 'border-brand text-brand'
            : 'border-transparent text-muted hover:text-ink',
        )
      "
      @click="emit('update:modelValue', tab.key)"
    >
      {{ tab.label }}
      <span
        v-if="typeof tab.count === 'number'"
        :class="
          cn(
            'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
            modelValue === tab.key ? 'bg-brand-soft text-brand' : 'bg-surface-2 text-faint',
          )
        "
      >
        {{ tab.count }}
      </span>
    </button>
  </div>
</template>
