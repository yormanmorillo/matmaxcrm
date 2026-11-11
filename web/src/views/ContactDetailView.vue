<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Building2, Mail, Pencil, Phone, Trash2, TrendingUp } from 'lucide-vue-next'
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
import RecordForm from '@/components/crm/RecordForm.vue'
import { getRecord, deleteRecord } from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/format'
import { CONTACT_CONFIG } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth'
import { useMetadataStore } from '@/stores/metadata'
import { useUiStore } from '@/stores/ui'
import type { EntityRecord } from '@/types/espocrm'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const metadata = useMetadataStore()
const ui = useUiStore()

const contact = ref<EntityRecord | null>(null)
const loading = ref(true)
const error = ref('')
const tab = ref('summary')
const formOpen = ref(false)

const id = computed(() => String(route.params.id))
const canEdit = computed(() => auth.can('Contact', 'edit'))
const canDelete = computed(() => auth.can('Contact', 'delete'))
const canReadActivities = computed(
  () => auth.canRead('Task') || auth.canRead('Call') || auth.canRead('Meeting'),
)

const tabs = computed<TabItem[]>(() => [
  { key: 'summary', label: 'Resumen' },
  { key: 'timeline', label: 'Timeline' },
  ...(canReadActivities.value ? [{ key: 'activities', label: 'Actividades' }] : []),
  ...(auth.canRead('Opportunity') ? [{ key: 'opportunities', label: 'Oportunidades' }] : []),
  { key: 'notes', label: 'Notas e historial' },
])

const formFields = computed(() => {
  const custom = metadata.customFields('Contact').filter((name) => !CONTACT_CONFIG.formFields.includes(name))
  return [...CONTACT_CONFIG.formFields, ...custom]
})

const address = computed(() => {
  if (!contact.value) return ''
  return [
    contact.value.addressStreet,
    [contact.value.addressPostalCode, contact.value.addressCity].filter(Boolean).join(' '),
    contact.value.addressState,
    contact.value.addressCountry,
  ]
    .filter(Boolean)
    .join(', ')
})

const infoItems = computed(() => {
  if (!contact.value) return []
  return [
    { label: 'Email', value: contact.value.emailAddress as string, href: contact.value.emailAddress ? `mailto:${contact.value.emailAddress}` : undefined },
    { label: 'Teléfono', value: contact.value.phoneNumber as string, href: contact.value.phoneNumber ? `tel:${contact.value.phoneNumber}` : undefined },
    { label: 'Puesto', value: contact.value.title as string },
    { label: 'Empresa', value: contact.value.accountName as string },
    { label: 'Responsable', value: contact.value.assignedUserName as string },
    { label: 'Creado', value: formatDate(contact.value.createdAt) },
    { label: 'Última actualización', value: formatDateTime(contact.value.modifiedAt) },
    { label: 'Dirección', value: address.value, full: true },
  ]
})

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    contact.value = await getRecord<EntityRecord>('Contact', id.value, {
      select:
        'name,firstName,lastName,title,emailAddress,phoneNumber,accountId,accountName,assignedUserId,assignedUserName,description,addressStreet,addressCity,addressState,addressCountry,addressPostalCode,createdAt,modifiedAt',
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar el contacto.'
  } finally {
    loading.value = false
  }
}

