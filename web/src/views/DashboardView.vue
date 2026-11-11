<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  Check,
  CircleDollarSign,
  Clock3,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import { useAuthStore } from '@/stores/auth'
import { useReferenceStore } from '@/stores/reference'
import { useUiStore } from '@/stores/ui'
import { getList, updateRecord } from '@/lib/api'
import { currency, compactCurrency, formatDate, formatLongDate, hourInAppTimeZone, parseDate, relativeTime } from '@/lib/format'
import { APP_LOCALE, APP_TIMEZONE } from '@/lib/config'
import { stageMeta, statusMeta } from '@/lib/constants'
import type { EntityRecord } from '@/types/espocrm'

const router = useRouter()
const auth = useAuthStore()
const reference = useReferenceStore()
const ui = useUiStore()

const loading = ref(true)
const error = ref('')
const period = ref<'30d' | 'quarter' | 'year' | 'all'>('quarter')
const ownerId = ref('')
const teamId = ref('')

const contactsTotal = ref(0)
const accountsTotal = ref(0)
const leadsNew = ref(0)
const opportunities = ref<EntityRecord[]>([])
const tasks = ref<EntityRecord[]>([])
const calls = ref<EntityRecord[]>([])
const meetings = ref<EntityRecord[]>([])
const recent = ref<EntityRecord[]>([])
const oppTotal = ref(0)

const greeting = computed(() => {
  const hour = hourInAppTimeZone()
  const base = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'
  const name = auth.displayName.split(' ')[0]
  return `${base}, ${name}`
})

const today = computed(() =>
  formatLongDate(),
)

function periodStart(): Date | null {
  const now = new Date()
  if (period.value === '30d') {
    const start = new Date(now)
    start.setDate(start.getDate() - 30)
    start.setHours(0, 0, 0, 0)
    return start
  }
  if (period.value === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3)
    return new Date(now.getFullYear(), quarter * 3, 1)
  }
  if (period.value === 'year') return new Date(now.getFullYear(), 0, 1)
  return null
}

const periodStartValue = computed(() => {
  const start = periodStart()
  if (!start) return null
  return `${start.getFullYear()}-${`${start.getMonth() + 1}`.padStart(2, '0')}-${`${start.getDate()}`.padStart(2, '0')} 00:00:00`
})

const ownerWhere = computed(() =>
  ownerId.value ? [{ type: 'equals', field: 'assignedUserId', value: ownerId.value }] : [],
)

const teamMemberIds = computed(() => {
  if (!teamId.value) return []
  return reference.users
    .filter((user) => ((user.teamsIds as string[] | undefined) ?? []).includes(teamId.value))
    .map((user) => user.id)
})

const teamWhere = computed(() => {
  if (!teamId.value) return []
  return [
    {
      type: 'in',
      field: 'assignedUserId',
      value: teamMemberIds.value.length ? teamMemberIds.value : ['__no_members__'],
    },
  ]
})

const scopeWhere = computed(() => [...ownerWhere.value, ...teamWhere.value])

const openOpportunities = computed(() =>
  opportunities.value.filter((opp) => !['Closed Won', 'Closed Lost'].includes(String(opp.stage))),
)

const wonOpportunities = computed(() => {
  const start = periodStart()
  return opportunities.value.filter((opp) => {
    if (opp.stage !== 'Closed Won') return false
    if (!start) return true
    const date = parseDate(opp.closeDate)
    return Boolean(date && date >= start)
  })
})

const lostOpportunities = computed(() => {
  const start = periodStart()
  return opportunities.value.filter((opp) => {
    if (opp.stage !== 'Closed Lost') return false
    if (!start) return true
    const date = parseDate(opp.closeDate)
    return Boolean(date && date >= start)
  })
})

const openValue = computed(() =>
  openOpportunities.value.reduce((sum, opp) => sum + Number(opp.amount ?? 0), 0),
)
const wonValue = computed(() =>
  wonOpportunities.value.reduce((sum, opp) => sum + Number(opp.amount ?? 0), 0),
)

const winRate = computed(() => {
  const closed = wonOpportunities.value.length + lostOpportunities.value.length
  return closed ? Math.round((wonOpportunities.value.length / closed) * 100) : 0
})

