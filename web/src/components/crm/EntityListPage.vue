<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Bookmark,
  Check,
  Columns3,
  Download,
  Plus,
  Search,
  Trash2,
  SlidersHorizontal,
  TriangleAlert,
  UserRound,
  Users,
} from 'lucide-vue-next'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'reka-ui'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import PaginationBar from '@/components/ui/PaginationBar.vue'
import RecordForm from './RecordForm.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppField from '@/components/ui/AppField.vue'
import { useSavedViews } from '@/composables/useSavedViews'
import { useEntityList, type WhereClause } from '@/composables/useEntityList'
import { useAuthStore } from '@/stores/auth'
import { useReferenceStore } from '@/stores/reference'
import { useMetadataStore } from '@/stores/metadata'
import { useUiStore } from '@/stores/ui'
import { getList } from '@/lib/api'
import { currency, formatDate } from '@/lib/format'
import { stageMeta, statusMeta } from '@/lib/constants'
import type { EntityConfig } from '@/lib/constants'
import type { EntityRecord } from '@/types/espocrm'

const props = withDefaults(
  defineProps<{
    config: EntityConfig
    title: string
    subtitle?: string
  }>(),
  { subtitle: '' },
)

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const ui = useUiStore()
const reference = useReferenceStore()
const metadata = useMetadataStore()

const ownerId = ref('')
const extraWhere = computed<WhereClause[]>(() =>
  ownerId.value ? [{ type: 'equals', field: 'assignedUserId', value: ownerId.value }] : [],
)

const { rows, total, page, pageSize, search, loading, error, refresh } = useEntityList(
  props.config,
  extraWhere,
)

const createOpen = ref(false)
const visibleKeys = ref<string[]>(loadColumns())
const savedViews = useSavedViews(`list-${props.config.entity}`)
const selectedViewId = ref('')
const viewModalOpen = ref(false)
const viewName = ref('')

const visibleColumns = computed(() =>
  props.config.columns.filter((column) => visibleKeys.value.includes(column.key)),
)

const canCreate = computed(() => auth.can(props.config.entity, 'create'))
const hasUsers = computed(() => reference.users.length > 0)

const formFields = computed(() => {
  const custom = metadata.customFields(props.config.entity).filter(
    (name) => !props.config.formFields.includes(name),
  )
  return [...props.config.formFields, ...custom]
})

const extraCount = computed(() => (search.value.trim() ? ' filtrados' : ''))
const subtitleText = computed(
  () => props.subtitle || `${total.value} ${props.config.plural.toLowerCase()}${extraCount.value}`,
)

function storageKey(): string {
  return `matmax.columns.${props.config.entity}`
}

function loadColumns(): string[] {
  try {
    const stored = localStorage.getItem(storageKey())
    if (stored) {
      const parsed = JSON.parse(stored) as string[]
      const valid = parsed.filter((key) => props.config.columns.some((column) => column.key === key))
      if (valid.length) return valid
    }
  } catch {
    /* noop */
  }
  return props.config.columns.map((column) => column.key)
}

function toggleColumn(key: string): void {
  const next = visibleKeys.value.includes(key)
    ? visibleKeys.value.filter((item) => item !== key)
    : [...visibleKeys.value, key]
  if (!next.length) return
  visibleKeys.value = next
  localStorage.setItem(storageKey(), JSON.stringify(next))
}

function applySavedView(value: string | number | null | undefined): void {
  const id = value ? String(value) : ''
  selectedViewId.value = id
  const view = savedViews.views.value.find((item) => item.id === id)
  if (!view) return
  search.value = view.state.search ?? ''
  ownerId.value = view.state.ownerId ?? ''
  const keys = (view.state.columns ?? '').split(',').filter((key) => props.config.columns.some((column) => column.key === key))
  if (keys.length) visibleKeys.value = keys
}

function openSaveView(): void {
  const current = savedViews.views.value.find((item) => item.id === selectedViewId.value)
  viewName.value = current?.name ?? `${props.config.plural} · mi vista`
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
    columns: visibleKeys.value.join(','),
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
    message: `Se eliminará «${view.name}».`,
    confirmLabel: 'Eliminar vista',
  })
  if (!confirmed) return
  savedViews.remove(view.id)
  selectedViewId.value = ''
  ui.toast('info', 'Vista eliminada')
}

function secondaryText(row: EntityRecord): string {
  if (props.config.entity === 'Contact') return String(row.title || row.emailAddress || '')
  if (props.config.entity === 'Account') return String(row.industry || row.website || '')
  if (props.config.entity === 'Lead') return String(row.source || row.emailAddress || '')
  if (props.config.entity === 'Opportunity') return String(row.accountName || '')
  return ''
}

function go(row: EntityRecord): void {
  router.push(`${props.config.detailRoute}/${row.id}`)
}

