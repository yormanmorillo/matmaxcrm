<script setup lang="ts">
import { computed, onMounted, ref, type Component } from 'vue'
import { useRouter } from 'vue-router'
import {
  CalendarDays,
  CheckSquare,
  MessageSquare,
  Phone,
  RefreshCw,
  TrendingUp,
  UserPlus,
} from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import AppSpinner from '@/components/ui/AppSpinner.vue'
import { request } from '@/lib/api'
import { currency, formatDate, formatDateTime, parseDate, relativeTime } from '@/lib/format'
import { stageMeta, statusMeta } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth'
import type { EntityRecord } from '@/types/espocrm'

type EntityType = 'Contact' | 'Account' | 'Opportunity' | 'Lead'
type Filter = 'all' | 'activity' | 'note' | 'opportunity'

interface TimelineEvent {
  id: string
  kind: 'activity' | 'note' | 'system' | 'opportunity'
  date: string
  dateOnly: boolean
  title: string
  detail?: string
  meta?: string
  to?: string
  icon: Component
  tone: string
}

const props = defineProps<{
  entityType: EntityType
  entityId: string
  accountId?: string
  contactId?: string
}>()

const router = useRouter()
const auth = useAuthStore()

const loading = ref(true)
const error = ref('')
const events = ref<TimelineEvent[]>([])
const filter = ref<Filter>('all')

const filters = computed(() => [
  { key: 'all' as const, label: 'Todo', count: events.value.length },
  { key: 'activity' as const, label: 'Actividades', count: events.value.filter((event) => event.kind === 'activity').length },
  { key: 'note' as const, label: 'Notas', count: events.value.filter((event) => event.kind === 'note' || event.kind === 'system').length },
  { key: 'opportunity' as const, label: 'Oportunidades', count: events.value.filter((event) => event.kind === 'opportunity').length },
])

const filtered = computed(() =>
  filter.value === 'all'
    ? events.value
    : filter.value === 'note'
      ? events.value.filter((event) => event.kind === 'note' || event.kind === 'system')
      : events.value.filter((event) => event.kind === filter.value),
)

function authorOf(item: Record<string, unknown>): string {
  const createdBy = item.createdBy as { name?: string } | string | null | undefined
  if (createdBy && typeof createdBy === 'object') return String(createdBy.name ?? 'Sistema')
  if (typeof createdBy === 'string') return createdBy
  return 'Sistema'
}

function streamEvent(item: Record<string, unknown>): TimelineEvent {
  const type = String(item.type ?? '')
  const isPost = type === 'Post'
  const labels: Record<string, string> = {
    Create: 'Registro creado',
    Update: 'Registro actualizado',
    Status: 'Estado cambiado',
    Assign: 'Asignación cambiada',
    EmailReceived: 'Email recibido',
    EmailSent: 'Email enviado',
  }
  return {
    id: `stream-${item.id}`,
    kind: isPost ? 'note' : 'system',
    date: String(item.createdAt ?? ''),
    dateOnly: false,
    title: isPost ? authorOf(item) : labels[type] ?? 'Actualización',
    detail: isPost ? String(item.post ?? '') : undefined,
    meta: isPost ? 'Nota interna' : 'Historial',
    icon: isPost ? MessageSquare : UserPlus,
    tone: isPost ? 'text-blue-500' : 'text-faint',
  }
}

function activityEvent(item: EntityRecord): TimelineEvent {
  const scope = String(item._scope)
  const rawDate = String(scope === 'Task' ? item.dateEnd ?? item.createdAt ?? '' : item.dateStart ?? item.createdAt ?? '')
  const status = statusMeta(scope, item.status).label
  return {
    id: `activity-${scope}-${item.id}`,
    kind: 'activity',
    date: rawDate,
    dateOnly: false,
    title: String(item.name ?? ''),
    detail: [status, item.assignedUserName ? `Responsable: ${item.assignedUserName}` : ''].filter(Boolean).join(' · '),
    meta: scope === 'Task' ? 'Tarea' : scope === 'Call' ? 'Llamada' : 'Reunión',
    icon: scope === 'Call' ? Phone : scope === 'Meeting' ? CalendarDays : CheckSquare,
    tone: scope === 'Call' ? 'text-blue-500' : scope === 'Meeting' ? 'text-violet-500' : 'text-amber-500',
  }
}

function opportunityEvent(item: EntityRecord): TimelineEvent {
  return {
    id: `opportunity-${item.id}`,
    kind: 'opportunity',
    date: String(item.closeDate ?? item.createdAt ?? ''),
    dateOnly: Boolean(item.closeDate),
    title: String(item.name ?? ''),
    detail: `${stageMeta(item.stage).label}${item.amount ? ` · ${currency(item.amount)}` : ''}`,
    meta: 'Oportunidad',
    to: `/opportunities/${item.id}`,
    icon: TrendingUp,
    tone: 'text-emerald-500',
  }
}

function dateLabel(event: TimelineEvent): string {
  return event.dateOnly ? formatDate(event.date) : formatDateTime(event.date)
}

