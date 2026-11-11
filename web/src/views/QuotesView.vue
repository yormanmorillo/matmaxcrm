<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { FileText, Plus, Search } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import QuoteDrawer from '@/components/crm/QuoteDrawer.vue'
import { getList } from '@/lib/api'
import { currency, formatDate } from '@/lib/format'
import { statusMeta } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth'
import type { EntityRecord } from '@/types/espocrm'

const auth = useAuthStore()
const loading = ref(true)
const error = ref('')
const search = ref('')
const quotes = ref<EntityRecord[]>([])
const drawerOpen = ref(false)
const selected = ref<EntityRecord | null>(null)

const canCreate = computed(() => auth.can('CCQuote', 'create'))
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return quotes.value
  return quotes.value.filter((quote) =>
    `${quote.name ?? ''} ${quote.opportunityName ?? ''} ${quote.accountName ?? ''} ${quote.contactName ?? ''}`
      .toLowerCase()
      .includes(term),
  )
})
const totalValue = computed(() => quotes.value.reduce((sum, quote) => sum + Number(quote.total ?? 0), 0))

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const data = await getList<EntityRecord>('CCQuote', {
      maxSize: 200,
      orderBy: 'createdAt',
      order: 'desc',
      select:
        'name,status,total,subtotal,taxRate,taxAmount,validUntil,items,notes,opportunityId,opportunityName,accountId,accountName,contactId,contactName,createdAt',
    })
    quotes.value = data.list
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudieron cargar los presupuestos.'
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
  <div class="space-y-6">
    <PageHeader
      title="Presupuestos"
      :subtitle="`${quotes.length} presupuestos · ${currency(totalValue)} en total`"
      eyebrow="CRM"
    >
      <template #actions>
        <AppButton v-if="canCreate" variant="primary" size="sm" @click="create">
          <Plus class="h-4 w-4" />
          Nuevo presupuesto
        </AppButton>
      </template>
    </PageHeader>

    <div class="flex items-center gap-2">
      <div class="relative w-full sm:max-w-sm">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <AppInput v-model="search" class="!h-9 pl-9 text-[13px]" placeholder="Buscar presupuesto, oportunidad o empresa…" />
      </div>
    </div>

    <div v-if="error" class="rounded-xl border border-danger/20 bg-danger/[0.05] px-4 py-3 text-[13px] text-danger">
      {{ error }}
    </div>

    <div v-if="loading" class="card flex items-center justify-center py-16">
      <span class="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
    </div>

    <div v-else-if="filtered.length" class="space-y-2">
      <article
        v-for="quote in filtered"
        :key="quote.id"
        class="card flex cursor-pointer flex-wrap items-center gap-3 p-4 transition hover:border-brand/30 hover:bg-surface-2/30"
        @click="edit(quote)"
      >
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <FileText class="h-4 w-4" />
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="truncate text-[13px] font-semibold">{{ quote.name }}</p>
            <AppBadge :tone="statusMeta('CCQuote', quote.status).tone" size="sm">{{ statusMeta('CCQuote', quote.status).label }}</AppBadge>
          </div>
          <p class="mt-0.5 truncate text-[11px] text-muted">
            {{ quote.opportunityName || 'Sin oportunidad' }}
            <span v-if="quote.accountName"> · {{ quote.accountName }}</span>
            <span v-if="quote.contactName"> · {{ quote.contactName }}</span>
          </p>
        </div>
        <div class="text-right">
          <p class="text-[14px] font-semibold tabular-nums">{{ currency(quote.total) }}</p>
          <p class="text-[10px] text-faint">{{ quote.validUntil ? `Válido hasta ${formatDate(quote.validUntil)}` : 'Sin vencimiento' }}</p>
        </div>
      </article>
    </div>

    <AppEmpty
      v-else
      title="Sin presupuestos"
      :description="search ? 'No hay presupuestos que coincidan con la búsqueda.' : 'Crea el primer presupuesto desde una oportunidad o desde aquí.'"
    >
      <template v-if="canCreate" #action>
        <AppButton variant="primary" size="sm" @click="create">
          <Plus class="h-4 w-4" />
          Nuevo presupuesto
        </AppButton>
      </template>
    </AppEmpty>

    <QuoteDrawer v-model:open="drawerOpen" :quote="selected" @saved="load" @deleted="load" />
  </div>
</template>