function badgeFor(columnKey: string, row: EntityRecord) {
  if (columnKey === 'stage') return stageMeta(row.stage)
  return statusMeta(props.config.entity, row.status)
}

function csvEscape(value: unknown): string {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

async function exportCsv(): Promise<void> {
  try {
    const where: WhereClause[] = []
    if (search.value.trim()) where.push({ type: 'textFilter', value: search.value.trim() })
    if (extraWhere.value.length) where.push(...extraWhere.value)
    const data = await getList(props.config.entity, {
      maxSize: 200,
      orderBy: props.config.defaultOrderBy,
      order: props.config.defaultOrder ?? 'desc',
      select: props.config.select,
      where: where.length ? where : undefined,
    })
    const columns = visibleColumns.value
    const lines = [columns.map((column) => csvEscape(column.label)).join(',')]
    for (const row of data.list) {
      lines.push(columns.map((column) => csvEscape(row[column.key])).join(','))
    }
    const blob = new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `matmax-${props.config.entity.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    ui.toast('success', 'Exportación preparada', `${data.list.length} registros exportados.`)
  } catch (err) {
    ui.toast('error', 'No se pudo exportar', err instanceof Error ? err.message : undefined)
  }
}

function onSaved(): void {
  void refresh()
}

onMounted(() => {
  void metadata.load()
  if (auth.canRead('User')) void reference.loadUsers()
  if (route.query.new === '1' && canCreate.value) {
    createOpen.value = true
    const query = { ...route.query }
    delete query.new
    router.replace({ query })
  }
})

watch(
  () => route.query.new,
  (value) => {
    if (value === '1' && canCreate.value) {
      createOpen.value = true
      const query = { ...route.query }
      delete query.new
      router.replace({ query })
    }
  },
)
</script>

<template>
  <div class="space-y-5">
    <PageHeader :title="title" :subtitle="subtitleText" eyebrow="CRM">
      <template #actions>
        <AppButton variant="ghost" size="sm" @click="exportCsv">
          <Download class="h-4 w-4" />
          <span class="hidden sm:inline">Exportar</span>
        </AppButton>

        <DropdownMenuRoot>
          <DropdownMenuTrigger as-child>
            <AppButton variant="secondary" size="sm">
              <Columns3 class="h-4 w-4" />
              <span class="hidden sm:inline">Columnas</span>
            </AppButton>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent
              align="end"
              :side-offset="6"
              class="z-50 min-w-[210px] rounded-xl border border-line bg-surface p-1.5 shadow-xl"
            >
              <p class="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-faint">
                Columnas visibles
              </p>
              <DropdownMenuItem
                v-for="column in config.columns"
                :key="column.key"
                class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] outline-none transition hover:bg-surface-2 focus:bg-surface-2"
                @select.prevent="toggleColumn(column.key)"
              >
                <span class="flex h-4 w-4 items-center justify-center rounded border border-line">
                  <Check v-if="visibleKeys.includes(column.key)" class="h-3 w-3 text-brand" />
                </span>
                {{ column.label }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>

        <AppButton v-if="canCreate" variant="primary" size="sm" @click="createOpen = true">
          <Plus class="h-4 w-4" />
          Nuevo {{ config.label.toLowerCase() }}
        </AppButton>
      </template>
    </PageHeader>

    <div class="card overflow-hidden">
      <div class="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full sm:max-w-sm">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <AppInput
            v-model="search"
            class="!h-9 pl-9 text-[13px]"
            :placeholder="`Buscar ${config.plural.toLowerCase()}…`"
          />
        </div>

        <div class="flex items-center gap-2">
          <div v-if="hasUsers" class="flex items-center gap-1.5">
            <Users class="h-3.5 w-3.5 text-faint" />
            <div class="w-[170px]">
              <AppSelect v-model="ownerId" class="!h-9 text-[12px]" placeholder="Todos los responsables">
                <option v-for="user in reference.users" :key="user.id" :value="user.id">
                  {{ user.name || user.userName }}
                </option>
              </AppSelect>
            </div>
          </div>
          <span class="hidden items-center gap-1 text-[11px] text-faint md:flex">
            <SlidersHorizontal class="h-3 w-3" />
            {{ visibleColumns.length }} columnas
          </span>
          <div class="flex items-center gap-1.5">
            <AppSelect
              v-model="selectedViewId"
              class="!h-9 w-[150px] text-[12px]"
              aria-label="Vistas guardadas"
              @update:model-value="applySavedView"
            >
              <option value="">Vista actual</option>
              <option v-for="view in savedViews.views.value" :key="view.id" :value="view.id">{{ view.name }}</option>
            </AppSelect>
            <AppButton variant="secondary" size="sm" @click="openSaveView">
              <Bookmark class="h-3.5 w-3.5" />
              <span class="hidden sm:inline">Guardar</span>
            </AppButton>
            <AppButton v-if="selectedViewId" variant="ghost" size="sm" class="!text-danger" aria-label="Eliminar vista" @click="deleteCurrentView">
              <Trash2 class="h-3.5 w-3.5" />
            </AppButton>
          </div>
        </div>
      </div>

      <div v-if="error" class="flex items-center gap-2 border-b border-line bg-danger/[0.04] px-4 py-3 text-[12px] text-danger">
        <TriangleAlert class="h-4 w-4" />
        {{ error }}
        <button class="ml-auto font-medium underline" @click="refresh">Reintentar</button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr class="border-b border-line">
              <th
                v-for="column in visibleColumns"
                :key="column.key"
                :style="{ width: column.width }"
                :class="[
                  'px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.07em] text-faint',
                  column.hideOnMobile && 'hidden md:table-cell',
                ]"
              >
                {{ column.label }}
              </th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr v-for="index in Math.min(pageSize, 8)" :key="index" class="border-b border-line/70 last:border-0">
              <td v-for="column in visibleColumns" :key="column.key" class="px-4 py-4">
                <div class="skeleton h-4" :class="index % 3 === 0 ? 'w-1/2' : 'w-3/4'" />
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr
              v-for="row in rows"
              :key="row.id"
              class="cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-surface-2/60"
              @click="go(row)"
            >
              <td
                v-for="column in visibleColumns"
                :key="column.key"
                :class="['px-4 py-3 text-[13px]', column.hideOnMobile && 'hidden md:table-cell']"
              >
                <template v-if="column.type === 'person'">
                  <div class="flex items-center gap-2.5">
                    <AppAvatar :name="String(row.name ?? '')" size="sm" :square="config.entity === 'Account'" />
                    <div class="min-w-0">
                      <p class="truncate font-medium text-ink">{{ row.name || '—' }}</p>
                      <p v-if="secondaryText(row)" class="truncate text-[11px] text-faint">
                        {{ secondaryText(row) }}
                      </p>
                    </div>
                  </div>
                </template>

                <template v-else-if="column.type === 'contact'">
                  <div class="flex items-center gap-2">
                    <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
                      <UserRound class="h-3 w-3" />
                    </span>
                    <span :class="row[column.key] ? 'text-muted' : 'text-faint'" class="truncate">
                      {{ row[column.key] || 'Sin contacto' }}
                    </span>
                  </div>
                </template>

                <template v-else-if="column.type === 'badge'">
                  <AppBadge :tone="badgeFor(column.key, row).tone" dot>
                    {{ badgeFor(column.key, row).label }}
                  </AppBadge>
                </template>

                <template v-else-if="column.type === 'owner'">
                  <div class="flex items-center gap-2">
                    <AppAvatar :name="String(row.assignedUserName ?? '')" size="xs" />
                    <span class="truncate text-muted">{{ row.assignedUserName || 'Sin asignar' }}</span>
                  </div>
                </template>

                <template v-else-if="column.type === 'currency'">
                  <span class="font-medium tabular-nums">{{ currency(row[column.key]) }}</span>
                </template>

                <template v-else-if="column.type === 'date'">
                  <span class="whitespace-nowrap text-muted">{{ formatDate(row[column.key]) }}</span>
                </template>

                <template v-else-if="column.type === 'email'">
                  <span class="text-muted">{{ row[column.key] || '—' }}</span>
                </template>

                <template v-else-if="column.type === 'phone'">
                  <span class="text-muted">{{ row[column.key] || '—' }}</span>
                </template>

                <template v-else>
                  <span :class="row[column.key] ? 'text-muted' : 'text-faint'">
                    {{ row[column.key] || '—' }}
                  </span>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <AppEmpty
        v-if="!loading && !rows.length && !error"
        :title="`Sin ${config.plural.toLowerCase()}`"
        :description="
          search.trim()
            ? 'No hay resultados para tu búsqueda. Prueba con otro término.'
            : `Todavía no hay ${config.plural.toLowerCase()}. Crea el primero para empezar.`
        "
      >
        <template v-if="canCreate" #action>
          <AppButton variant="primary" size="sm" @click="createOpen = true">
            <Plus class="h-4 w-4" />
            Nuevo {{ config.label.toLowerCase() }}
          </AppButton>
        </template>
      </AppEmpty>

      <PaginationBar
        v-if="!loading && rows.length"
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
      />
    </div>

    <RecordForm
      v-model:open="createOpen"
      :entity="config.entity"
      :fields="formFields"
      :title="`Nuevo ${config.label.toLowerCase()}`"
      @saved="onSaved"
    />

    <AppModal v-model:open="viewModalOpen" title="Guardar vista" description="Se guardará para tu usuario en este navegador." size="sm">
      <AppField label="Nombre de la vista" required>
        <AppInput v-model="viewName" placeholder="Ej. Mis oportunidades abiertas" @keyup.enter="saveCurrentView" />
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
