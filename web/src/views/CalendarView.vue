<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Phone,
  Plus,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import RecordForm from '@/components/crm/RecordForm.vue'
import { getList } from '@/lib/api'
import { dateKey, formatTime, monthLabel } from '@/lib/format'
import { CALL_FIELDS, MEETING_FIELDS, TASK_FIELDS, statusMeta } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import type { EntityRecord } from '@/types/espocrm'

const auth = useAuthStore()
const ui = useUiStore()

const cursor = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const events = ref<EntityRecord[]>([])
const loading = ref(true)
const dayOpen = ref(false)
const selectedDate = ref('')
const formOpen = ref(false)
const formType = ref<'Task' | 'Call' | 'Meeting'>('Meeting')
const formInitial = ref<Record<string, unknown>>({})

const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const todayKey = computed(() => dateKey(new Date()))

const monthDays = computed(() => {
  const year = cursor.value.getFullYear()
  const month = cursor.value.getMonth()
  const first = new Date(year, month, 1)
  const leading = (first.getDay() + 6) % 7
  const total = new Date(year, month + 1, 0).getDate()
  const cells: { key: string; day: number; current: boolean }[] = []
  for (let index = 0; index < leading; index += 1) {
    cells.push({ key: `prev-${index}`, day: 0, current: false })
  }
  for (let day = 1; day <= total; day += 1) {
    const date = new Date(year, month, day)
    cells.push({ key: dateKey(date), day, current: true })
  }
  while (cells.length % 7 !== 0) cells.push({ key: `next-${cells.length}`, day: 0, current: false })
  return cells
})

const selectedEvents = computed(() => events.value.filter((event) => dateKey(event.dateStart || event.dateEnd) === selectedDate.value))

const formFields = computed(() =>
  formType.value === 'Task' ? TASK_FIELDS : formType.value === 'Call' ? CALL_FIELDS : MEETING_FIELDS,
)

const canCreate = computed(() => auth.can('Meeting', 'create') || auth.can('Call', 'create') || auth.can('Task', 'create'))

function eventsFor(key: string): EntityRecord[] {
  return events.value.filter((event) => dateKey(event.dateStart || event.dateEnd) === key)
}

function eventColor(scope: unknown): string {
  if (scope === 'Call') return 'bg-blue-500'
  if (scope === 'Meeting') return 'bg-violet-500'
  return 'bg-amber-500'
}

function eventIcon(scope: unknown) {
  if (scope === 'Call') return Phone
  if (scope === 'Meeting') return CalendarDays
  return CheckSquare
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const year = cursor.value.getFullYear()
    const month = cursor.value.getMonth()
    const start = `${year}-${`${month + 1}`.padStart(2, '0')}-01 00:00:00`
    const last = new Date(year, month + 1, 0).getDate()
    const end = `${year}-${`${month + 1}`.padStart(2, '0')}-${`${last}`.padStart(2, '0')} 23:59:59`
    const [tasks, calls, meetings] = await Promise.all([
      getList('Task', {
        maxSize: 200,
        where: [
          { type: 'after', field: 'dateEnd', value: start },
          { type: 'before', field: 'dateEnd', value: end },
        ],
        select: 'name,status,dateEnd,assignedUserName,contactName,parentName',
      }),
      getList('Call', {
        maxSize: 200,
        where: [
          { type: 'after', field: 'dateStart', value: start },
          { type: 'before', field: 'dateStart', value: end },
        ],
        select: 'name,status,dateStart,dateEnd,assignedUserName,contactName,parentName',
      }),
      getList('Meeting', {
        maxSize: 200,
        where: [
          { type: 'after', field: 'dateStart', value: start },
          { type: 'before', field: 'dateStart', value: end },
        ],
        select: 'name,status,dateStart,dateEnd,assignedUserName,contactName,parentName',
      }),
    ])
    events.value = [
      ...tasks.list.map((item) => ({ ...item, _scope: 'Task' })),
      ...calls.list.map((item) => ({ ...item, _scope: 'Call' })),
      ...meetings.list.map((item) => ({ ...item, _scope: 'Meeting' })),
    ]
  } catch (err) {
    ui.toast('error', 'No se pudo cargar el calendario', err instanceof Error ? err.message : undefined)
  } finally {
    loading.value = false
  }
}

function moveMonth(delta: number): void {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + delta, 1)
}

function goToday(): void {
  cursor.value = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
}

function openDay(key: string): void {
  if (!key) return
  selectedDate.value = key
  dayOpen.value = true
}

function startForm(type: 'Task' | 'Call' | 'Meeting'): void {
  formType.value = type
  const date = selectedDate.value
  if (type === 'Task') {
    formInitial.value = { assignedUser: auth.user?.id, dateEnd: `${date}T17:00` }
  } else {
    formInitial.value = {
      assignedUser: auth.user?.id,
      dateStart: `${date}T09:00`,
      dateEnd: `${date}T10:00`,
      status: 'Planned',
    }
  }
  dayOpen.value = false
  formOpen.value = true
}

function onSaved(): void {
  void load()
}

watch(cursor, () => void load())

onMounted(load)
</script>

