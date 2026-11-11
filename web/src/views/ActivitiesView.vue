<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CalendarDays, Check, CheckSquare, Clock3, Phone, Plus, Search, TriangleAlert } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import RecordForm from '@/components/crm/RecordForm.vue'
import { getList, updateRecord } from '@/lib/api'
import { dateKey, formatDateTime, isOverdue } from '@/lib/format'
import { CALL_FIELDS, MEETING_FIELDS, TASK_FIELDS, priorityMeta, statusMeta } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth'
import { useReferenceStore } from '@/stores/reference'
import { useUiStore } from '@/stores/ui'
import type { EntityRecord } from '@/types/espocrm'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const reference = useReferenceStore()
const ui = useUiStore()

const type = ref<'Task' | 'Call' | 'Meeting'>('Task')
const items = ref<EntityRecord[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const ownerId = ref('')
const formOpen = ref(false)

const tabs = [
  { key: 'Task', label: 'Tareas' },
  { key: 'Call', label: 'Llamadas' },
  { key: 'Meeting', label: 'Reuniones' },
]

const formFields = computed(() =>
  type.value === 'Task' ? TASK_FIELDS : type.value === 'Call' ? CALL_FIELDS : MEETING_FIELDS,
)

const typeLabel = computed(() =>
  type.value === 'Task' ? 'tarea' : type.value === 'Call' ? 'llamada' : 'reunión',
)

const initial = computed(() => ({ assignedUser: auth.user?.id }))

const canCreate = computed(() => auth.can(type.value, 'create'))

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return items.value
  return items.value.filter(
    (item) =>
      String(item.name ?? '').toLowerCase().includes(term) ||
      String(item.accountName ?? '').toLowerCase().includes(term),
  )
})

const stats = computed(() => {
  const pending = items.value.filter((item) =>
    type.value === 'Task' ? !['Completed', 'Canceled'].includes(String(item.status)) : item.status === 'Planned',
  )
  const todayKey = dateKey(new Date())
  return {
    pending: pending.length,
    today: pending.filter((item) => String(item.dateEnd ?? item.dateStart ?? '').startsWith(todayKey)).length,
    overdue: pending.filter((item) => isOverdue(item.dateEnd ?? item.dateStart)).length,
  }
})

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const data = await getList(type.value, {
      maxSize: 100,
      orderBy: type.value === 'Task' ? 'dateEnd' : 'dateStart',
      order: 'desc',
      where: ownerId.value
        ? [{ type: 'equals', field: 'assignedUserId', value: ownerId.value }]
        : undefined,
      select:
        type.value === 'Task'
          ? 'name,status,priority,dateEnd,assignedUserName,accountName,contactName,parentName,createdAt'
          : 'name,status,dateStart,dateEnd,assignedUserName,accountName,contactName,parentName,createdAt',
    })
    items.value = data.list
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudieron cargar las actividades.'
  } finally {
    loading.value = false
  }
}

async function complete(item: EntityRecord): Promise<void> {
  const status = type.value === 'Task' ? 'Completed' : 'Held'
  try {
    await updateRecord(type.value, item.id, { status })
    item.status = status
    ui.toast('success', 'Actividad completada')
  } catch (err) {
    ui.toast('error', 'No se pudo completar', err instanceof Error ? err.message : undefined)
  }
}

function setType(next: string): void {
  type.value = next as typeof type.value
  router.replace({ query: { ...route.query, tab: next.toLowerCase() } })
}

function icon() {
  if (type.value === 'Call') return Phone
  if (type.value === 'Meeting') return CalendarDays
  return CheckSquare
}

watch(type, () => void load())
watch(ownerId, () => void load())

