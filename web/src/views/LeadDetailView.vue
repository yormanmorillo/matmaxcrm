<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowUpRight, Building2, GitBranch, Mail, Pencil, Phone, Target, Trash2, UserRound } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import RecordHeader from '@/components/crm/RecordHeader.vue'
import InfoGrid from '@/components/crm/InfoGrid.vue'
import StreamPanel from '@/components/crm/StreamPanel.vue'
import RecordTimeline from '@/components/crm/RecordTimeline.vue'
import RecordForm from '@/components/crm/RecordForm.vue'
import ConvertLeadDrawer from '@/components/crm/ConvertLeadDrawer.vue'
import { deleteRecord, getRecord } from '@/lib/api'
import { currency, formatDate, formatDateTime } from '@/lib/format'
import { LEAD_CONFIG, SOURCE, statusMeta } from '@/lib/constants'
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

const lead = ref<EntityRecord | null>(null)
const loading = ref(true)
const error = ref('')
const tab = ref('summary')
const formOpen = ref(false)
const convertOpen = ref(false)

const id = computed(() => String(route.params.id))
const canEdit = computed(() => auth.can('Lead', 'edit'))
const canDelete = computed(() => auth.can('Lead', 'delete'))
const canConvert = computed(
  () =>
    canEdit.value &&
    auth.can('Account', 'create') &&
    auth.can('Contact', 'create') &&
    auth.can('Opportunity', 'create') &&
    String(lead.value?.status) !== 'Converted',
)

const tabs = computed<TabItem[]>(() => [
  { key: 'summary', label: 'Resumen' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'notes', label: 'Notas e historial' },
])

const formFields = computed(() => {
  const custom = metadata.customFields('Lead').filter((name) => !LEAD_CONFIG.formFields.includes(name))
  return [...LEAD_CONFIG.formFields, ...custom]
})

const status = computed(() => statusMeta('Lead', lead.value?.status))

const infoItems = computed(() => {
  if (!lead.value) return []
  return [
    { label: 'Email', value: lead.value.emailAddress as string, href: lead.value.emailAddress ? `mailto:${lead.value.emailAddress}` : undefined },
    { label: 'Teléfono', value: lead.value.phoneNumber as string, href: lead.value.phoneNumber ? `tel:${lead.value.phoneNumber}` : undefined },
    { label: 'Estado', value: status.value.label },
    { label: 'Origen', value: lead.value.source ? SOURCE[String(lead.value.source)] ?? String(lead.value.source) : '' },
    { label: 'Sector', value: lead.value.industry as string },
    { label: 'Sitio web', value: lead.value.website as string, href: lead.value.website as string },
    { label: 'Valor estimado', value: lead.value.opportunityAmount ? currency(lead.value.opportunityAmount) : '' },
    { label: 'Responsable', value: lead.value.assignedUserName as string },
    { label: 'Creado', value: formatDate(lead.value.createdAt) },
    { label: 'Última actualización', value: formatDateTime(lead.value.modifiedAt) },
  ]
})

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    lead.value = await getRecord<EntityRecord>('Lead', id.value, {
      select:
        'name,firstName,lastName,title,status,source,industry,website,emailAddress,phoneNumber,opportunityAmount,accountName,assignedUserId,assignedUserName,description,createdAt,modifiedAt,convertedAt,createdAccountId,createdAccountName,createdContactId,createdContactName,createdOpportunityId,createdOpportunityName',
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar el lead.'
  } finally {
    loading.value = false
  }
}

