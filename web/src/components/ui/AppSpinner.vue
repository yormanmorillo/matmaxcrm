<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { cn } from '@/lib/cn'

withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg'; label?: string }>(), { size: 'md', label: '' })
</script>

<template>
  <div class="flex items-center justify-center gap-2 text-muted">
    <Loader2
      :class="cn('animate-spin', { 'h-4 w-4': size === 'sm', 'h-5 w-5': size === 'md', 'h-7 w-7': size === 'lg' })"
    />
    <span v-if="label" class="text-sm">{{ label }}</span>
  </div>
</template>
