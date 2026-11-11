<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Download, Percent, TrendingDown, TrendingUp, Wallet } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import { getList } from '@/lib/api'
import { currency, parseDate } from '@/lib/format'
import { DEFAULT_STAGES, stageMeta } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth'
import { useReferenceStore } from '@/stores/reference'
import { useUiStore } from '@/stores/ui'
import type { EntityRecord } from '@/types/espocrm'

const auth = useAuthStore()
const reference = useReferenceStore()
const ui = useUiStore()

const loading = ref(true)
const error = ref('')
const opportunities = ref<EntityRecord[]>([])
const total = ref(0)
const period = ref<'30d' | 'quarter' | 'year' | 'all'>('year')
const ownerId = ref('')

function periodStart(): Date | null {
  const now = new Date()
  if (period.value === '30d') {
    const start = new Date(now)
    start.setDate(start.getDate() - 30)
    start.setHours(0, 0, 0, 0)
    return start
  }
  if (period.value === 'quarter') {
    return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
  }
  if (period.value === 'year') return new Date(now.getFullYear(), 0, 1)
  return null
}

function inPeriod(item: EntityRecord): boolean {
  const start = periodStart()
  if (!start) return true
  const date = parseDate(item.closeDate)
  return Boolean(date && date >= start)
}

const scoped = computed(() => opportunities.value.filter(inPeriod))
const openItems = computed(() => scoped.value.filter((item) => !['Closed Won', 'Closed Lost'].includes(String(item.stage))))
const wonItems = computed(() => scoped.value.filter((item) => item.stage === 'Closed Won'))
const lostItems = computed(() => scoped.value.filter((item) => item.stage === 'Closed Lost'))

const openValue = computed(() => openItems.value.reduce((sum, item) => sum + Number(item.amount ?? 0), 0))
const wonValue = computed(() => wonItems.value.reduce((sum, item) => sum + Number(item.amount ?? 0), 0))
const avgDeal = computed(() => (wonItems.value.length ? wonValue.value / wonItems.value.length : 0))
const winRate = computed(() => {
  const closed = wonItems.value.length + lostItems.value.length
  return closed ? Math.round((wonItems.value.length / closed) * 100) : 0
})

const stageRows = computed(() =>
  DEFAULT_STAGES.map((stage) => {
    const items = scoped.value.filter((item) => item.stage === stage)
    return {
      stage,
      ...stageMeta(stage),
      count: items.length,
      total: items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
      share: scoped.value.length ? Math.round((items.length / scoped.value.length) * 100) : 0,
    }
  }),
)

const maxStage = computed(() => Math.max(1, ...stageRows.value.map((row) => row.total)))

const ownerRows = computed(() => {
  const map = new Map<string, { name: string; count: number; open: number; won: number; lost: number }>()
  for (const item of scoped.value) {
    const name = String(item.assignedUserName || 'Sin asignar')
    const row = map.get(name) ?? { name, count: 0, open: 0, won: 0, lost: 0 }
    row.count += 1
    if (item.stage === 'Closed Won') row.won += Number(item.amount ?? 0)
    else if (item.stage === 'Closed Lost') row.lost += 1
    else row.open += Number(item.amount ?? 0)
    map.set(name, row)
  }
  return [...map.values()].sort((a, b) => b.won - a.won)
})

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const data = await getList('Opportunity', {
      maxSize: 200,
      orderBy: 'closeDate',
      order: 'desc',
      select: 'name,contactName,stage,amount,closeDate,assignedUserName,accountName,probability',
      where: ownerId.value
        ? [{ type: 'equals', field: 'assignedUserId', value: ownerId.value }]
        : undefined,
    })
    opportunities.value = data.list
    total.value = Math.max(0, data.total)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudieron cargar los informes.'
  } finally {
    loading.value = false
  }
}

