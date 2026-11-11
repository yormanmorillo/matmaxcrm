<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { cn } from '@/lib/cn'

const model = defineModel<string | number | null | undefined>({ default: '' })
const emit = defineEmits<{ (event: 'change', value: string): void }>()

function onChange(event: Event): void {
  emit('change', (event.target as HTMLSelectElement).value)
}

withDefaults(
  defineProps<{
    disabled?: boolean
    invalid?: boolean
    placeholder?: string
  }>(),
  { disabled: false, invalid: false, placeholder: '' },
)
</script>

<template>
  <div class="relative">
    <select
      v-model="model"
      :disabled="disabled"
      @change="onChange"
      :class="
        cn(
          'input-base h-10 cursor-pointer appearance-none py-0 pr-9',
          invalid && 'border-danger',
          disabled && 'cursor-not-allowed opacity-60',
        )
      "
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <slot />
    </select>
    <ChevronDown class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
  </div>
</template>
