<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import draggable from 'vuedraggable'
import { Bookmark, CalendarDays, CheckSquare, Clock3, GripVertical, KanbanSquare, Phone, Plus, Search, Trash2, TriangleAlert, UserRound } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppField from '@/components/ui/AppField.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import RecordForm from '@/components/crm/RecordForm.vue'
import { useAuthStore } from '@/stores/auth'
import { useReferenceStore } from '@/stores/reference'
import { useMetadataStore } from '@/stores/metadata'
import { useNextActions } from '@/composables/useNextActions'
import { useSavedViews } from '@/composables/useSavedViews'
import { useUiStore } from '@/stores/ui'
import { getList, updateRecord } from '@/lib/api'
import { currency, formatDateShort, isOverdue } from '@/lib/format'
import { DEFAULT_STAGES, OPPORTUNITY_CONFIG, stageMeta } from '@/lib/constants'
import type { EntityRecord } from '@/types/espocrm'

interface DragChange {
  added?: { element: EntityRecord; newIndex: number }
  removed?: { element: EntityRecord; oldIndex: number }
}

const router = useRouter()
const auth = useAuthStore()
const reference = useReferenceStore()
const metadata = useMetadataStore()
const ui = useUiStore()

const loading = ref(true)
const error = ref('')
const search = ref('')
const ownerId = ref('')
const items = ref<EntityRecord[]>([])
const columns = reactive<Record<string, EntityRecord[]>>({})
const savingIds = ref<Set<string>>(new Set())
const createOpen = ref(false)
const createStage = ref('Prospecting')
const actionFilter = ref<'all' | 'overdue' | 'upcoming' | 'none'>('all')

const { actions, actionFor, loading: actionsLoading, overdueCount } = useNextActions(items)
const savedViews = useSavedViews('pipeline')
const selectedViewId = ref('')
const viewModalOpen = ref(false)
const viewName = ref('')

const canEdit = computed(() => auth.can('Opportunity', 'edit'))
const canCreate = computed(() => auth.can('Opportunity', 'create'))

const formFields = computed(() => {
  const custom = metadata.customFields('Opportunity').filter(
    (name) => !OPPORTUNITY_CONFIG.formFields.includes(name),
  )
  return [...OPPORTUNITY_CONFIG.formFields, ...custom]
})

const stages = computed(() =>
  DEFAULT_STAGES.map((stage) => ({
    key: stage,
    ...stageMeta(stage),
    total: (columns[stage] ?? []).reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    count: (columns[stage] ?? []).length,
  })),
)

const visibleItems = computed(() => {
  const term = search.value.trim().toLowerCase()
  return items.value.filter((item) => {
    if (term) {
      const haystack = `${item.name ?? ''} ${item.accountName ?? ''} ${item.contactName ?? ''}`.toLowerCase()
      if (!haystack.includes(term)) return false
    }
    const action = actionFor(item.id)
    if (actionFilter.value === 'overdue') return Boolean(action?.overdue)
    if (actionFilter.value === 'upcoming') return Boolean(action && !action.overdue)
    if (actionFilter.value === 'none') return !action
    return true
  })
})

const pipelineSubtitle = computed(() =>
  `${items.value.length} oportunidades · ${currency(grandTotal.value)} en pipeline${overdueCount.value ? ` · ${overdueCount.value} con acción atrasada` : ''}`,
)

const grandTotal = computed(() =>
  stages.value
    .filter((stage) => !['Closed Won', 'Closed Lost'].includes(stage.key))
    .reduce((sum, stage) => sum + stage.total, 0),
)

function distribute(): void {
  for (const stage of DEFAULT_STAGES) columns[stage] = []
  for (const item of visibleItems.value) {
    const stage = String(item.stage ?? 'Prospecting')
    if (!columns[stage]) columns[stage] = []
    columns[stage].push(item)
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const data = await getList('Opportunity', {
      maxSize: 200,
      orderBy: 'closeDate',
      order: 'asc',
      select:
        'name,accountId,accountName,contactId,contactName,stage,amount,probability,closeDate,assignedUserId,assignedUserName',
      where: ownerId.value
        ? [{ type: 'equals', field: 'assignedUserId', value: ownerId.value }]
        : undefined,
    })
    items.value = data.list
    distribute()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar el pipeline.'
  } finally {
    loading.value = false
  }
}

