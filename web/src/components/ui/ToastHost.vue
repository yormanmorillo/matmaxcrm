<script setup lang="ts">
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()

const icon = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const tone = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-blue-500',
}
</script>

<template>
  <div class="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
    <div
      v-for="toast in ui.toasts"
      :key="toast.id"
      class="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-xl animate-slide-up"
      role="status"
      aria-live="polite"
    >
      <component :is="icon[toast.type]" :class="['mt-0.5 h-4.5 w-4.5 shrink-0', tone[toast.type]]" />
      <div class="min-w-0 flex-1">
        <p class="text-[13px] font-semibold">{{ toast.title }}</p>
        <p v-if="toast.description" class="mt-0.5 text-[12px] leading-relaxed text-muted">
          {{ toast.description }}
        </p>
      </div>
      <button
        type="button"
        class="rounded p-0.5 text-faint hover:text-ink"
        aria-label="Cerrar aviso"
        @click="ui.dismissToast(toast.id)"
      >
        <X class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>
