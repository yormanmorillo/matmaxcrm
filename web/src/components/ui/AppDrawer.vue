<script setup lang="ts">
import { computed } from 'vue'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { X } from 'lucide-vue-next'
import { cn } from '@/lib/cn'

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    width?: 'md' | 'lg' | 'xl' | '2xl'
  }>(),
  { title: '', description: '', width: 'lg' },
)

const widthClass = computed(
  () =>
    ({
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      '2xl': 'max-w-6xl',
    })[props.width],
)
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] animate-fade-in" />
      <DialogContent
        :class="
          cn(
            'fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-line bg-surface shadow-2xl animate-slide-in-right',
            widthClass,
          )
        "
      >
        <div class="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <DialogTitle class="text-lg font-semibold tracking-tight">
              <slot name="title">{{ title }}</slot>
            </DialogTitle>
            <DialogDescription v-if="description || $slots.description" class="mt-1 text-sm text-muted">
              <slot name="description">{{ description }}</slot>
            </DialogDescription>
          </div>
          <button
            type="button"
            class="-mr-1 rounded-lg p-1.5 text-faint transition hover:bg-surface-2 hover:text-ink"
            aria-label="Cerrar"
            @click="open = false"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto px-6 py-5">
          <slot />
        </div>
        <div v-if="$slots.footer" class="flex items-center justify-end gap-2 border-t border-line px-6 py-4">
          <slot name="footer" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
