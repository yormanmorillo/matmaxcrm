<script setup lang="ts">
import { computed } from 'vue'
import type { Tone } from '@/lib/constants'
import { cn } from '@/lib/cn'

const props = withDefaults(
  defineProps<{
    tone?: Tone
    dot?: boolean
    size?: 'sm' | 'md'
  }>(),
  { tone: 'neutral', dot: false, size: 'md' },
)

const toneClass = computed(
  () =>
    ({
      neutral: 'bg-surface-2 text-muted ring-line',
      brand: 'bg-brand-soft text-brand ring-brand/20',
      success: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300',
      warning: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300',
      danger: 'bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-300',
      info: 'bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-300',
      violet: 'bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300',
      amber: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300',
    })[props.tone],
)

const dotClass = computed(
  () =>
    ({
      neutral: 'bg-faint',
      brand: 'bg-brand',
      success: 'bg-emerald-500',
      warning: 'bg-amber-500',
      danger: 'bg-red-500',
      info: 'bg-blue-500',
      violet: 'bg-violet-500',
      amber: 'bg-amber-500',
    })[props.tone],
)
</script>

<template>
  <span
    :class="
      cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset',
        toneClass,
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]',
      )
    "
  >
    <span v-if="dot" :class="cn('h-1.5 w-1.5 rounded-full', dotClass)" />
    <slot />
  </span>
</template>
