<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { Check, ChevronDown, Search, X } from 'lucide-vue-next'
import { getList, getRecord } from '@/lib/api'
import type { EntityRecord } from '@/types/espocrm'
import { cn } from '@/lib/cn'

const props = withDefaults(
  defineProps<{
    entity: string
    placeholder?: string
    labelField?: string
    disabled?: boolean
    displayValue?: string
  }>(),
  { placeholder: 'Buscar…', labelField: 'name', disabled: false, displayValue: '' },
)

const model = defineModel<string | null | undefined>({ default: null })

const open = ref(false)
const query = ref('')
const results = ref<EntityRecord[]>([])
const loading = ref(false)
const selectedLabel = ref(props.displayValue)
const root = ref<HTMLElement | null>(null)
let timer: number | undefined
let seq = 0

function labelFor(record: EntityRecord): string {
  if (props.labelField === 'userName') {
    return String(record.name || record.userName || record.id)
  }
  return String(record[props.labelField] || record.name || record.userName || record.id)
}

async function resolveLabel(): Promise<void> {
  if (!model.value) {
    selectedLabel.value = ''
    return
  }
  if (props.displayValue) {
    selectedLabel.value = props.displayValue
    return
  }
  if (selectedLabel.value) return
  try {
    const record = await getRecord(props.entity, String(model.value), {
      select: props.labelField === 'userName' ? 'name,userName' : 'name',
    })
    selectedLabel.value = labelFor(record)
  } catch {
    selectedLabel.value = ''
  }
}

async function search(term: string): Promise<void> {
  const current = ++seq
  loading.value = true
  try {
    const where = term.trim()
      ? [{ type: 'textFilter', value: term.trim() }]
      : undefined
    const data = await getList(props.entity, {
      maxSize: 8,
      orderBy: props.labelField === 'userName' ? 'userName' : 'name',
      order: 'asc',
      select: props.labelField === 'userName' ? 'name,userName,isActive' : 'name',
      where,
    })
    if (current === seq) results.value = data.list
  } catch {
    if (current === seq) results.value = []
  } finally {
    if (current === seq) loading.value = false
  }
}

function focusInput(): void {
  open.value = true
  query.value = ''
  void search('')
}

function choose(record: EntityRecord): void {
  model.value = record.id
  selectedLabel.value = labelFor(record)
  open.value = false
  query.value = ''
}

function clear(): void {
  model.value = null
  selectedLabel.value = ''
  query.value = ''
  open.value = false
}

function onClickOutside(event: MouseEvent): void {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

watch(model, () => {
  selectedLabel.value = ''
  void resolveLabel()
})

watch(query, (value) => {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => void search(value), 220)
})

resolveLabel()
document.addEventListener('mousedown', onClickOutside)
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
  window.clearTimeout(timer)
})
</script>

<template>
  <div ref="root" class="relative">
    <div
      role="button"
      tabindex="0"
      :aria-disabled="disabled"
      :class="
        cn(
          'input-base flex h-10 cursor-pointer items-center justify-between gap-2 py-0 text-left',
          disabled && 'cursor-not-allowed opacity-60',
        )
      "
      @click="focusInput"
      @keydown.enter.prevent="focusInput"
      @keydown.space.prevent="focusInput"
    >
      <span :class="selectedLabel ? 'text-ink' : 'text-faint'" class="truncate">
        {{ selectedLabel || placeholder }}
      </span>
      <span class="flex shrink-0 items-center gap-1">
        <button
          v-if="model"
          type="button"
          class="rounded p-0.5 text-faint hover:text-ink"
          aria-label="Quitar selección"
          @click.stop="clear"
        >
          <X class="h-3.5 w-3.5" />
        </button>
        <ChevronDown class="h-4 w-4 text-faint" />
      </span>
    </div>

    <div
      v-if="open"
      class="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-xl animate-slide-up"
    >
      <div class="flex items-center gap-2 border-b border-line px-3">
        <Search class="h-3.5 w-3.5 text-faint" />
        <input
          v-model="query"
          type="text"
          class="h-9 w-full bg-transparent text-[13px] outline-none placeholder:text-faint"
          :placeholder="placeholder"
          autofocus
          @keydown.esc="open = false"
        />
        <span v-if="loading" class="h-3 w-3 animate-spin rounded-full border-2 border-line border-t-brand" />
      </div>
      <div class="max-h-56 overflow-y-auto p-1">
        <button
          v-for="record in results"
          :key="record.id"
          type="button"
          class="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition hover:bg-surface-2"
          @click="choose(record)"
        >
          <span class="truncate">{{ labelFor(record) }}</span>
          <Check v-if="record.id === model" class="h-3.5 w-3.5 text-brand" />
        </button>
        <p v-if="!loading && !results.length" class="px-3 py-6 text-center text-[12px] text-faint">
          Sin resultados
        </p>
      </div>
    </div>
  </div>
</template>