<template>
  <div class="space-y-5">
    <PageHeader title="Calendario" :subtitle="`${monthLabel(cursor)} · ${events.length} actividades`" eyebrow="CRM">
      <template #actions>
        <AppButton variant="secondary" size="sm" @click="goToday">Hoy</AppButton>
        <AppButton variant="secondary" size="sm" @click="openDay(todayKey)">
          <Plus class="h-4 w-4" />
          Nueva actividad
        </AppButton>
      </template>
    </PageHeader>

    <div class="card overflow-hidden">
      <div class="flex items-center justify-between border-b border-line px-4 py-3">
        <div class="flex items-center gap-1">
          <button class="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Mes anterior" @click="moveMonth(-1)">
            <ChevronLeft class="h-4 w-4" />
          </button>
          <button class="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Mes siguiente" @click="moveMonth(1)">
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
        <h2 class="text-[15px] font-semibold capitalize">{{ monthLabel(cursor) }}</h2>
        <div class="flex items-center gap-3 text-[10px] text-faint">
          <span class="flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full bg-amber-500" /> Tarea</span>
          <span class="flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full bg-blue-500" /> Llamada</span>
          <span class="flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full bg-violet-500" /> Reunión</span>
        </div>
      </div>

      <div class="grid grid-cols-7 border-b border-line bg-surface-2/50">
        <div v-for="day in weekDays" :key="day" class="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-faint">
          {{ day }}
        </div>
      </div>

      <div v-if="loading" class="grid grid-cols-7">
        <div v-for="index in 35" :key="index" class="min-h-[104px] border-b border-r border-line p-2">
          <div class="skeleton h-4 w-5" />
        </div>
      </div>

      <div v-else class="grid grid-cols-7">
        <button
          v-for="cell in monthDays"
          :key="cell.key"
          type="button"
          :disabled="!cell.current"
          :class="[
            'group relative min-h-[104px] border-b border-r border-line p-1.5 text-left align-top transition',
            !cell.current && 'bg-surface-2/40',
            cell.current && 'hover:bg-surface-2/60',
            cell.key === todayKey && 'bg-brand-soft/40',
          ]"
          @click="cell.current && openDay(cell.key)"
        >
          <span
            v-if="cell.current"
            :class="[
              'inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium',
              cell.key === todayKey ? 'bg-brand text-white' : 'text-muted',
            ]"
          >
            {{ cell.day }}
          </span>
          <div v-if="cell.current" class="mt-1 space-y-1">
            <div
              v-for="event in eventsFor(cell.key).slice(0, 3)"
              :key="`${event._scope}-${event.id}`"
              class="flex items-center gap-1 rounded-md bg-surface px-1.5 py-1 shadow-sm ring-1 ring-line"
            >
              <span :class="['h-1.5 w-1.5 shrink-0 rounded-full', eventColor(event._scope)]" />
              <span class="truncate text-[10px] font-medium">{{ event.name }}</span>
            </div>
            <p v-if="eventsFor(cell.key).length > 3" class="pl-1 text-[9px] text-faint">
              +{{ eventsFor(cell.key).length - 3 }} más
            </p>
          </div>
        </button>
      </div>
    </div>

    <AppModal v-model:open="dayOpen" :title="`Actividades del ${selectedDate}`" size="md">
      <div v-if="selectedEvents.length" class="space-y-2">
        <div
          v-for="event in selectedEvents"
          :key="`${event._scope}-${event.id}`"
          class="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2.5"
        >
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2">
            <component :is="eventIcon(event._scope)" class="h-4 w-4 text-muted" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[12px] font-medium">{{ event.name }}</p>
            <p class="text-[10px] text-faint">
              {{ event.dateStart ? formatTime(event.dateStart) : '' }}
              {{ event.assignedUserName ? `· ${event.assignedUserName}` : '' }}
              {{ event.contactName || event.parentName ? `· ${event.contactName || event.parentName}` : '' }}
            </p>
          </div>
          <AppBadge :tone="statusMeta(String(event._scope), event.status).tone" size="sm">
            {{ statusMeta(String(event._scope), event.status).label }}
          </AppBadge>
        </div>
      </div>
      <AppEmpty v-else compact title="Día libre" description="No hay actividades programadas para este día." />

      <template #footer>
        <div v-if="canCreate" class="flex w-full flex-wrap items-center justify-between gap-2">
          <span class="text-[11px] text-faint">Añadir al día</span>
          <div class="flex gap-1.5">
            <AppButton v-if="auth.can('Task', 'create')" size="sm" variant="secondary" @click="startForm('Task')">
              <CheckSquare class="h-3.5 w-3.5" /> Tarea
            </AppButton>
            <AppButton v-if="auth.can('Call', 'create')" size="sm" variant="secondary" @click="startForm('Call')">
              <Phone class="h-3.5 w-3.5" /> Llamada
            </AppButton>
            <AppButton v-if="auth.can('Meeting', 'create')" size="sm" variant="primary" @click="startForm('Meeting')">
              <CalendarDays class="h-3.5 w-3.5" /> Reunión
            </AppButton>
          </div>
        </div>
        <AppButton v-else variant="secondary" @click="dayOpen = false">Cerrar</AppButton>
      </template>
    </AppModal>

    <RecordForm
      v-model:open="formOpen"
      :entity="formType"
      :fields="formFields"
      :initial="formInitial"
      :title="formType === 'Task' ? 'Nueva tarea' : formType === 'Call' ? 'Nueva llamada' : 'Nueva reunión'"
      @saved="onSaved"
    />
  </div>
</template>
