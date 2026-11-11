<script setup lang="ts">
import { currency, formatDate, formatDateTime } from '@/lib/format'
import AppAvatar from './AppAvatar.vue'
import AppEmpty from './AppEmpty.vue'
import type { ColumnDef } from '@/lib/constants'
import type { EntityRecord } from '@/types/espocrm'
import { cn } from '@/lib/cn'

const props = withDefaults(
  defineProps<{
    columns: ColumnDef[]
    rows: EntityRecord[]
    loading?: boolean
    clickable?: boolean
    emptyTitle?: string
    emptyDescription?: string
    rowKey?: string
  }>(),
  {
    loading: false,
    clickable: true,
    emptyTitle: 'Sin resultados',
    emptyDescription: 'No hay registros que coincidan con los filtros actuales.',
    rowKey: 'id',
  },
)

const emit = defineEmits<{ (event: 'rowClick', row: EntityRecord): void }>()

function valueFor(row: EntityRecord, key: string): unknown {
  const parts = key.split('.')
  let value: unknown = row
  for (const part of parts) {
    if (value && typeof value === 'object') value = (value as Record<string, unknown>)[part]
    else return undefined
  }
  return value
}

function onRow(row: EntityRecord): void {
  if (props.clickable) emit('rowClick', row)
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[720px] border-collapse text-left">
      <thead>
        <tr class="border-b border-line">
          <th
            v-for="column in columns"
            :key="column.key"
            :style="{ width: column.width }"
            :class="
              cn(
                'px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-faint',
                column.hideOnMobile && 'hidden md:table-cell',
              )
            "
          >
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody v-if="loading">
        <tr v-for="index in 6" :key="index" class="border-b border-line/70">
          <td v-for="column in columns" :key="column.key" class="px-5 py-4">
            <div class="skeleton h-4" :class="index % 2 ? 'w-3/4' : 'w-1/2'" />
          </td>
        </tr>
      </tbody>
      <tbody v-else-if="rows.length">
        <tr
          v-for="row in rows"
          :key="String(row[rowKey])"
          tabindex="0"
          :class="
            cn(
              'group border-b border-line/70 transition-colors last:border-0',
              clickable && 'cursor-pointer hover:bg-surface-2/70 focus:bg-surface-2/70',
            )
          "
          @click="onRow(row)"
          @keydown.enter="onRow(row)"
        >
          <td
            v-for="column in columns"
            :key="column.key"
            :class="['px-5 py-3.5 text-sm', column.hideOnMobile && 'hidden md:table-cell']"
          >
            <slot :name="`cell-${column.key}`" :row="row" :value="valueFor(row, column.key)">
              <template v-if="column.type === 'person' || column.type === 'owner'">
                <div class="flex items-center gap-2.5">
                  <AppAvatar :name="String(valueFor(row, column.key) ?? '')" size="sm" />
                  <span class="truncate font-medium text-ink">{{ valueFor(row, column.key) || '—' }}</span>
                </div>
              </template>
              <template v-else-if="column.type === 'currency'">
                <span class="font-medium tabular-nums">{{ currency(valueFor(row, column.key)) }}</span>
              </template>
              <template v-else-if="column.type === 'date'">
                <span class="text-muted">{{ formatDate(valueFor(row, column.key)) }}</span>
              </template>
              <template v-else-if="column.type === 'datetime'">
                <span class="text-muted">{{ formatDateTime(valueFor(row, column.key)) }}</span>
              </template>
              <template v-else-if="column.type === 'email'">
                <a
                  v-if="valueFor(row, column.key)"
                  :href="`mailto:${valueFor(row, column.key)}`"
                  class="text-muted hover:text-brand"
                  @click.stop
                >
                  {{ valueFor(row, column.key) }}
                </a>
                <span v-else class="text-faint">—</span>
              </template>
              <template v-else-if="column.type === 'phone'">
                <a
                  v-if="valueFor(row, column.key)"
                  :href="`tel:${valueFor(row, column.key)}`"
                  class="text-muted hover:text-brand"
                  @click.stop
                >
                  {{ valueFor(row, column.key) }}
                </a>
                <span v-else class="text-faint">—</span>
              </template>
              <template v-else>
                <span :class="valueFor(row, column.key) ? 'text-ink' : 'text-faint'">
                  {{ valueFor(row, column.key) || '—' }}
                </span>
              </template>
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
    <AppEmpty v-if="!loading && !rows.length" :title="emptyTitle" :description="emptyDescription">
      <template #action><slot name="empty-action" /></template>
    </AppEmpty>
  </div>
</template>