async function remove(): Promise<void> {
  if (!lead.value) return
  const confirmed = await ui.askConfirm({
    title: 'Eliminar lead',
    message: `Se eliminará «${lead.value.name}». Esta acción no se puede deshacer.`,
    confirmLabel: 'Eliminar lead',
  })
  if (!confirmed) return
  try {
    await deleteRecord('Lead', id.value)
    ui.toast('success', 'Lead eliminado')
    router.push('/leads')
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
      :title="String(lead?.name ?? 'Lead')"
      :subtitle="[lead?.title, lead?.industry].filter(Boolean).join(' · ')"
      back-to="/leads"
      back-label="Leads"
      :avatar-name="String(lead?.name ?? '')"
      :loading="loading"
    >
      <template #badges>
        <AppBadge :tone="status.tone" dot>{{ status.label }}</AppBadge>
        <AppBadge v-if="lead?.source" tone="neutral">{{ SOURCE[String(lead.source)] ?? lead.source }}</AppBadge>
      </template>
      <template #meta>
        <span v-if="lead?.emailAddress" class="flex items-center gap-1"><Mail class="h-3 w-3" /> {{ lead.emailAddress }}</span>
        <span v-if="lead?.phoneNumber" class="flex items-center gap-1"><Phone class="h-3 w-3" /> {{ lead.phoneNumber }}</span>
      </template>
      <template #actions>
        <AppButton v-if="canConvert" variant="primary" size="sm" @click="convertOpen = true">
          <GitBranch class="h-3.5 w-3.5" />
          Convertir
        </AppButton>
        <AppButton v-if="canEdit && lead?.status !== 'Converted'" variant="secondary" size="sm" @click="formOpen = true">
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

    <template v-else-if="lead">
      <div v-if="tab === 'summary'" class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="space-y-4 lg:col-span-2">
          <div class="card p-5">
            <h2 class="section-title mb-4">Información</h2>
            <InfoGrid :items="infoItems" />
          </div>
          <div v-if="lead.description" class="card p-5">
            <h2 class="section-title mb-3">Notas</h2>
            <p class="whitespace-pre-wrap text-[13px] leading-relaxed text-muted">{{ lead.description }}</p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="card p-5">
            <h2 class="section-title mb-3">Responsable</h2>
            <div class="flex items-center gap-2.5">
              <AppAvatar :name="String(lead.assignedUserName ?? '')" size="md" />
              <div class="min-w-0">
                <p class="truncate text-[13px] font-medium">{{ lead.assignedUserName || 'Sin asignar' }}</p>
                <p class="text-[11px] text-faint">Propietario del lead</p>
              </div>
            </div>
          </div>

          <div class="card p-5">
            <h2 class="section-title mb-3">Estado del lead</h2>
            <div class="flex items-center gap-2">
              <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Target class="h-4 w-4" />
              </span>
              <div>
                <AppBadge :tone="status.tone" dot>{{ status.label }}</AppBadge>
                <p v-if="lead.source" class="mt-1 text-[11px] text-faint">
                  Origen: {{ SOURCE[String(lead.source)] ?? lead.source }}
                </p>
              </div>
            </div>
          </div>

          <div v-if="lead.status === 'Converted' && (lead.createdAccountId || lead.createdContactId || lead.createdOpportunityId)" class="card p-5">
            <h2 class="section-title mb-3">Conversión completada</h2>
            <div class="space-y-1">
              <button
                v-if="lead.createdAccountId"
                type="button"
                class="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[12px] transition hover:bg-surface-2"
                @click="router.push(`/accounts/${lead.createdAccountId}`)"
              >
                <span class="flex items-center gap-2"><Building2 class="h-3.5 w-3.5 text-brand" /> Empresa</span>
                <span class="flex min-w-0 items-center justify-end gap-1 text-muted">
                  <span class="truncate">{{ lead.createdAccountName }}</span>
                  <ArrowUpRight class="h-3 w-3 shrink-0" />
                </span>
              </button>
              <button
                v-if="lead.createdContactId"
                type="button"
                class="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[12px] transition hover:bg-surface-2"
                @click="router.push(`/contacts/${lead.createdContactId}`)"
              >
                <span class="flex items-center gap-2"><UserRound class="h-3.5 w-3.5 text-brand" /> Contacto</span>
                <span class="flex min-w-0 items-center justify-end gap-1 text-muted">
                  <span class="truncate">{{ lead.createdContactName }}</span>
                  <ArrowUpRight class="h-3 w-3 shrink-0" />
                </span>
              </button>
              <button
                v-if="lead.createdOpportunityId"
                type="button"
                class="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[12px] transition hover:bg-surface-2"
                @click="router.push(`/opportunities/${lead.createdOpportunityId}`)"
              >
                <span class="flex items-center gap-2"><Target class="h-3.5 w-3.5 text-brand" /> Oportunidad</span>
                <span class="flex min-w-0 items-center justify-end gap-1 text-muted">
                  <span class="truncate">{{ lead.createdOpportunityName }}</span>
                  <ArrowUpRight class="h-3 w-3 shrink-0" />
                </span>
              </button>
            </div>
          </div>

          <div class="card p-5">
            <h2 class="section-title mb-2">Registro</h2>
            <p class="text-[11px] leading-relaxed text-muted">
              Creado el {{ formatDateTime(lead.createdAt) }}<br />
              ID <span class="font-mono text-[10px]">{{ lead.id }}</span>
            </p>
          </div>
        </div>
      </div>

      <div v-else-if="tab === 'timeline'" class="card p-5">
        <RecordTimeline entity-type="Lead" :entity-id="id" />
      </div>

      <div v-else class="card p-5">
        <StreamPanel parent-type="Lead" :parent-id="id" :can-post="auth.can('Lead', 'stream')" />
      </div>
    </template>

    <AppEmpty v-else title="Lead no encontrado" description="El registro no existe o no tienes acceso." />

    <RecordForm
      v-model:open="formOpen"
      entity="Lead"
      :fields="formFields"
      :record="lead"
      title="Editar lead"
      @saved="load"
    />

    <ConvertLeadDrawer
      v-if="lead"
      v-model:open="convertOpen"
      :lead="lead"
      @converted="load"
    />
  </div>
</template>
