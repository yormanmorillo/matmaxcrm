<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Building2, CalendarDays, Mail, Pencil, Phone, Trash2, TrendingUp, UserRound } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import RecordHeader from '@/components/crm/RecordHeader.vue'
import InfoGrid from '@/components/crm/InfoGrid.vue'
import StreamPanel from '@/components/crm/StreamPanel.vue'
import RecordTimeline from '@/components/crm/RecordTimeline.vue'
import RelatedActivities from '@/components/crm/RelatedActivities.vue'
import QuotesPanel from '@/components/crm/QuotesPanel.vue'
import RecordForm from '@/components/crm/RecordForm.vue'
import { deleteRecord, getRecord, updateRecord } from '@/lib/api'
import { currency, formatDate, formatDateTime } from '@/lib/format'
import { DEFAULT_STAGES, OPPORTUNITY_CONFIG, stageMeta } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth'
import { useMetadataStore } from '@/stores/metadata'
import { useUiStore } from '@/stores/ui'
import type { TabItem } from '@/types/ui'
import type { EntityRecord } from '@/types/espocrm'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const metadata = useMetadataStore()
const ui = useUiStore()

const opportunity = ref<EntityRecord | null>(null)
const loading = ref(true)
const error = ref('')
const tab = ref('summary')
const formOpen = ref(false)
const stage = ref('')
const savingStage = ref(false)

const id = computed(() => String(route.params.id))
const canEdit = computed(() => auth.can('Opportunity', 'edit'))
const canDelete = computed(() => auth.can('Opportunity', 'delete'))
const stageInfo = computed(() => stageMeta(opportunity.value?.stage))

const tabs = computed<TabItem[]>(() => [
  { key: 'summary', label: 'Resumen' },
  { key: 'timeline', label: 'Timeline' },
  ...(opportunity.value?.accountId ? [{ key: 'activities', label: 'Actividades' }] : []),
  { key: 'quotes', label: 'Presupuestos' },
  { key: 'notes', label: 'Notas e historial' },
])

const formFields = computed(() => {
  const custom = metadata.customFields('Opportunity').filter(
    (name) => !OPPORTUNITY_CONFIG.formFields.includes(name),
  )
  return [...OPPORTUNITY_CONFIG.formFields, ...custom]
})

const infoItems = computed(() => {
  if (!opportunity.value) return []
  return [
    { label: 'Empresa', value: opportunity.value.accountName as string },
    { label: 'Contacto', value: opportunity.value.contactName as string },
    { label: 'Etapa', value: stageInfo.value.label },
    { label: 'Importe', value: currency(opportunity.value.amount) },
    { label: 'Probabilidad', value: `${opportunity.value.probability ?? 0}%` },
    { label: 'Fecha de cierre', value: formatDate(opportunity.value.closeDate) },
    { label: 'Responsable', value: opportunity.value.assignedUserName as string },
    { label: 'Creada', value: formatDate(opportunity.value.createdAt) },
    { label: 'Última actualización', value: formatDateTime(opportunity.value.modifiedAt) },
  ]
})

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    opportunity.value = await getRecord<EntityRecord>('Opportunity', id.value, {
      select:
        'name,accountId,accountName,contactId,contactName,stage,amount,amountCurrency,probability,closeDate,assignedUserId,assignedUserName,description,createdAt,modifiedAt',
    })
    stage.value = String(opportunity.value.stage ?? 'Prospecting')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar la oportunidad.'
  } finally {
    loading.value = false
  }
}

async function changeStage(value: string): Promise<void> {
  if (!opportunity.value || value === opportunity.value.stage || !canEdit.value) return
  const previous = String(opportunity.value.stage)
  savingStage.value = true
  try {
    await updateRecord('Opportunity', id.value, { stage: value })
    opportunity.value.stage = value
    ui.toast('success', 'Etapa actualizada', stageMeta(value).label)
  } catch (err) {
    stage.value = previous
    ui.toast('error', 'No se pudo cambiar la etapa', err instanceof Error ? err.message : undefined)
  } finally {
    savingStage.value = false
  }
}

async function remove(): Promise<void> {
  if (!opportunity.value) return
  const confirmed = await ui.askConfirm({
    title: 'Eliminar oportunidad',
    message: `Se eliminará «${opportunity.value.name}». Esta acción no se puede deshacer.`,
    confirmLabel: 'Eliminar oportunidad',
  })
  if (!confirmed) return
  try {
    await deleteRecord('Opportunity', id.value)
    ui.toast('success', 'Oportunidad eliminada')
    router.push('/opportunities')
  } catch (err) {
    ui.toast('error', 'No se pudo eliminar', err instanceof Error ? err.message : undefined)
  }
}

onMounted(() => {
  void metadata.load()
  void load()
})
</script>