function openEvent(event: TimelineEvent): void {
  if (event.to) router.push(event.to)
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const tasks: Promise<{ list: EntityRecord[] }>[] = []
    const stream = request<{ list: Record<string, unknown>[] }>(`/${props.entityType}/${props.entityId}/stream`, {
      params: { maxSize: 30 },
    })

    if (props.entityType === 'Contact' || props.entityType === 'Account') {
      const where =
        props.entityType === 'Contact'
          ? [
              { type: 'equals', field: 'parentType', value: 'Contact' },
              { type: 'equals', field: 'parentId', value: props.entityId },
            ]
          : [{ type: 'equals', field: 'accountId', value: props.entityId }]
      tasks.push(
        request<{ list: EntityRecord[] }>('/Task', { params: { maxSize: 50, orderBy: 'dateEnd', order: 'desc', select: 'name,status,dateEnd,assignedUserName,createdAt', where } }),
        request<{ list: EntityRecord[] }>('/Call', { params: { maxSize: 50, orderBy: 'dateStart', order: 'desc', select: 'name,status,dateStart,assignedUserName,createdAt', where } }),
        request<{ list: EntityRecord[] }>('/Meeting', { params: { maxSize: 50, orderBy: 'dateStart', order: 'desc', select: 'name,status,dateStart,assignedUserName,createdAt', where } }),
      )
    } else if (props.entityType === 'Opportunity') {
      if (props.contactId || props.accountId) {
        const where = props.contactId
          ? [
              { type: 'equals', field: 'parentType', value: 'Contact' },
              { type: 'equals', field: 'parentId', value: props.contactId },
            ]
          : [{ type: 'equals', field: 'accountId', value: props.accountId }]
        tasks.push(
          request<{ list: EntityRecord[] }>('/Task', { params: { maxSize: 50, orderBy: 'dateEnd', order: 'desc', select: 'name,status,dateEnd,assignedUserName,createdAt', where } }),
          request<{ list: EntityRecord[] }>('/Call', { params: { maxSize: 50, orderBy: 'dateStart', order: 'desc', select: 'name,status,dateStart,assignedUserName,createdAt', where } }),
          request<{ list: EntityRecord[] }>('/Meeting', { params: { maxSize: 50, orderBy: 'dateStart', order: 'desc', select: 'name,status,dateStart,assignedUserName,createdAt', where } }),
        )
      }
    }

    const [streamResult, ...activityResults] = await Promise.all([stream, ...tasks])
    const collected: TimelineEvent[] = (streamResult.list ?? []).map(streamEvent)

    const scopes = ['Task', 'Call', 'Meeting']
    activityResults.forEach((result, index) => {
      const scope = scopes[index]
      for (const item of result.list ?? []) {
        collected.push(activityEvent({ ...item, _scope: scope }))
      }
    })

    if ((props.entityType === 'Contact' || props.entityType === 'Account') && valueForOpportunities()) {
      const where = [
        {
          type: 'equals',
          field: props.entityType === 'Contact' ? 'contactId' : 'accountId',
          value: props.entityId,
        },
      ]
      const opps = await request<{ list: EntityRecord[] }>('/Opportunity', {
        params: { maxSize: 30, orderBy: 'closeDate', order: 'desc', select: 'name,stage,amount,closeDate,createdAt', where },
      })
      for (const item of opps.list ?? []) collected.push(opportunityEvent(item))
    }

    events.value = collected
      .filter((event) => Boolean(parseDate(event.date)))
      .sort((a, b) => (parseDate(b.date)?.getTime() ?? 0) - (parseDate(a.date)?.getTime() ?? 0))
      .slice(0, 80)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar la timeline.'
  } finally {
    loading.value = false
  }
}

function valueForOpportunities(): boolean {
  return Boolean(auth.canRead('Opportunity'))
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="item in filters"
          :key="item.key"
          type="button"
          class="rounded-full px-2.5 py-1 text-[11px] font-medium transition"
          :class="filter === item.key ? 'bg-brand text-white' : 'bg-surface-2 text-muted hover:text-ink'"
          @click="filter = item.key"
        >
          {{ item.label }} <span v-if="item.count" class="opacity-70">{{ item.count }}</span>
        </button>
      </div>
      <AppButton variant="ghost" size="sm" :loading="loading" @click="load">
        <RefreshCw class="h-3.5 w-3.5" />
        Actualizar
      </AppButton>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <AppSpinner label="Cargando timeline…" />
    </div>
    <div v-else-if="error" class="rounded-xl border border-danger/20 bg-danger/[0.05] px-4 py-3 text-[12px] text-danger">
      {{ error }}
    </div>
    <div v-else-if="filtered.length" class="relative">
      <div class="absolute bottom-2 left-4 top-2 w-px bg-line" />
      <div v-for="(event, index) in filtered" :key="event.id" class="relative flex gap-3 pb-4 last:pb-0">
        <span class="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface">
          <component :is="event.icon" :class="['h-4 w-4', event.tone]" />
        </span>
        <article
          :class="[
            'min-w-0 flex-1 rounded-xl border border-line bg-surface p-3',
            event.to && 'cursor-pointer transition hover:border-brand/30 hover:bg-surface-2/50',
          ]"
          @click="openEvent(event)"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <p class="min-w-0 flex-1 truncate text-[12px] font-medium">{{ event.title }}</p>
            <span class="shrink-0 text-[10px] text-faint" :title="dateLabel(event)">
              {{ relativeTime(event.date) }}
            </span>
          </div>
          <p v-if="event.detail" class="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-muted">
            {{ event.detail }}
          </p>
          <div class="mt-1.5 flex items-center gap-2 text-[10px] text-faint">
            <span>{{ event.meta }}</span>
            <span>·</span>
            <span>{{ dateLabel(event) }}</span>
            <span v-if="event.to" class="ml-auto text-brand">Abrir oportunidad →</span>
          </div>
        </article>
      </div>
    </div>
    <AppEmpty v-else compact title="Timeline vacía" description="Las notas, actividades y oportunidades aparecerán aquí." />
  </div>
</template>
