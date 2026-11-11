<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Building2, Globe, Mail, Pencil, Phone, Trash2, UsersRound } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import type { TabItem } from '@/types/ui'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import RecordHeader from '@/components/crm/RecordHeader.vue'
import InfoGrid from '@/components/crm/InfoGrid.vue'
import StreamPanel from '@/components/crm/StreamPanel.vue'
import RecordTimeline from '@/components/crm/RecordTimeline.vue'
import RelatedActivities from '@/components/crm/RelatedActivities.vue'
import RelatedOpportunities from '@/components/crm/RelatedOpportunities.vue'
import RelatedContacts from '@/components/crm/RelatedContacts.vue'
import RecordForm from '@/components/crm/RecordForm.vue'
import { deleteRecord, getRecord } from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/format'
import { ACCOUNT_CONFIG, ACCOUNT_TYPE } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth'
import { useMetadataStore } from '@/stores/metadata'
import { useUiStore } from '@/stores/ui'
import type { EntityRecord } from '@/types/espocrm'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const metadata = useMetadataStore()
const ui = useUiStore()

const account = ref<EntityRecord | null>(null)
const loading = ref(true)
const error = ref('')
const tab = ref('summary')
const formOpen = ref(false)

const id = computed(() => String(route.params.id))
const canEdit = computed(() => auth.can('Account', 'edit'))
const canDelete = computed(() => auth.can('Account', 'delete'))
const canReadActivities = computed(
  () => auth.canRead('Task') || auth.canRead('Call') || auth.canRead('Meeting'),
)

const tabs = computed<TabItem[]>(() => [
  { key: 'summary', label: 'Resumen' },
  { key: 'timeline', label: 'Timeline' },
  ...(auth.canRead('Contact') ? [{ key: 'contacts', label: 'Contactos' }] : []),
  ...(auth.canRead('Opportunity') ? [{ key: 'opportunities', label: 'Oportunidades' }] : []),
  ...(canReadActivities.value ? [{ key: 'activities', label: 'Actividades' }] : []),
  { key: 'notes', label: 'Notas e historial' },
])

const formFields = computed(() => {
  const custom = metadata.customFields('Account').filter((name) => !ACCOUNT_CONFIG.formFields.includes(name))
  return [...ACCOUNT_CONFIG.formFields, ...custom]
})

const address = computed(() => {
  if (!account.value) return ''
  return [
    account.value.billingAddressStreet,
    [account.value.billingAddressPostalCode, account.value.billingAddressCity].filter(Boolean).join(' '),
    account.value.billingAddressState,
    account.value.billingAddressCountry,
  ]
    .filter(Boolean)
    .join(', ')
})

const infoItems = computed(() => {
  if (!account.value) return []
  return [
    { label: 'Sitio web', value: account.value.website as string, href: account.value.website as string },
    { label: 'Email', value: account.value.emailAddress as string, href: account.value.emailAddress ? `mailto:${account.value.emailAddress}` : undefined },
    { label: 'Teléfono', value: account.value.phoneNumber as string, href: account.value.phoneNumber ? `tel:${account.value.phoneNumber}` : undefined },
    { label: 'Sector', value: account.value.industry as string },
    { label: 'Tipo', value: account.value.type ? ACCOUNT_TYPE[String(account.value.type)] ?? String(account.value.type) : '' },
    { label: 'Responsable', value: account.value.assignedUserName as string },
    { label: 'Creada', value: formatDate(account.value.createdAt) },
    { label: 'Última actualización', value: formatDateTime(account.value.modifiedAt) },
    { label: 'Dirección fiscal', value: address.value, full: true },
  ]
})

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    account.value = await getRecord<EntityRecord>('Account', id.value, {
      select:
        'name,website,emailAddress,phoneNumber,industry,type,assignedUserId,assignedUserName,description,billingAddressStreet,billingAddressCity,billingAddressState,billingAddressCountry,billingAddressPostalCode,createdAt,modifiedAt',
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar la empresa.'
  } finally {
    loading.value = false
  }
}

