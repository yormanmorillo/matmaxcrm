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
    size?: 'sm' | 'md' | 'lg' | 'xl'
    hideClose?: boolean
    layer?: number
  }>(),
  { title: '', description: '', size: 'md', hideClose: false, layer: 50 },
)

const widthClass = computed(
  () =>
    ({
      sm: 'max-w-md',
      md: 'max-w-xl',
      lg: 'max-w-3xl',
      xl: 'max-w-5xl',
    })[props.size],
)
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-in" :style="{ zIndex: layer }" />
      <DialogContent
        :class="
          cn(
            'fixed left-1/2 top-1/2 max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl animate-slide-up',
            widthClass,
          )
        "
        :style="{ zIndex: layer + 1 }"
      >
        <div class="mb-5 flex items-start justify-between gap-4">
          <div>
            <DialogTitle class="text-lg font-semibold tracking-tight">
              <slot name="title">{{ title }}</slot>
            </DialogTitle>
            <DialogDescription v-if="description || $slots.description" class="mt-1 text-sm text-muted">
              <slot name="description">{{ description }}</slot>
            </DialogDescription>
          </div>
          <button
            v-if="!hideClose"
            type="button"
            class="-mr-1 -mt-1 rounded-lg p-1.5 text-faint transition hover:bg-surface-2 hover:text-ink"
            aria-label="Cerrar"
            @click="open = false"
          >
            <X class="h-4.5 w-4.5" />
          </button>
        </div>
        <slot />
        <div v-if="$slots.footer" class="mt-6 flex items-center justify-end gap-2">
          <slot name="footer" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
