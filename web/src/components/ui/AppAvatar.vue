<script setup lang="ts">
import { computed } from 'vue'
import { initials } from '@/lib/format'
import { cn } from '@/lib/cn'

const props = withDefaults(
  defineProps<{
    name?: string | null
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    square?: boolean
  }>(),
  { name: '', size: 'md', square: false },
)

const palette = [
  'bg-emerald-600',
  'bg-teal-600',
  'bg-cyan-700',
  'bg-blue-600',
  'bg-indigo-600',
  'bg-violet-600',
  'bg-fuchsia-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-orange-600',
]

const color = computed(() => {
  const value = String(props.name ?? '')
  let hash = 0
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  return palette[hash % palette.length]
})

const sizeClass = computed(
  () =>
    ({
      xs: 'h-6 w-6 text-[10px]',
      sm: 'h-8 w-8 text-[11px]',
      md: 'h-9 w-9 text-xs',
      lg: 'h-12 w-12 text-sm',
      xl: 'h-16 w-16 text-lg',
    })[props.size],
)
</script>

<template>
  <span
    :class="
      cn(
        'inline-flex shrink-0 items-center justify-center font-semibold text-white shadow-sm ring-1 ring-black/5',
        square ? 'rounded-lg' : 'rounded-full',
        sizeClass,
        color,
      )
    "
    :title="name ?? undefined"
  >
    {{ initials(name) }}
  </span>
</template>