<template>
  <div class="space-y-6">
    <RecordHeader
      :title="String(opportunity?.name ?? 'Oportunidad')"
      :subtitle="[opportunity?.contactName, opportunity?.accountName, opportunity?.closeDate ? `Cierre ${formatDate(opportunity.closeDate)}` : ''].filter(Boolean).join(' · ')"
      back-to="/opportunities"
      back-label="Oportunidades"
      :avatar-name="String(opportunity?.name ?? '')"
      :loading="loading"
    >
      <template #badges>
        <AppBadge :tone="stageInfo.tone" dot>{{ stageInfo.label }}</AppBadge>
      </template>
      <template #meta>
        <span class="text-[15px] font-semibold text-ink">{{ currency(opportunity?.amount) }}</span>
        <span v-if="opportunity?.assignedUserName" class="flex items-center gap-1">
          <UserRound class="h-3 w-3" /> {{ opportunity.assignedUserName }}
        </span>
      </template>
      <template #actions>
        <div v-if="canEdit" class="w-[152px]">
          <AppSelect v-model="stage" class="!h-9 text-[12px]" :disabled="savingStage" @change="changeStage">
            <option v-for="item in DEFAULT_STAGES" :key="item" :value="item">{{ stageMeta(item).label }}</option>
          </AppSelect>
        </div>
        <AppButton v-if="canEdit" variant="secondary" size="sm" @click="formOpen = true">
          <Pencil class="h-3.5 w-3.5" />
          Editar
        </AppButton>
        <AppButton v-if="canDelete" variant="ghost" size="sm" class="!text-danger" @click="remove">
          <Trash2 class="h-3.5 w-3.5" />
        </AppButton>
      </template>
    </RecordHeader>

    <div v-if="error" class="rounded-xl border border-danger/20 bg-danger/[0.05] px-4 py-3 text-[13px] text-danger">
      {{ error }}
    </div>

    <AppTabs v-model="tab" :tabs="tabs" />

    <div v-if="loading" class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="skeleton h-64 lg:col-span-2" />
      <div class="skeleton h-64" />
    </div>

    <template v-else-if="opportunity">
      <div v-if="tab === 'summary'" class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="space-y-4 lg:col-span-2">
          <div class="card p-5">
            <h2 class="section-title mb-4">Información</h2>
            <InfoGrid :items="infoItems" />
          </div>

          <div class="card p-5">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="section-title">Probabilidad de cierre</h2>
              <span class="text-[12px] font-medium">{{ opportunity.probability ?? 0 }}%</span>
            </div>
            <div class="h-2.5 overflow-hidden rounded-full bg-surface-2">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{ width: `${Math.min(100, Number(opportunity.probability ?? 0))}%`, background: stageInfo.color }"
              />
            </div>
            <p class="mt-2 text-[11px] text-faint">
              Etapa actual: {{ stageInfo.label }}. Ajusta la probabilidad editando la oportunidad.
            </p>
          </div>

          <div v-if="opportunity.description" class="card p-5">
            <h2 class="section-title mb-3">Notas</h2>
            <p class="whitespace-pre-wrap text-[13px] leading-relaxed text-muted">{{ opportunity.description }}</p>
          </div>
        </div>

        <div class="space-y-4">
          <div v-if="opportunity.accountId" class="card p-5">
            <h2 class="section-title mb-3">Empresa</h2>
            <button
              class="flex w-full items-center gap-2.5 text-left transition hover:opacity-80"
              @click="router.push(`/accounts/${opportunity.accountId}`)"
            >
              <AppAvatar :name="String(opportunity.accountName ?? '')" size="md" square />
              <div class="min-w-0">
                <p class="truncate text-[13px] font-medium">{{ opportunity.accountName || 'Empresa' }}</p>
                <p class="text-[11px] text-faint">Ver ficha completa</p>
              </div>
            </button>
          </div>

          <div v-if="opportunity.contactId" class="card p-5">
            <h2 class="section-title mb-3">Contacto</h2>
            <button
              class="flex w-full items-center gap-2.5 text-left transition hover:opacity-80"
              @click="router.push(`/contacts/${opportunity.contactId}`)"
            >
              <AppAvatar :name="String(opportunity.contactName ?? '')" size="md" />
              <div class="min-w-0">
                <p class="truncate text-[13px] font-medium">{{ opportunity.contactName || 'Contacto' }}</p>
                <p class="text-[11px] text-faint">Ver ficha completa</p>
              </div>
            </button>
          </div>

          <div class="card p-5">
            <h2 class="section-title mb-3">Responsable</h2>
            <div class="flex items-center gap-2.5">
              <AppAvatar :name="String(opportunity.assignedUserName ?? '')" size="md" />
              <div class="min-w-0">
                <p class="truncate text-[13px] font-medium">{{ opportunity.assignedUserName || 'Sin asignar' }}</p>
                <p class="text-[11px] text-faint">Propietario de la oportunidad</p>
              </div>
            </div>
          </div>

          <div class="card p-5">
            <h2 class="section-title mb-2">Registro</h2>
            <p class="text-[11px] leading-relaxed text-muted">
              Creada el {{ formatDateTime(opportunity.createdAt) }}<br />
              ID <span class="font-mono text-[10px]">{{ opportunity.id }}</span>
            </p>
          </div>
        </div>
      </div>

      <div v-else-if="tab === 'timeline'" class="card p-5">
        <RecordTimeline
          entity-type="Opportunity"
          :entity-id="id"
          :account-id="String(opportunity.accountId ?? '')"
          :contact-id="String(opportunity.contactId ?? '')"
        />
      </div>

      <div v-else-if="tab === 'activities' && opportunity.accountId" class="card p-5">
        <RelatedActivities entity-type="Account" :entity-id="String(opportunity.accountId)" />
      </div>

      <div v-else-if="tab === 'quotes'" class="card p-5">
        <QuotesPanel :opportunity="opportunity" />
      </div>

      <div v-else class="card p-5">
        <StreamPanel parent-type="Opportunity" :parent-id="id" :can-post="auth.can('Opportunity', 'stream')" />
      </div>
    </template>

    <AppEmpty v-else title="Oportunidad no encontrada" description="El registro no existe o no tienes acceso." />

    <RecordForm
      v-model:open="formOpen"
      entity="Opportunity"
      :fields="formFields"
      :record="opportunity"
      title="Editar oportunidad"
      @saved="load"
    />
  </div>
</template>
