<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { FileText, Plus } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import QuoteDrawer from './QuoteDrawer.vue'
import { getList } from '@/lib/api'
import { currency, formatDate } from '@/lib/format'
import { statusMeta } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth'
import type { EntityRecord } from '@/types/espocrm'

const props = defineProps<{ opportunity: EntityRecord }>()
const auth = useAuthStore()
const loading = ref(true)
const quotes = ref<EntityRecord[]>([])
const drawerOpen = ref(false)
const selected = ref<EntityRecord | null>(null)
const canCreate = computed(() => auth.can('CCQuote', 'create'))

async function load(): Promise<void> {
  loading.value = true
  try {
    const data = await getList<EntityRecord>('CCQuote', {
      maxSize: 100,
      orderBy: 'createdAt',
      order: 'desc',
      where: [{ type: 'equals', field: 'opportunityId', value: props.opportunity.id }],
      select: 'name,status,total,subtotal,taxRate,taxAmount,validUntil,items,notes,opportunityId,opportunityName,accountId,accountName,contactId,contactName,createdAt',
    })
    quotes.value = data.list
  } finally {
    loading.value = false
  }
}

function create(): void {
  selected.value = null
  drawerOpen.value = true
}

function edit(quote: EntityRecord): void {
  selected.value = quote
  drawerOpen.value = true
}

onMounted(load)
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <p class="text-[12px] text-muted">{{ quotes.length }} presupuestos vinculados a esta oportunidad</p>
      <AppButton v-if="canCreate" variant="secondary" size="sm" @click="create">
        <Plus class="h-3.5 w-3.5" />
        Nuevo presupuesto
      </AppButton>
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <span class="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
    </div>
    <div v-else-if="quotes.length" class="divide-y divide-line rounded-xl border border-line">
      <button
        v-for="quote in quotes"
        :key="quote.id"
        type="button"
        class="flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-surface-2/40"
        @click="edit(quote)"
      >
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <FileText class="h-4 w-4" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-[12px] font-medium">{{ quote.name }}</p>
          <p class="mt-0.5 text-[10px] text-faint">
            {{ quote.validUntil ? `Válido hasta ${formatDate(quote.validUntil)}` : 'Sin vencimiento' }}
          </p>
        </div>
        <AppBadge :tone="statusMeta('CCQuote', quote.status).tone" size="sm">{{ statusMeta('CCQuote', quote.status).label }}</AppBadge>
        <span class="w-28 text-right text-[12px] font-semibold tabular-nums">{{ currency(quote.total) }}</span>
      </button>
    </div>
    <AppEmpty v-else compact title="Sin presupuestos" description="Crea un presupuesto con los tratamientos de esta oportunidad." />

    <QuoteDrawer v-model:open="drawerOpen" :quote="selected" :opportunity="opportunity" @saved="load" @deleted="load" />
  </div>
</template>