const pipelineByStage = computed(() =>
  ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'].map((stage) => {
    const items = opportunities.value.filter((opp) => opp.stage === stage)
    return {
      stage,
      ...stageMeta(stage),
      count: items.length,
      total: items.reduce((sum, opp) => sum + Number(opp.amount ?? 0), 0),
    }
  }),
)

const maxStageTotal = computed(() => Math.max(1, ...pipelineByStage.value.map((item) => item.total)))

const pendingActivities = computed(
  () =>
    tasks.value.filter((task) => !['Completed', 'Canceled'].includes(String(task.status))).length +
    calls.value.filter((call) => call.status === 'Planned').length +
    meetings.value.filter((meeting) => meeting.status === 'Planned').length,
)

const upcomingTasks = computed(() =>
  [...tasks.value]
    .filter((task) => !['Completed', 'Canceled'].includes(String(task.status)))
    .sort((a, b) => String(a.dateEnd ?? '9999').localeCompare(String(b.dateEnd ?? '9999')))
    .slice(0, 6),
)

const allWonOpportunities = computed(() =>
  opportunities.value.filter((opp) => opp.stage === 'Closed Won'),
)

const monthlyTrend = computed(() => {
  const months: { key: string; label: string; total: number }[] = []
  const now = new Date()
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 15)
    months.push({
      key: `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`,
      label: new Intl.DateTimeFormat(APP_LOCALE, { month: 'short', timeZone: APP_TIMEZONE }).format(date),
      total: 0,
    })
  }
  for (const opp of allWonOpportunities.value) {
    const date = parseDate(opp.closeDate)
    if (!date) continue
    const key = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`
    const month = months.find((item) => item.key === key)
    if (month) month.total += Number(opp.amount ?? 0)
  }
  return months
})

const trendMax = computed(() => Math.max(1, ...monthlyTrend.value.map((month) => month.total)))

const trendPoints = computed(() =>
  monthlyTrend.value.map((month, index) => {
    const x = 24 + index * 111.2
    const y = 150 - (month.total / trendMax.value) * 120
    return { x, y, label: month.label, total: month.total }
  }),
)

const trendLine = computed(() => trendPoints.value.map((point) => `${point.x},${point.y}`).join(' '))
const trendArea = computed(() => {
  const points = trendPoints.value
  if (!points.length) return ''
  return `M ${points[0].x} 160 L ${points.map((point) => `${point.x} ${point.y}`).join(' L ')} L ${points[points.length - 1].x} 160 Z`
})

const scopeMeta: Record<string, { label: string; route: string; icon: typeof Users }> = {
  Contact: { label: 'Contacto', route: '/contacts', icon: Users },
  Account: { label: 'Empresa', route: '/accounts', icon: Building2 },
  Lead: { label: 'Lead', route: '/leads', icon: Target },
  Opportunity: { label: 'Oportunidad', route: '/opportunities', icon: TrendingUp },
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const createdAfter = periodStartValue.value
    const leadWhere = [...scopeWhere.value, { type: 'equals', field: 'status', value: 'New' }]
    if (createdAfter) {
      leadWhere.push({ type: 'after', field: 'createdAt', value: createdAfter })
    }

    const [contactRes, accountRes, leadRes, oppRes, taskRes, callRes, meetingRes, recentContacts, recentLeads] =
      await Promise.all([
        getList('Contact', { maxSize: 1, where: scopeWhere.value.length ? scopeWhere.value : undefined }),
        getList('Account', { maxSize: 1, where: scopeWhere.value.length ? scopeWhere.value : undefined }),
        getList('Lead', { maxSize: 1, where: leadWhere }),
        getList('Opportunity', {
          maxSize: 200,
          orderBy: 'closeDate',
          order: 'desc',
          select: 'name,accountName,contactName,stage,amount,closeDate,probability,assignedUserName,createdAt',
          where: scopeWhere.value.length ? scopeWhere.value : undefined,
        }),
        getList('Task', {
          maxSize: 200,
          orderBy: 'dateEnd',
          order: 'asc',
          select: 'name,status,priority,dateEnd,assignedUserName,accountName',
          where: scopeWhere.value.length ? scopeWhere.value : undefined,
        }),
        getList('Call', {
          maxSize: 200,
          select: 'name,status,dateStart,assignedUserName',
          where: scopeWhere.value.length ? scopeWhere.value : undefined,
        }),
        getList('Meeting', {
          maxSize: 200,
          select: 'name,status,dateStart,assignedUserName',
          where: scopeWhere.value.length ? scopeWhere.value : undefined,
        }),
        getList('Contact', {
          maxSize: 4,
          orderBy: 'createdAt',
          order: 'desc',
          select: 'name,createdAt',
          where: scopeWhere.value.length ? scopeWhere.value : undefined,
        }),
        getList('Lead', {
          maxSize: 4,
          orderBy: 'createdAt',
          order: 'desc',
          select: 'name,createdAt',
          where: scopeWhere.value.length ? scopeWhere.value : undefined,
        }),
      ])

    contactsTotal.value = Math.max(0, contactRes.total)
    accountsTotal.value = Math.max(0, accountRes.total)
    leadsNew.value = Math.max(0, leadRes.total)
    opportunities.value = oppRes.list
    oppTotal.value = Math.max(0, oppRes.total)
    tasks.value = taskRes.list
    calls.value = callRes.list
    meetings.value = meetingRes.list

    const merged: EntityRecord[] = [
      ...recentContacts.list.map((item) => ({ ...item, _scope: 'Contact' })),
      ...recentLeads.list.map((item) => ({ ...item, _scope: 'Lead' })),
      ...oppRes.list.slice(0, 4).map((item) => ({ ...item, _scope: 'Opportunity' })),
    ]
    recent.value = merged
      .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
      .slice(0, 6)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar el dashboard.'
  } finally {
    loading.value = false
  }
}

async function completeTask(task: EntityRecord): Promise<void> {
  try {
    await updateRecord('Task', task.id, { status: 'Completed' })
    tasks.value = tasks.value.filter((item) => item.id !== task.id)
    ui.toast('success', 'Tarea completada')
  } catch (err) {
    ui.toast('error', 'No se pudo completar', err instanceof Error ? err.message : undefined)
  }
}

function openRecent(item: EntityRecord): void {
  const meta = scopeMeta[String(item._scope)]
  if (meta) router.push(`${meta.route}/${item.id}`)
}

watch([period, ownerId, teamId], () => void load())

onMounted(() => {
  if (auth.canRead('User')) void reference.loadUsers()
  void reference.loadTeams()
  void load()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="greeting" :subtitle="`Resumen comercial · ${today}`" eyebrow="Dashboard">
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
        <div v-if="reference.teams.length && reference.users.length" class="w-[190px]">
          <AppSelect v-model="teamId" class="!h-9 text-[12px]" placeholder="Todos los equipos">
            <option v-for="team in reference.teams" :key="team.id" :value="team.id">
              {{ team.name }}
            </option>
          </AppSelect>
        </div>
        <AppButton variant="secondary" size="sm" :loading="loading" @click="load">
          <RefreshCw class="h-4 w-4" />
          <span class="hidden sm:inline">Actualizar</span>
        </AppButton>
      </template>
    </PageHeader>

    <div v-if="error" class="rounded-xl border border-danger/20 bg-danger/[0.05] px-4 py-3 text-[13px] text-danger">
      {{ error }}
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <div
        v-for="(kpi, index) in [
          { label: 'Contactos', value: contactsTotal, hint: 'Total en el CRM', icon: Users, tone: 'text-blue-500' },
          { label: 'Leads nuevos', value: leadsNew, hint: 'Estado Nuevo', icon: Target, tone: 'text-violet-500' },
          { label: 'Oportunidades', value: openOpportunities.length, hint: 'Etapas abiertas', icon: TrendingUp, tone: 'text-brand' },
          { label: 'Ventas ganadas', value: wonValue, hint: 'Periodo seleccionado', icon: Wallet, tone: 'text-emerald-500', money: true },
          { label: 'Ventas perdidas', value: lostOpportunities.length, hint: 'Periodo seleccionado', icon: TrendingDown, tone: 'text-red-500' },
          { label: 'Pendientes', value: pendingActivities, hint: 'Tareas y actividades', icon: CalendarClock, tone: 'text-amber-500' },
        ]"
        :key="kpi.label"
        class="card relative overflow-hidden p-4"
      >
        <div class="mb-3 flex items-start justify-between">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2">
            <component :is="kpi.icon" :class="['h-4 w-4', kpi.tone]" />
          </span>
          <span
            v-if="index === 3 && winRate"
            class="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300"
          >
            {{ winRate }}% win rate
          </span>
        </div>
        <p class="text-[11px] font-medium text-muted">{{ kpi.label }}</p>
        <p class="mt-1 text-[22px] font-semibold tracking-tight tabular-nums">
          <span v-if="loading" class="skeleton inline-block h-6 w-16 align-middle" />
          <template v-else>{{ kpi.money ? compactCurrency(kpi.value) : kpi.value }}</template>
        </p>
        <p class="mt-0.5 text-[10px] text-faint">{{ kpi.hint }}</p>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div class="card p-5 xl:col-span-2">
        <div class="mb-5 flex items-start justify-between">
          <div>
            <h2 class="section-title">Pipeline por etapa</h2>
            <p class="mt-0.5 text-[12px] text-muted">
              {{ openOpportunities.length }} oportunidades abiertas · {{ currency(openValue) }}
            </p>
          </div>
          <AppBadge tone="brand">{{ oppTotal }} total</AppBadge>
        </div>

        <div v-if="loading" class="space-y-3">
          <div v-for="index in 5" :key="index" class="skeleton h-8" />
        </div>
        <div v-else-if="opportunities.length" class="space-y-3.5">
          <div v-for="item in pipelineByStage" :key="item.stage" class="group">
            <div class="mb-1.5 flex items-center justify-between text-[12px]">
              <div class="flex items-center gap-2">
                <span class="h-2 w-2 rounded-full" :style="{ background: item.color }" />
                <span class="font-medium">{{ item.label }}</span>
                <span class="text-[11px] text-faint">{{ item.count }}</span>
              </div>
              <span class="font-medium tabular-nums text-muted">{{ currency(item.total) }}</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{ width: `${Math.max(2, (item.total / maxStageTotal) * 100)}%`, background: item.color }"
              />
            </div>
          </div>
        </div>
        <AppEmpty v-else compact title="Sin oportunidades" description="Crea tu primera oportunidad para ver el pipeline." />
      </div>

      <div class="card flex flex-col p-5">
        <div class="mb-2">
          <h2 class="section-title">Tasa de cierre</h2>
          <p class="mt-0.5 text-[12px] text-muted">Ganadas frente a perdidas</p>
        </div>
        <div class="flex flex-1 flex-col items-center justify-center py-3">
          <div class="relative h-36 w-36">
            <svg viewBox="0 0 120 120" class="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--line)" stroke-width="10" />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="var(--brand)"
                stroke-width="10"
                stroke-linecap="round"
                pathLength="100"
                :stroke-dasharray="`${winRate} ${100 - winRate}`"
              />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-[28px] font-semibold tracking-tight">{{ winRate }}%</span>
              <span class="text-[10px] uppercase tracking-[0.08em] text-faint">win rate</span>
            </div>
          </div>
          <div class="mt-4 grid w-full grid-cols-2 gap-2 text-center">
            <div class="rounded-lg bg-surface-2 px-2 py-2">
              <p class="text-[10px] text-faint">Ganadas</p>
              <p class="text-[13px] font-semibold text-emerald-600 dark:text-emerald-300">{{ wonOpportunities.length }}</p>
            </div>
            <div class="rounded-lg bg-surface-2 px-2 py-2">
              <p class="text-[10px] text-faint">Perdidas</p>
              <p class="text-[13px] font-semibold text-red-600 dark:text-red-300">{{ lostOpportunities.length }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Trend + tasks -->
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div class="card p-5 xl:col-span-2">
        <div class="mb-2 flex items-start justify-between">
          <div>
            <h2 class="section-title">Ventas ganadas por mes</h2>
            <p class="mt-0.5 text-[12px] text-muted">Últimos 6 meses · {{ currency(wonValue) }} en el periodo</p>
          </div>
          <CircleDollarSign class="h-4 w-4 text-faint" />
        </div>
        <div class="mt-3">
          <svg viewBox="0 0 600 180" class="h-44 w-full" preserveAspectRatio="none" role="img" aria-label="Tendencia de ventas">
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--brand)" stop-opacity="0.22" />
                <stop offset="100%" stop-color="var(--brand)" stop-opacity="0" />
              </linearGradient>
            </defs>
            <line v-for="y in [30, 70, 110, 150]" :key="y" x1="20" :y1="y" x2="580" :y2="y" stroke="var(--line)" stroke-width="1" />
            <path :d="trendArea" fill="url(#trendFill)" />
            <polyline :points="trendLine" fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <g v-for="point in trendPoints" :key="point.label">
              <circle :cx="point.x" :cy="point.y" r="3.5" fill="var(--surface)" stroke="var(--brand)" stroke-width="2" />
            </g>
          </svg>
          <div class="mt-1 flex justify-between px-2">
            <span v-for="month in monthlyTrend" :key="month.key" class="text-[10px] uppercase tracking-wide text-faint">
              {{ month.label }}
            </span>
          </div>
        </div>
      </div>

      <div class="card flex flex-col p-5">
        <div class="mb-3 flex items-center justify-between">
          <div>
            <h2 class="section-title">Tareas pendientes</h2>
            <p class="mt-0.5 text-[12px] text-muted">{{ pendingActivities }} actividades abiertas</p>
          </div>
          <Clock3 class="h-4 w-4 text-faint" />
        </div>
        <div v-if="loading" class="space-y-2">
          <div v-for="index in 4" :key="index" class="skeleton h-12" />
        </div>
        <div v-else-if="upcomingTasks.length" class="space-y-1">
          <div
            v-for="task in upcomingTasks"
            :key="task.id"
            class="group flex items-start gap-2.5 rounded-lg px-1.5 py-2 transition hover:bg-surface-2"
          >
            <button
              type="button"
              class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-line text-transparent transition hover:border-brand hover:text-brand"
              aria-label="Completar tarea"
              @click="completeTask(task)"
            >
              <Check class="h-3 w-3" />
            </button>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[12px] font-medium">{{ task.name }}</p>
              <p class="mt-0.5 flex items-center gap-1.5 text-[10px] text-faint">
                <span>{{ task.assignedUserName || 'Sin asignar' }}</span>
                <span>·</span>
                <span :class="task.dateEnd && new Date(String(task.dateEnd)) < new Date() ? 'text-danger' : ''">
                  {{ task.dateEnd ? formatDate(task.dateEnd) : 'Sin fecha' }}
                </span>
              </p>
            </div>
            <AppBadge :tone="statusMeta('Task', task.status).tone" size="sm">
              {{ statusMeta('Task', task.status).label }}
            </AppBadge>
          </div>
        </div>
        <AppEmpty v-else compact title="Todo al día" description="No tienes tareas pendientes." />
        <button
          class="mt-3 flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
          @click="router.push('/activities')"
        >
          Ver todas las actividades
          <ArrowUpRight class="h-3 w-3" />
        </button>
      </div>
    </div>

    <!-- Recent -->
    <div class="card p-5">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 class="section-title">Actividad reciente</h2>
          <p class="mt-0.5 text-[12px] text-muted">Últimos registros creados</p>
        </div>
        <button class="text-[11px] font-medium text-brand hover:underline" @click="router.push('/activity')">
          Ver todo
        </button>
      </div>
      <div v-if="loading" class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="index in 6" :key="index" class="skeleton h-14" />
      </div>
      <div v-else-if="recent.length" class="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="item in recent"
          :key="`${item._scope}-${item.id}`"
          class="flex items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-surface-2"
          @click="openRecent(item)"
        >
          <AppAvatar :name="String(item.name ?? '')" :size="'sm'" :square="item._scope === 'Account'" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[12px] font-medium">{{ item.name }}</span>
            <span class="block text-[10px] text-faint">
              {{ scopeMeta[String(item._scope)]?.label }} · {{ relativeTime(item.createdAt) }}
              <span v-if="item.contactName"> · {{ item.contactName }}</span>
            </span>
          </span>
          <ArrowUpRight class="h-3.5 w-3.5 shrink-0 text-faint" />
        </button>
      </div>
      <AppEmpty v-else compact title="Sin actividad todavía" description="Cuando crees contactos u oportunidades aparecerán aquí." />
    </div>
  </div>
</template>