async function onColumnChange(stage: string, event: unknown): Promise<void> {
  await onChange(stage, event as DragChange)
}

async function onChange(stage: string, change: DragChange): Promise<void> {
  if (!change.added || !canEdit.value) {
    if (change.added && !canEdit.value) {
      distribute()
      ui.toast('error', 'Sin permiso para editar oportunidades')
    }
    return
  }
  const item = change.added.element
  const previousStage = String(item.stage ?? '')
  if (previousStage === stage) return
  item.stage = stage
  savingIds.value.add(item.id)
  try {
    await updateRecord('Opportunity', item.id, { stage })
    ui.toast('success', 'Etapa actualizada', `${item.name} → ${stageMeta(stage).label}`)
  } catch (err) {
    item.stage = previousStage
    distribute()
    ui.toast('error', 'No se pudo mover la oportunidad', err instanceof Error ? err.message : undefined)
  } finally {
    savingIds.value.delete(item.id)
  }
}

function openCreate(stage: string): void {
  createStage.value = stage
  createOpen.value = true
}

function onSaved(): void {
  void load()
}

watch([search, actionFilter], distribute)
watch(actions, distribute, { deep: true })
watch(ownerId, () => void load())

function applySavedView(value: string | number | null | undefined): void {
  const id = value ? String(value) : ''
  selectedViewId.value = id
  const view = savedViews.views.value.find((item) => item.id === id)
  if (!view) return
  search.value = view.state.search ?? ''
  ownerId.value = view.state.ownerId ?? ''
  actionFilter.value = (view.state.actionFilter as typeof actionFilter.value) ?? 'all'
}

function openSaveView(): void {
  const current = savedViews.views.value.find((item) => item.id === selectedViewId.value)
  viewName.value = current?.name ?? 'Mi pipeline'
  viewModalOpen.value = true
}

function saveCurrentView(): void {
  if (!viewName.value.trim()) {
    ui.toast('error', 'Ponle un nombre a la vista')
    return
  }
  const view = savedViews.save(viewName.value, {
    search: search.value,
    ownerId: ownerId.value,
    actionFilter: actionFilter.value,
  })
  selectedViewId.value = view.id
  viewModalOpen.value = false
  ui.toast('success', 'Vista guardada', view.name)
}

async function deleteCurrentView(): Promise<void> {
  const view = savedViews.views.value.find((item) => item.id === selectedViewId.value)
  if (!view) return
  const confirmed = await ui.askConfirm({
    title: 'Eliminar vista guardada',
    message: `Se eliminará «${view.name}» de tus vistas.`,
    confirmLabel: 'Eliminar vista',
  })
  if (!confirmed) return
  savedViews.remove(view.id)
  selectedViewId.value = ''
  ui.toast('info', 'Vista eliminada')
}