function exportCsv(): void {
  const lines = [
    ['Oportunidad', 'Contacto', 'Empresa', 'Etapa', 'Importe', 'Probabilidad', 'Cierre', 'Responsable'].map((v) => `"${v}"`).join(','),
    ...scoped.value.map((item) =>
      [item.name, item.contactName, item.accountName, stageMeta(item.stage).label, item.amount, item.probability, item.closeDate, item.assignedUserName]
        .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
        .join(','),
    ),
  ]
  const blob = new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `matmax-informe-comercial-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
  ui.toast('success', 'Informe exportado', `${scoped.value.length} oportunidades.`)
}

watch([period, ownerId], () => void load())

onMounted(() => {
  if (auth.canRead('User')) void reference.loadUsers()
  void load()
})
</script>

<template>
  <div class="space-y-5">
    <PageHeader title="Informes comerciales" subtitle="Rendimiento del pipeline y del equipo" eyebrow="Gestión">
      <template #actions>
        <div class="w-[150px]">
          <AppSelect v-model="period" class="!h-9 text-[12px]">
            <option value="30d">Últimos 30 días</option>
            <option value="quarter">Este trimestre</option>
            <option value="year">Este año</option>
            <option value="all">Todo el histórico</option>
          </AppSelect>
        </div>
        <div v-if="reference.users.length" class="w-[190px]">
          <AppSelect v-model="ownerId" class="!h-9 text-[12px]" placeholder="Todos los responsables">
            <option v-for="user in reference.users" :key="user.id" :value="user.id">
              {{ user.name || user.userName }}
            </option>
          </AppSelect>
        </div>
        <AppButton variant="secondary" size="sm" @click="exportCsv">
          <Download class="h-4 w-4" />
          Exportar
        </AppButton>
      </template>
    </PageHeader>

    <div v-if="error" class="rounded-xl border border-danger/20 bg-danger/[0.05] px-4 py-3 text-[13px] text-danger">{{ error }}</div>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="card p-4">
        <div class="flex items-center gap-2 text-[11px] text-muted"><TrendingUp class="h-3.5 w-3.5 text-brand" /> Pipeline abierto</div>
        <p class="mt-1.5 text-[22px] font-semibold tabular-nums">{{ currency(openValue) }}</p>
        <p class="text-[10px] text-faint">{{ openItems.length }} oportunidades</p>
      </div>
      <div class="card p-4">
        <div class="flex items-center gap-2 text-[11px] text-muted"><Wallet class="h-3.5 w-3.5 text-emerald-500" /> Ventas ganadas</div>
        <p class="mt-1.5 text-[22px] font-semibold tabular-nums">{{ currency(wonValue) }}</p>
        <p class="text-[10px] text-faint">{{ wonItems.length }} cerradas</p>
      </div>
      <div class="card p-4">
        <div class="flex items-center gap-2 text-[11px] text-muted"><Percent class="h-3.5 w-3.5 text-violet-500" /> Tasa de cierre</div>
        <p class="mt-1.5 text-[22px] font-semibold tabular-nums">{{ winRate }}%</p>
        <p class="text-[10px] text-faint">{{ lostItems.length }} perdidas</p>
      </div>
      <div class="card p-4">
        <div class="flex items-center gap-2 text-[11px] text-muted"><TrendingDown class="h-3.5 w-3.5 text-amber-500" /> Ticket medio</div>
        <p class="mt-1.5 text-[22px] font-semibold tabular-nums">{{ currency(avgDeal) }}</p>
        <p class="text-[10px] text-faint">Sobre ventas ganadas</p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div class="card p-5">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="section-title">Pipeline por etapa</h2>
          <span class="text-[11px] text-faint">{{ total }} oportunidades en total</span>
        </div>
        <div v-if="loading" class="space-y-3">
          <div v-for="index in 6" :key="index" class="skeleton h-8" />
        </div>
        <div v-else-if="scoped.length" class="space-y-3.5">
          <div v-for="row in stageRows" :key="row.stage">
            <div class="mb-1 flex items-center justify-between text-[12px]">
              <span class="flex items-center gap-2">
                <span class="h-2 w-2 rounded-full" :style="{ background: row.color }" />
                {{ row.label }}
                <span class="text-[10px] text-faint">{{ row.count }}</span>
              </span>
              <span class="tabular-nums text-muted">{{ currency(row.total) }}</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-surface-2">
              <div class="h-full rounded-full" :style="{ width: `${Math.max(2, (row.total / maxStage) * 100)}%`, background: row.color }" />
            </div>
          </div>
        </div>
        <AppEmpty v-else compact title="Sin datos" description="Crea oportunidades para generar el informe." />
      </div>

      <div class="card overflow-hidden">
        <div class="border-b border-line px-5 py-4">
          <h2 class="section-title">Rendimiento por responsable</h2>
        </div>
        <div v-if="loading" class="space-y-2 p-4">
          <div v-for="index in 4" :key="index" class="skeleton h-10" />
        </div>
        <div v-else-if="ownerRows.length" class="overflow-x-auto">
          <table class="w-full min-w-[520px] text-left">
            <thead>
              <tr class="border-b border-line text-[10px] uppercase tracking-wide text-faint">
                <th class="px-5 py-2.5 font-semibold">Responsable</th>
                <th class="px-3 py-2.5 text-right font-semibold">Opps</th>
                <th class="px-3 py-2.5 text-right font-semibold">Abierto</th>
                <th class="px-3 py-2.5 text-right font-semibold">Ganado</th>
                <th class="px-5 py-2.5 text-right font-semibold">Perdidas</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in ownerRows" :key="row.name" class="border-b border-line/70 last:border-0">
                <td class="px-5 py-3 text-[12px] font-medium">{{ row.name }}</td>
                <td class="px-3 py-3 text-right text-[12px] tabular-nums text-muted">{{ row.count }}</td>
                <td class="px-3 py-3 text-right text-[12px] tabular-nums">{{ currency(row.open) }}</td>
                <td class="px-3 py-3 text-right text-[12px] font-medium tabular-nums text-emerald-600 dark:text-emerald-300">{{ currency(row.won) }}</td>
                <td class="px-5 py-3 text-right text-[12px] tabular-nums text-muted">{{ row.lost }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <AppEmpty v-else compact title="Sin responsables" description="Asigna oportunidades para ver el rendimiento." />
      </div>
    </div>

    <div class="card overflow-hidden">
      <div class="border-b border-line px-5 py-4">
        <h2 class="section-title">Detalle de oportunidades del periodo</h2>
      </div>
      <div v-if="loading" class="space-y-2 p-4">
        <div v-for="index in 4" :key="index" class="skeleton h-10" />
      </div>
      <div v-else-if="scoped.length" class="overflow-x-auto">
        <table class="w-full min-w-[840px] text-left">
          <thead>
            <tr class="border-b border-line text-[10px] uppercase tracking-wide text-faint">
              <th class="px-5 py-2.5 font-semibold">Oportunidad</th>
              <th class="px-3 py-2.5 font-semibold">Contacto</th>
              <th class="px-3 py-2.5 font-semibold">Empresa</th>
              <th class="px-3 py-2.5 font-semibold">Etapa</th>
              <th class="px-3 py-2.5 text-right font-semibold">Importe</th>
              <th class="px-3 py-2.5 text-right font-semibold">Prob.</th>
              <th class="px-5 py-2.5 text-right font-semibold">Cierre</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in scoped" :key="item.id" class="border-b border-line/70 last:border-0">
              <td class="px-5 py-3 text-[12px] font-medium">{{ item.name }}</td>
              <td class="px-3 py-3 text-[12px] text-muted">{{ item.contactName || 'Sin contacto' }}</td>
              <td class="px-3 py-3 text-[12px] text-muted">{{ item.accountName || '—' }}</td>
              <td class="px-3 py-3 text-[12px]">
                <span class="inline-flex items-center gap-1.5">
                  <span class="h-1.5 w-1.5 rounded-full" :style="{ background: stageMeta(item.stage).color }" />
                  {{ stageMeta(item.stage).label }}
                </span>
              </td>
              <td class="px-3 py-3 text-right text-[12px] tabular-nums">{{ currency(item.amount) }}</td>
              <td class="px-3 py-3 text-right text-[12px] tabular-nums text-muted">{{ item.probability ?? 0 }}%</td>
              <td class="px-5 py-3 text-right text-[12px] text-muted">{{ item.closeDate || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppEmpty v-else compact title="Sin oportunidades en el periodo" description="Cambia el filtro de fechas o crea nuevas oportunidades." />
    </div>
  </div>
</template>