onMounted(() => {
  const fromQuery = String(route.query.tab ?? '').toLowerCase()
  if (fromQuery === 'calls') type.value = 'Call'
  else if (fromQuery === 'meetings') type.value = 'Meeting'
  if (auth.canRead('User')) void reference.loadUsers()
  void load()
})
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      title="Actividades"
      :subtitle="`${stats.pending} pendientes · ${stats.today} para hoy · ${stats.overdue} vencidas`"
      eyebrow="CRM"
    >
      <template #actions>
        <AppButton v-if="canCreate" variant="primary" size="sm" @click="formOpen = true">
          <Plus class="h-4 w-4" />
          Nueva {{ typeLabel }}
        </AppButton>
      </template>
    </PageHeader>

    <AppTabs :tabs="tabs" :model-value="type" @update:model-value="setType" />

    <div class="grid grid-cols-3 gap-3">
      <div class="card p-4">
        <div class="flex items-center gap-2 text-[11px] text-muted"><Clock3 class="h-3.5 w-3.5" /> Pendientes</div>
        <p class="mt-1 text-xl font-semibold tabular-nums">{{ stats.pending }}</p>
      </div>
      <div class="card p-4">
        <div class="flex items-center gap-2 text-[11px] text-muted"><CalendarDays class="h-3.5 w-3.5" /> Hoy</div>
        <p class="mt-1 text-xl font-semibold tabular-nums">{{ stats.today }}</p>
      </div>
      <div class="card p-4">
        <div class="flex items-center gap-2 text-[11px] text-muted"><TriangleAlert class="h-3.5 w-3.5" /> Vencidas</div>
        <p class="mt-1 text-xl font-semibold tabular-nums text-danger">{{ stats.overdue }}</p>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div class="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full sm:max-w-sm">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <AppInput v-model="search" class="!h-9 pl-9 text-[13px]" placeholder="Buscar actividad…" />
        </div>
        <div v-if="reference.users.length" class="w-[190px]">
          <AppSelect v-model="ownerId" class="!h-9 text-[12px]" placeholder="Todos los responsables">
            <option v-for="user in reference.users" :key="user.id" :value="user.id">
              {{ user.name || user.userName }}
            </option>
          </AppSelect>
        </div>
      </div>

      <div v-if="error" class="border-b border-line bg-danger/[0.04] px-4 py-3 text-[12px] text-danger">{{ error }}</div>

      <div v-if="loading" class="space-y-2 p-4">
        <div v-for="index in 5" :key="index" class="skeleton h-14" />
      </div>

      <div v-else-if="filtered.length" class="divide-y divide-line">
        <div
          v-for="item in filtered"
          :key="item.id"
          class="flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface-2/60"
        >
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
            <component :is="icon()" class="h-4 w-4" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[13px] font-medium">{{ item.name }}</p>
            <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-faint">
              <span>{{ item.dateStart || item.dateEnd ? formatDateTime(item.dateStart || item.dateEnd) : 'Sin fecha' }}</span>
              <span v-if="item.accountName">· {{ item.accountName }}</span>
              <span v-if="item.contactName || item.parentName">· {{ item.contactName || item.parentName }}</span>
              <span>· {{ item.assignedUserName || 'Sin asignar' }}</span>
            </p>
          </div>
          <AppBadge v-if="type === 'Task' && item.priority" :tone="priorityMeta(item.priority).tone" size="sm">
            {{ priorityMeta(item.priority).label }}
          </AppBadge>
          <AppBadge :tone="statusMeta(type, item.status).tone" size="sm" dot>
            {{ statusMeta(type, item.status).label }}
          </AppBadge>
          <button
            v-if="!['Completed', 'Canceled', 'Held', 'Not Held'].includes(String(item.status))"
            type="button"
            class="rounded-lg p-1.5 text-faint transition hover:bg-surface-2 hover:text-brand"
            aria-label="Completar"
            @click="complete(item)"
          >
            <Check class="h-4 w-4" />
          </button>
        </div>
      </div>

      <AppEmpty
        v-else
        title="Sin actividades"
        description="No hay actividades que coincidan con los filtros."
      >
        <template v-if="canCreate" #action>
          <AppButton variant="primary" size="sm" @click="formOpen = true">
            <Plus class="h-4 w-4" /> Nueva {{ typeLabel }}
          </AppButton>
        </template>
      </AppEmpty>
    </div>

    <RecordForm
      v-model:open="formOpen"
      :entity="type"
      :fields="formFields"
      :initial="initial"
      :title="`Nueva ${typeLabel}`"
      @saved="load"
    />
  </div>
</template>
