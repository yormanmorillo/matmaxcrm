<script setup lang="ts">
import { computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import { cn } from '@/lib/cn'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'subtle'
    size?: 'sm' | 'md' | 'lg' | 'icon'
    type?: 'button' | 'submit' | 'reset'
    loading?: boolean
    disabled?: boolean
    block?: boolean
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    type: 'button',
    loading: false,
    disabled: false,
    block: false,
  },
)

const variantClass = computed(
  () =>
    ({
      primary:
        'bg-brand text-white shadow-sm hover:bg-brand-strong disabled:hover:bg-brand',
      secondary:
        'border border-line bg-surface text-ink hover:bg-surface-2',
      ghost: 'text-muted hover:bg-surface-2 hover:text-ink',
      danger: 'bg-danger text-white shadow-sm hover:brightness-95',
      outline: 'border border-brand/40 text-brand hover:bg-brand-soft',
      subtle: 'bg-brand-soft text-brand hover:brightness-95',
    })[props.variant],
)

const sizeClass = computed(
  () =>
    ({
      sm: 'h-8 px-3 text-[13px]',
      md: 'h-10 px-4 text-sm',
      lg: 'h-11 px-5 text-sm',
      icon: 'h-9 w-9',
    })[props.size],
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="
      cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variantClass,
        sizeClass,
        block && 'w-full',
      )
    "
  >
    <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
    <slot v-else name="icon" />
    <slot />
  </button>
</template>
