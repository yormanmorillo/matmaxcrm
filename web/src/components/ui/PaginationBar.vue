<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import AppSelect from './AppSelect.vue'

const props = withDefaults(
  defineProps<{
    page: number
    pageSize: number
    total: number
  }>(),
  {},
)

const emit = defineEmits<{
  (event: 'update:page', value: number): void
  (event: 'update:pageSize', value: number): void
}>()

const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const from = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const to = computed(() => Math.min(props.page * props.pageSize, props.total))

function go(page: number): void {
  emit('update:page', Math.min(Math.max(1, page), pages.value))
}

function changeSize(raw: string): void {
  const value = Number(raw)
  emit('update:pageSize', value)
  emit('update:page', 1)
}
</script>

<template>
  <div class="flex flex-col gap-3 border-t border-line px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
    <p class="text-[12px] text-muted">
      Mostrando <span class="font-medium text-ink">{{ from }}–{{ to }}</span> de
      <span class="font-medium text-ink">{{ total }}</span>
    </p>
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1.5">
        <span class="text-[12px] text-faint">Filas</span>
        <div class="w-[74px]">
          <AppSelect :model-value="String(pageSize)" class="!h-8 !py-0 text-[12px]" @change="changeSize">
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </AppSelect>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-40"
          :disabled="page <= 1"
          aria-label="Página anterior"
          @click="go(page - 1)"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <span class="px-1 text-[12px] tabular-nums text-muted">{{ page }} / {{ pages }}</span>
        <button
          type="button"
          class="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-40"
          :disabled="page >= pages"
          aria-label="Página siguiente"
          @click="go(page + 1)"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>
