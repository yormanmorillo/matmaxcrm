<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarDays, Check, CheckSquare, Phone, Plus } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import RecordForm from './RecordForm.vue'
import { getList, updateRecord } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { CALL_FIELDS, MEETING_FIELDS, TASK_FIELDS, statusMeta } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import type { EntityRecord } from '@/types/espocrm'

const props = defineProps<{
  entityType: 'Contact' | 'Account'
  entityId: string
}>()

const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

const loading = ref(true)
const activities = ref<EntityRecord[]>([])
const formOpen = ref(false)
const formType = ref<'Task' | 'Call' | 'Meeting'>('Task')

const initial = computed(() => ({
  [props.entityType === 'Contact' ? 'contact' : 'account']: props.entityId,
  assignedUser: auth.user?.id,
}))

const formFields = computed(() =>
  formType.value === 'Task' ? TASK_FIELDS : formType.value === 'Call' ? CALL_FIELDS : MEETING_FIELDS,
)

const canCreate = computed(() => auth.can('Task', 'create') || auth.can('Call', 'create') || auth.can('Meeting', 'create'))

function dateOf(activity: EntityRecord): string {
  return String(activity._scope === 'Task' ? activity.dateEnd : activity.dateStart ?? activity.dateEnd ?? '')
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const where =
      props.entityType === 'Contact'
        ? [
            { type: 'equals', field: 'parentType', value: 'Contact' },
            { type: 'equals', field: 'parentId', value: props.entityId },
          ]
        : [{ type: 'equals', field: 'accountId', value: props.entityId }]
    const [tasks, calls, meetings] = await Promise.all([
      getList('Task', {
        maxSize: 50,
        orderBy: 'dateEnd',
        order: 'desc',
        where,
        select: 'name,status,priority,dateEnd,assignedUserName,contactName,parentName,createdAt',
      }),
      getList('Call', {
        maxSize: 50,
        orderBy: 'dateStart',
        order: 'desc',
        where,
        select: 'name,status,dateStart,assignedUserName,contactName,parentName,createdAt',
      }),
      getList('Meeting', {
        maxSize: 50,
        orderBy: 'dateStart',
        order: 'desc',
        where,
        select: 'name,status,dateStart,assignedUserName,contactName,parentName,createdAt',
      }),
    ])
    activities.value = [
      ...tasks.list.map((item) => ({ ...item, _scope: 'Task' })),
      ...calls.list.map((item) => ({ ...item, _scope: 'Call' })),
      ...meetings.list.map((item) => ({ ...item, _scope: 'Meeting' })),
    ].sort((a, b) => dateOf(b).localeCompare(dateOf(a)))
  } catch (err) {
    ui.toast('error', 'No se pudieron cargar las actividades', err instanceof Error ? err.message : undefined)
  } finally {
    loading.value = false
  }
}

async function complete(activity: EntityRecord): Promise<void> {
  const status = activity._scope === 'Task' ? 'Completed' : 'Held'
  try {
    await updateRecord(String(activity._scope), activity.id, { status })
    activity.status = status
    ui.toast('success', 'Actividad completada')
  } catch (err) {
    ui.toast('error', 'No se pudo completar', err instanceof Error ? err.message : undefined)
  }
}

function openForm(type: 'Task' | 'Call' | 'Meeting'): void {
  formType.value = type
  formOpen.value = true
}

function onSaved(): void {
  void load()
}

function icon(scope: unknown) {
  if (scope === 'Call') return Phone
  if (scope === 'Meeting') return CalendarDays
  return CheckSquare
}

onMounted(load)
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-[12px] text-muted">Tareas, llamadas y reuniones vinculadas</p>
      <div v-if="canCreate" class="flex gap-1.5">
        <AppButton v-if="auth.can('Task', 'create')" size="sm" variant="secondary" @click="openForm('Task')">
          <Plus class="h-3.5 w-3.5" /> Tarea
        </AppButton>
        <AppButton v-if="auth.can('Call', 'create')" size="sm" variant="secondary" @click="openForm('Call')">
          <Phone class="h-3.5 w-3.5" /> Llamada
        </AppButton>
        <AppButton v-if="auth.can('Meeting', 'create')" size="sm" variant="secondary" @click="openForm('Meeting')">
          <CalendarDays class="h-3.5 w-3.5" /> Reunión
        </AppButton>
      </div>
    </div>

    <div v-if="loading" class="space-y-2">
      <div v-for="index in 3" :key="index" class="skeleton h-14" />
    </div>
    <div v-else-if="activities.length" class="divide-y divide-line rounded-xl border border-line">
      <div
        v-for="activity in activities"
        :key="`${activity._scope}-${activity.id}`"
        class="flex items-center gap-3 px-3.5 py-3"
      >
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
          <component :is="icon(activity._scope)" class="h-4 w-4" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-[12px] font-medium">{{ activity.name }}</p>
          <p class="mt-0.5 flex items-center gap-1.5 text-[10px] text-faint">
            <span>{{ activity.dateStart || activity.dateEnd ? formatDateTime(activity.dateStart || activity.dateEnd) : 'Sin fecha' }}</span>
            <span>·</span>
            <span>{{ activity.assignedUserName || 'Sin asignar' }}</span>
            <span v-if="activity.contactName || activity.parentName">· {{ activity.contactName || activity.parentName }}</span>
          </p>
        </div>
        <AppBadge :tone="statusMeta(String(activity._scope), activity.status).tone" size="sm">
          {{ statusMeta(String(activity._scope), activity.status).label }}
        </AppBadge>
        <button
          v-if="!['Completed', 'Canceled', 'Held', 'Not Held'].includes(String(activity.status))"
          type="button"
          class="rounded-lg p-1.5 text-faint transition hover:bg-surface-2 hover:text-brand"
          aria-label="Completar actividad"
          @click="complete(activity)"
        >
          <Check class="h-4 w-4" />
        </button>
      </div>
    </div>
    <AppEmpty v-else compact title="Sin actividades" description="Crea una tarea, llamada o reunión para dar seguimiento." />

    <RecordForm
      v-model:open="formOpen"
      :entity="formType"
      :fields="formFields"
      :initial="initial"
      :title="formType === 'Task' ? 'Nueva tarea' : formType === 'Call' ? 'Nueva llamada' : 'Nueva reunión'"
      @saved="onSaved"
    />
  </div>
</template>