async function remove(): Promise<void> {
  if (!contact.value) return
  const confirmed = await ui.askConfirm({
    title: 'Eliminar contacto',
    message: `Se eliminará «${contact.value.name}». Esta acción no se puede deshacer.`,
    confirmLabel: 'Eliminar contacto',
  })
  if (!confirmed) return
  try {
    await deleteRecord('Contact', id.value)
    ui.toast('success', 'Contacto eliminado')
    router.push('/contacts')
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
      :title="String(contact?.name ?? 'Contacto')"
      :subtitle="[contact?.title, contact?.accountName].filter(Boolean).join(' · ')"
      back-to="/contacts"
      back-label="Contactos"
      :avatar-name="String(contact?.name ?? '')"
      :loading="loading"
    >
      <template #badges>
        <AppBadge v-if="contact?.accountName" tone="neutral">
          <Building2 class="h-3 w-3" />
          {{ contact.accountName }}
        </AppBadge>
      </template>
      <template #meta>
        <span v-if="contact?.emailAddress" class="flex items-center gap-1"><Mail class="h-3 w-3" /> {{ contact.emailAddress }}</span>
        <span v-if="contact?.phoneNumber" class="flex items-center gap-1"><Phone class="h-3 w-3" /> {{ contact.phoneNumber }}</span>
      </template>
      <template #actions>
        <AppButton v-if="canEdit" variant="secondary" size="sm" @click="formOpen = true">
          <Pencil class="h-3.5 w-3.5" />
          Editar
        </AppButton>
        <AppButton v-if="auth.canRead('Opportunity')" variant="primary" size="sm" @click="tab = 'opportunities'">
          <TrendingUp class="h-3.5 w-3.5" />
          Oportunidades
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

    <template v-else-if="contact">
      <div v-if="tab === 'summary'" class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="space-y-4 lg:col-span-2">
          <div class="card p-5">
            <h2 class="section-title mb-4">Información</h2>
            <InfoGrid :items="infoItems" />
          </div>
          <div v-if="contact.description" class="card p-5">
            <h2 class="section-title mb-3">Notas</h2>
            <p class="whitespace-pre-wrap text-[13px] leading-relaxed text-muted">{{ contact.description }}</p>
          </div>
          <div class="card p-5">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="section-title">Oportunidades</h2>
            </div>
            <RelatedOpportunities
              :contact-id="id"
              :can-create="auth.can('Opportunity', 'create')"
            />
          </div>
        </div>

        <div class="space-y-4">
          <div class="card p-5">
            <h2 class="section-title mb-3">Responsable</h2>
            <div class="flex items-center gap-2.5">
              <AppAvatar :name="String(contact.assignedUserName ?? '')" size="md" />
              <div class="min-w-0">
                <p class="truncate text-[13px] font-medium">{{ contact.assignedUserName || 'Sin asignar' }}</p>
                <p class="text-[11px] text-faint">Propietario del contacto</p>
              </div>
            </div>
          </div>

          <div v-if="contact.accountId" class="card p-5">
            <h2 class="section-title mb-3">Empresa</h2>
            <button
              class="flex w-full items-center gap-2.5 rounded-lg text-left transition hover:opacity-80"
              @click="router.push(`/accounts/${contact.accountId}`)"
            >
              <AppAvatar :name="String(contact.accountName ?? '')" size="md" square />
              <div class="min-w-0">
                <p class="truncate text-[13px] font-medium">{{ contact.accountName || 'Empresa' }}</p>
                <p class="text-[11px] text-faint">Ver ficha completa</p>
              </div>
            </button>
          </div>

          <div class="card p-5">
            <h2 class="section-title mb-2">Registro</h2>
            <p class="text-[11px] leading-relaxed text-muted">
              Creado el {{ formatDateTime(contact.createdAt) }}<br />
              ID <span class="font-mono text-[10px]">{{ contact.id }}</span>
            </p>
          </div>
        </div>
      </div>

      <div v-else-if="tab === 'timeline'" class="card p-5">
        <RecordTimeline entity-type="Contact" :entity-id="id" :contact-id="id" :account-id="String(contact.accountId ?? '')" />
      </div>

      <div v-else-if="tab === 'activities'" class="card p-5">
        <RelatedActivities entity-type="Contact" :entity-id="id" />
      </div>

      <div v-else-if="tab === 'opportunities'" class="card p-5">
        <RelatedOpportunities
          :contact-id="id"
          :can-create="auth.can('Opportunity', 'create')"
        />
      </div>

      <div v-else class="card p-5">
        <StreamPanel parent-type="Contact" :parent-id="id" :can-post="auth.can('Contact', 'stream')" />
      </div>
    </template>

    <AppEmpty v-else title="Contacto no encontrado" description="El registro no existe o no tienes acceso." />

    <RecordForm
      v-model:open="formOpen"
      entity="Contact"
      :fields="formFields"
      :record="contact"
      title="Editar contacto"
      @saved="load"
    />
  </div>
</template>