async function remove(): Promise<void> {
  if (!account.value) return
  const confirmed = await ui.askConfirm({
    title: 'Eliminar empresa',
    message: `Se eliminará «${account.value.name}». Esta acción no se puede deshacer.`,
    confirmLabel: 'Eliminar empresa',
  })
  if (!confirmed) return
  try {
    await deleteRecord('Account', id.value)
    ui.toast('success', 'Empresa eliminada')
    router.push('/accounts')
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
      :title="String(account?.name ?? 'Empresa')"
      :subtitle="[account?.industry, account?.website].filter(Boolean).join(' · ')"
      back-to="/accounts"
      back-label="Empresas"
      :avatar-name="String(account?.name ?? '')"
      square
      :loading="loading"
    >
      <template #badges>
        <AppBadge v-if="account?.type" tone="neutral">
          <Building2 class="h-3 w-3" />
          {{ ACCOUNT_TYPE[String(account.type)] ?? account.type }}
        </AppBadge>
      </template>
      <template #meta>
        <span v-if="account?.emailAddress" class="flex items-center gap-1"><Mail class="h-3 w-3" /> {{ account.emailAddress }}</span>
        <span v-if="account?.phoneNumber" class="flex items-center gap-1"><Phone class="h-3 w-3" /> {{ account.phoneNumber }}</span>
        <span v-if="account?.website" class="flex items-center gap-1"><Globe class="h-3 w-3" /> {{ account.website }}</span>
      </template>
      <template #actions>
        <AppButton v-if="canEdit" variant="secondary" size="sm" @click="formOpen = true">
          <Pencil class="h-3.5 w-3.5" />
          Editar
        </AppButton>
        <AppButton v-if="auth.can('Contact', 'create')" variant="primary" size="sm" @click="tab = 'contacts'">
          <UsersRound class="h-3.5 w-3.5" />
          Contactos
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

    <template v-else-if="account">
      <div v-if="tab === 'summary'" class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="space-y-4 lg:col-span-2">
          <div class="card p-5">
            <h2 class="section-title mb-4">Información</h2>
            <InfoGrid :items="infoItems" />
          </div>
          <div v-if="account.description" class="card p-5">
            <h2 class="section-title mb-3">Notas</h2>
            <p class="whitespace-pre-wrap text-[13px] leading-relaxed text-muted">{{ account.description }}</p>
          </div>
          <div class="card p-5">
            <h2 class="section-title mb-3">Contactos</h2>
            <RelatedContacts :account-id="id" :can-create="auth.can('Contact', 'create')" />
          </div>
        </div>

        <div class="space-y-4">
          <div class="card p-5">
            <h2 class="section-title mb-3">Responsable</h2>
            <div class="flex items-center gap-2.5">
              <AppAvatar :name="String(account.assignedUserName ?? '')" size="md" />
              <div class="min-w-0">
                <p class="truncate text-[13px] font-medium">{{ account.assignedUserName || 'Sin asignar' }}</p>
                <p class="text-[11px] text-faint">Propietario de la empresa</p>
              </div>
            </div>
          </div>

          <div class="card p-5">
            <h2 class="section-title mb-3">Datos comerciales</h2>
            <dl class="space-y-2.5 text-[12px]">
              <div class="flex justify-between gap-3">
                <dt class="text-muted">Sector</dt>
                <dd class="text-right font-medium">{{ account.industry || '—' }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-muted">Tipo</dt>
                <dd class="text-right font-medium">{{ account.type ? ACCOUNT_TYPE[String(account.type)] ?? account.type : '—' }}</dd>
              </div>
            </dl>
          </div>

          <div class="card p-5">
            <h2 class="section-title mb-2">Registro</h2>
            <p class="text-[11px] leading-relaxed text-muted">
              Creada el {{ formatDateTime(account.createdAt) }}<br />
              ID <span class="font-mono text-[10px]">{{ account.id }}</span>
            </p>
          </div>
        </div>
      </div>

      <div v-else-if="tab === 'timeline'" class="card p-5">
        <RecordTimeline entity-type="Account" :entity-id="id" :account-id="id" />
      </div>

      <div v-else-if="tab === 'contacts'" class="card p-5">
        <RelatedContacts :account-id="id" :can-create="auth.can('Contact', 'create')" />
      </div>

      <div v-else-if="tab === 'opportunities'" class="card p-5">
        <RelatedOpportunities :account-id="id" :can-create="auth.can('Opportunity', 'create')" />
      </div>

      <div v-else-if="tab === 'activities'" class="card p-5">
        <RelatedActivities entity-type="Account" :entity-id="id" />
      </div>

      <div v-else class="card p-5">
        <StreamPanel parent-type="Account" :parent-id="id" :can-post="auth.can('Account', 'stream')" />
      </div>
    </template>

    <AppEmpty v-else title="Empresa no encontrada" description="El registro no existe o no tienes acceso." />

    <RecordForm
      v-model:open="formOpen"
      entity="Account"
      :fields="formFields"
      :record="account"
      title="Editar empresa"
      @saved="load"
    />
  </div>
</template>
