<script setup lang="ts">
import { cn } from '@/lib/cn'

defineOptions({ inheritAttrs: false })

const model = defineModel<string | number | null | undefined>({ default: '' })

withDefaults(
  defineProps<{
    type?: string
    placeholder?: string
    disabled?: boolean
    autocomplete?: string
    invalid?: boolean
  }>(),
  { type: 'text', placeholder: '', disabled: false, autocomplete: 'off', invalid: false },
)
</script>

<template>
  <input
    v-model="model"
    v-bind="$attrs"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :autocomplete="autocomplete"
    :class="
      cn(
        'input-base h-10 py-0',
        invalid && 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(214,69,69,0.16)]',
      )
    "
  />
</template>
