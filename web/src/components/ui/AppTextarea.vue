<script setup lang="ts">
import { cn } from '@/lib/cn'

const model = defineModel<string | null | undefined>({ default: '' })

withDefaults(
  defineProps<{
    rows?: number
    placeholder?: string
    disabled?: boolean
    invalid?: boolean
  }>(),
  { rows: 4, placeholder: '', disabled: false, invalid: false },
)
</script>

<template>
  <textarea
    v-model="model"
    :rows="rows"
    :placeholder="placeholder"
    :disabled="disabled"
    :class="
      cn(
        'input-base resize-y',
        invalid && 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(214,69,69,0.16)]',
      )
    "
  />
</template>