onMounted(() => {
  void metadata.load()
  if (auth.canRead('User')) void reference.loadUsers()
  void load()
})
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      title="Pipeline comercial"
      :subtitle="pipelineSubtitle"
      eyebrow="CRM"
    >
      <template #actions>
        <AppButton variant="secondary" size="sm" @click="router.push('/opportunities')">
          <KanbanSquare class="h-4 w-4" />
          Vista lista
        </AppButton>
        <AppButton v-if="canCreate" variant="primary" size="sm" @click="openCreate('Prospecting')">
          <Plus class="h-4 w-4" />
          Nueva oportunidad
        </AppButton>
      </template>
    </PageHeader>

    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div class="relative w-full sm:max-w-xs">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <AppInput v-model="search" class="!h-9 pl-9 text-[13px]" placeholder="Buscar oportunidad, contacto o empresa…" />
      </div>
      <div v-if="reference.users.length" class="w-[190px]">
        <AppSelect v-model="ownerId" class="!h-9 text-[12px]" placeholder="Todos los responsables">
          <option v-for="user in reference.users" :key="user.id" :value="user.id">
            {{ user.name || user.userName }}
          </option>
        </AppSelect>
      </div>
      <div class="w-[190px]">
        <AppSelect v-model="actionFilter" class="!h-9 text-[12px]">
          <option value="all">Todas las acciones</option>
          <option value="overdue">Con acción atrasada</option>
          <option value="upcoming">Con próxima acción</option>
          <option value="none">Sin próxima acción</option>
        </AppSelect>
      </div>
      <div class="flex items-center gap-2 sm:ml-auto">
        <AppSelect
          v-model="selectedViewId"
          class="!h-9 w-[170px] text-[12px]"
          aria-label="Vistas guardadas"
          @update:model-value="applySavedView"
        >
          <option value="">Vista actual</option>
          <option v-for="view in savedViews.views.value" :key="view.id" :value="view.id">{{ view.name }}</option>
        </AppSelect>
        <AppButton variant="secondary" size="sm" @click="openSaveView">
          <Bookmark class="h-3.5 w-3.5" />
          Guardar
        </AppButton>
        <AppButton v-if="selectedViewId" variant="ghost" size="sm" class="!text-danger" aria-label="Eliminar vista" @click="deleteCurrentView">
          <Trash2 class="h-3.5 w-3.5" />
        </AppButton>
      </div>
    </div>

    <div v-if="error" class="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/[0.05] px-4 py-3 text-[13px] text-danger">
      <TriangleAlert class="h-4 w-4" />
      {{ error }}
      <button class="ml-auto font-medium underline" @click="load">Reintentar</button>
    </div>

    <div v-if="loading" class="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <div v-for="index in 6" :key="index" class="card h-72 p-3">
        <div class="skeleton mb-3 h-5 w-24" />
        <div class="space-y-2">
          <div class="skeleton h-20" />
          <div class="skeleton h-20" />
        </div>
      </div>
    </div>

    <div v-else class="scroll-thin -mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div class="flex min-w-max gap-3">
        <section
          v-for="stage in stages"
          :key="stage.key"
          class="flex w-[286px] shrink-0 flex-col rounded-2xl border border-line bg-surface-2/50"
        >
          <header class="border-b border-line px-3.5 py-3">
            <div class="flex items-center justify-between gap-2">
              <div class="flex min-w-0 items-center gap-2">
                <span class="h-2 w-2 shrink-0 rounded-full" :style="{ background: stage.color }" />
                <h2 class="truncate text-[12px] font-semibold">{{ stage.label }}</h2>
                <span class="rounded-full bg-surface px-1.5 py-0.5 text-[10px] tabular-nums text-faint">
                  {{ stage.count }}
                </span>
              </div>
              <button
                v-if="canCreate"
                type="button"
                class="rounded p-0.5 text-faint transition hover:bg-surface hover:text-ink"
                :aria-label="`Añadir a ${stage.label}`"
                @click="openCreate(stage.key)"
              >
                <Plus class="h-3.5 w-3.5" />
              </button>
            </div>
            <p class="mt-1 text-[11px] font-medium tabular-nums text-muted">{{ currency(stage.total) }}</p>
          </header>

          <draggable
            v-model="columns[stage.key]"
            :group="{ name: 'pipeline' }"
            item-key="id"
            :disabled="!canEdit"
            :animation="160"
            ghost-class="opacity-40"
            class="flex min-h-[140px] flex-1 flex-col gap-2 p-2"
            @change="onColumnChange(stage.key, $event)"
          >
            <template #item="{ element }">
              <article
                class="group cursor-pointer rounded-xl border border-line bg-surface p-3 shadow-sm transition hover:border-brand/30 hover:shadow-md"
                @click="router.push(`/opportunities/${element.id}`)"
              >
                <div class="mb-1.5 flex items-start justify-between gap-2">
                  <p class="line-clamp-2 text-[12px] font-semibold leading-snug">{{ element.name }}</p>
                  <GripVertical class="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint opacity-0 transition group-hover:opacity-100" />
                </div>
                <div class="mb-1.5 flex items-center gap-1.5">
                  <AppAvatar v-if="element.contactName" :name="String(element.contactName)" size="xs" />
                  <span v-else class="flex h-5 w-5 items-center justify-center rounded-full bg-surface-2 text-faint">
                    <UserRound class="h-3 w-3" />
                  </span>
                  <span :class="element.contactName ? 'text-muted' : 'text-faint'" class="truncate text-[10px]">
                    {{ element.contactName || 'Sin contacto' }}
                  </span>
                </div>
                <p class="mb-2 truncate text-[10px] text-faint">{{ element.accountName || 'Sin empresa' }}</p>
                <div v-if="actionsLoading" class="mb-2 skeleton h-6" />
                <div
                  v-else-if="actionFor(element.id)"
                  :class="[
                    'mb-2 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px]',
                    actionFor(element.id)?.overdue
                      ? 'bg-red-500/10 text-red-600 dark:text-red-300'
                      : 'bg-surface-2 text-muted',
                  ]"
                >
                  <component
                    :is="actionFor(element.id)?.type === 'Call' ? Phone : actionFor(element.id)?.type === 'Meeting' ? CalendarDays : CheckSquare"
                    class="h-3 w-3 shrink-0"
                  />
                  <span class="min-w-0 flex-1 truncate">
                    {{ actionFor(element.id)?.overdue ? 'Atrasada' : 'Próxima' }}:
                    {{ actionFor(element.id)?.name }}
                  </span>
                  <span class="shrink-0 tabular-nums">{{ formatDateShort(actionFor(element.id)?.date) }}</span>
                </div>
                <div v-else class="mb-2 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px] text-faint">
                  <Clock3 class="h-3 w-3" />
                  Sin próxima acción
                </div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[13px] font-semibold tabular-nums">{{ currency(element.amount) }}</span>
                  <span class="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted">
                    {{ element.probability ?? 0 }}%
                  </span>
                </div>
                <div class="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2">
                  <div class="flex items-center gap-1.5">
                    <AppAvatar :name="String(element.assignedUserName ?? '')" size="xs" />
                    <span class="max-w-[90px] truncate text-[10px] text-muted">
                      {{ element.assignedUserName || 'Sin asignar' }}
                    </span>
                  </div>
                  <span
                    :class="[
                      'flex items-center gap-1 text-[10px]',
                      element.closeDate && isOverdue(element.closeDate) ? 'text-danger' : 'text-faint',
                    ]"
                  >
                    <CalendarDays class="h-3 w-3" />
                    {{ element.closeDate ? formatDateShort(element.closeDate) : 'Sin fecha' }}
                  </span>
                </div>
                <div v-if="savingIds.has(element.id)" class="mt-2 flex items-center gap-1 text-[10px] text-brand">
                  <span class="h-2.5 w-2.5 animate-spin rounded-full border border-brand border-t-transparent" />
                  Guardando etapa…
                </div>
              </article>
            </template>
          </draggable>

          <AppEmpty
            v-if="!columns[stage.key]?.length"
            compact
            title="Sin oportunidades"
            description="Arrastra una tarjeta aquí."
          />
        </section>
      </div>
    </div>

    <p class="flex flex-wrap items-center gap-1.5 text-[11px] text-faint">
      <AppBadge tone="brand" size="sm">Kanban</AppBadge>
      Arrastra las tarjetas para cambiar de etapa. El cambio se guarda en el CRM y respeta permisos.
      <span class="2xl:hidden">· Desliza para ver las 6 etapas →</span>
    </p>

    <RecordForm
      v-model:open="createOpen"
      entity="Opportunity"
      :fields="formFields"
      :initial="{ stage: createStage }"
      title="Nueva oportunidad"
      @saved="onSaved"
    />

    <AppModal v-model:open="viewModalOpen" title="Guardar vista" description="Se guardará para tu usuario en este navegador." size="sm">
      <AppField label="Nombre de la vista" required>
        <AppInput v-model="viewName" placeholder="Ej. Mis negociaciones" @keyup.enter="saveCurrentView" />
      </AppField>
      <template #footer>
        <AppButton variant="secondary" @click="viewModalOpen = false">Cancelar</AppButton>
        <AppButton variant="primary" @click="saveCurrentView">
          <Bookmark class="h-4 w-4" />
          Guardar vista
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
