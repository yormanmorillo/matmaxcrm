<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { AlertTriangle, ArrowRight, Building2, Target, UserRound } from 'lucide-vue-next'
import AppDrawer from '@/components/ui/AppDrawer.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppField from '@/components/ui/AppField.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { request, ApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { APP_CURRENCY_SYMBOL } from '@/lib/config'
import { DEFAULT_STAGES, stageMeta } from '@/lib/constants'
import { toInputDate } from '@/lib/format'
import type { EntityRecord } from '@/types/espocrm'

interface DuplicateHit {
  id: string
  name?: string
  _entityType: string
}

const props = defineProps<{ lead: EntityRecord }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ (event: 'converted', lead: EntityRecord): void }>()

const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const duplicates = ref<DuplicateHit[]>([])
const lastSkip = ref(false)

const account = reactive({
  name: '',
  type: 'Customer',
  industry: '',
  website: '',
  emailAddress: '',
  phoneNumber: '',
})

const contact = reactive({
  firstName: '',
  lastName: '',
  title: '',
  emailAddress: '',
  phoneNumber: '',
})

const opportunity = reactive({
  name: '',
  amount: '0',
  stage: 'Prospecting',
  closeDate: '',
})

function todayPlus(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return toInputDate(date)
}

function normalizeDuplicates(details: unknown): DuplicateHit[] {
  if (Array.isArray(details)) {
    return details
      .filter((item): item is DuplicateHit => Boolean(item && typeof item === 'object' && 'id' in item))
      .map((item) => ({ id: String(item.id), name: item.name ? String(item.name) : undefined, _entityType: String(item._entityType ?? '') }))
  }
  return []
}

async function initialize(): Promise<void> {
  if (!open.value) return
  loading.value = true
  error.value = ''
  duplicates.value = []
  try {
    const data = await request<Record<string, Record<string, unknown>>>('/Lead/action/getConvertAttributes', {
      method: 'POST',
      body: { id: props.lead.id },
    })
    const a = data.Account ?? {}
    const c = data.Contact ?? {}
    const o = data.Opportunity ?? {}

    account.name = String(a.name ?? props.lead.accountName ?? props.lead.name ?? '')
    account.type = 'Customer'
    account.industry = String(a.industry ?? props.lead.industry ?? '')
    account.website = String(a.website ?? props.lead.website ?? '')
    account.emailAddress = String(a.emailAddress ?? props.lead.emailAddress ?? '')
    account.phoneNumber = String(a.phoneNumber ?? props.lead.phoneNumber ?? '')

    contact.firstName = String(c.firstName ?? props.lead.firstName ?? '')
    contact.lastName = String(c.lastName ?? props.lead.lastName ?? props.lead.name ?? '')
    contact.title = String(c.title ?? props.lead.title ?? '')
    contact.emailAddress = String(c.emailAddress ?? props.lead.emailAddress ?? '')
    contact.phoneNumber = String(c.phoneNumber ?? props.lead.phoneNumber ?? '')

    opportunity.name = String(o.name ?? `Oportunidad — ${props.lead.name ?? ''}`)
    opportunity.amount = String(o.amount ?? props.lead.opportunityAmount ?? 0)
    opportunity.stage = String(o.stage ?? 'Prospecting')
    opportunity.closeDate = toInputDate(o.closeDate ?? todayPlus(30))
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudieron cargar los datos de conversión.'
  } finally {
    loading.value = false
  }
}

watch(
  () => [open.value, props.lead.id],
  () => {
    if (open.value) void initialize()
  },
  { immediate: true },
)

function records(): Record<string, Record<string, unknown>> {
  const userId = props.lead.assignedUserId ?? auth.user?.id
  return {
    Account: {
      name: account.name,
      type: account.type,
      industry: account.industry || null,
      website: account.website || null,
      emailAddress: account.emailAddress || null,
      phoneNumber: account.phoneNumber || null,
      billingAddressCountry: 'Costa Rica',
      assignedUserId: userId ?? null,
    },
    Contact: {
      firstName: contact.firstName || null,
      lastName: contact.lastName,
      title: contact.title || null,
      emailAddress: contact.emailAddress || null,
      phoneNumber: contact.phoneNumber || null,
      assignedUserId: userId ?? null,
    },
    Opportunity: {
      name: opportunity.name,
      amount: Number(opportunity.amount || 0),
      amountCurrency: 'CRC',
      stage: opportunity.stage,
      closeDate: opportunity.closeDate,
      assignedUserId: userId ?? null,
    },
  }
}

function validate(): boolean {
  error.value = ''
  if (!account.name.trim()) {
    error.value = 'El nombre de la empresa es obligatorio.'
    return false
  }
  if (!contact.lastName.trim()) {
    error.value = 'El apellido del contacto es obligatorio.'
    return false
  }
  if (!opportunity.name.trim()) {
    error.value = 'El nombre de la oportunidad es obligatorio.'
    return false
  }
  if (!opportunity.closeDate) {
    error.value = 'La fecha de cierre es obligatoria.'
    return false
  }
  return true
}

async function submit(skipDuplicateCheck = false): Promise<void> {
  if (!validate()) return
  saving.value = true
  error.value = ''
  duplicates.value = []
  lastSkip.value = skipDuplicateCheck
  try {
    const lead = await request<EntityRecord>('/Lead/action/convert', {
      method: 'POST',
      body: {
        id: props.lead.id,
        records: records(),
        skipDuplicateCheck,
      },
    })
    ui.toast('success', 'Lead convertido', 'Empresa, contacto y oportunidad creados.')
    emit('converted', lead)
    open.value = false
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      const hits = normalizeDuplicates(err.details)
      duplicates.value = hits
      error.value = hits.length
        ? 'Se han encontrado posibles duplicados. Revisa los registros antes de continuar.'
        : 'Se ha detectado un posible duplicado.'
    } else {
      error.value = err instanceof Error ? err.message : 'No se pudo convertir el lead.'
    }
  } finally {
    saving.value = false
  }
}

function openDuplicate(hit: DuplicateHit): void {
  const route = hit._entityType === 'Account' ? 'accounts' : hit._entityType === 'Contact' ? 'contacts' : 'opportunities'
  open.value = false
  router.push(`/${route}/${hit.id}`)
}
</script>

<template>
  <AppDrawer v-model:open="open" title="Convertir lead" width="2xl">
    <div v-if="loading" class="space-y-3">
      <div v-for="index in 6" :key="index" class="skeleton h-10" />
    </div>

    <form v-else id="convert-lead-form" class="space-y-5" @submit.prevent="submit(false)">
      <div class="rounded-xl border border-brand/20 bg-brand-soft/40 px-3.5 py-3 text-[12px] leading-relaxed text-muted">
        Se crearán una <strong>empresa</strong>, un <strong>contacto</strong> y una <strong>oportunidad</strong> vinculados.
        El lead pasará a estado <strong>Convertido</strong>.
      </div>

      <div v-if="error" class="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger/[0.06] px-3.5 py-3 text-[12px] text-danger">
        <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
        <span>{{ error }}</span>
      </div>

      <div v-if="duplicates.length" class="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-3.5">
        <p class="text-[12px] font-semibold text-amber-800 dark:text-amber-200">Posibles duplicados</p>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <button
            v-for="hit in duplicates"
            :key="`${hit._entityType}-${hit.id}`"
            type="button"
            class="rounded-lg border border-line bg-surface px-2 py-1 text-[11px] hover:border-brand/40"
            @click="openDuplicate(hit)"
          >
            {{ hit._entityType }}: {{ hit.name || hit.id }}
          </button>
        </div>
        <p class="mt-2 text-[11px] leading-relaxed text-muted">
          Puedes abrir el registro existente o crear la conversión de todos modos.
        </p>
        <AppButton class="mt-2" size="sm" variant="danger" :loading="saving" @click="submit(true)">
          Convertir de todos modos
        </AppButton>
      </div>

      <section class="rounded-xl border border-line p-4">
        <div class="mb-3 flex items-center gap-2">
          <Building2 class="h-4 w-4 text-brand" />
          <h3 class="text-[12px] font-semibold">Empresa</h3>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AppField label="Nombre" required class="sm:col-span-2">
            <AppInput v-model="account.name" placeholder="Nombre de la empresa" />
          </AppField>
          <AppField label="Sector">
            <AppInput v-model="account.industry" placeholder="Ej. Healthcare" />
          </AppField>
          <AppField label="Sitio web">
            <AppInput v-model="account.website" placeholder="https://" />
          </AppField>
          <AppField label="Email">
            <AppInput v-model="account.emailAddress" type="email" />
          </AppField>
          <AppField label="Teléfono">
            <AppInput v-model="account.phoneNumber" placeholder="+506 8888 8888" />
          </AppField>
        </div>
      </section>

      <section class="rounded-xl border border-line p-4">
        <div class="mb-3 flex items-center gap-2">
          <UserRound class="h-4 w-4 text-brand" />
          <h3 class="text-[12px] font-semibold">Contacto</h3>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AppField label="Nombre">
            <AppInput v-model="contact.firstName" />
          </AppField>
          <AppField label="Apellidos" required>
            <AppInput v-model="contact.lastName" />
          </AppField>
          <AppField label="Puesto">
            <AppInput v-model="contact.title" />
          </AppField>
          <AppField label="Email">
            <AppInput v-model="contact.emailAddress" type="email" />
          </AppField>
          <AppField label="Teléfono">
            <AppInput v-model="contact.phoneNumber" placeholder="+506 8888 8888" />
          </AppField>
        </div>
      </section>

      <section class="rounded-xl border border-line p-4">
        <div class="mb-3 flex items-center gap-2">
          <Target class="h-4 w-4 text-brand" />
          <h3 class="text-[12px] font-semibold">Oportunidad</h3>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AppField label="Nombre" required class="sm:col-span-2">
            <AppInput v-model="opportunity.name" />
          </AppField>
          <AppField label="Importe" required>
            <div class="relative">
              <AppInput v-model="opportunity.amount" type="number" min="0" step="0.01" class="pr-8" />
              <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-faint">{{ APP_CURRENCY_SYMBOL }}</span>
            </div>
          </AppField>
          <AppField label="Etapa">
            <AppSelect v-model="opportunity.stage">
              <option v-for="stage in DEFAULT_STAGES" :key="stage" :value="stage">{{ stageMeta(stage).label }}</option>
            </AppSelect>
          </AppField>
          <AppField label="Fecha de cierre" required>
            <AppInput v-model="opportunity.closeDate" type="date" />
          </AppField>
        </div>
      </section>
    </form>

    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="open = false">Cancelar</AppButton>
      <AppButton type="submit" form="convert-lead-form" variant="primary" :loading="saving" :disabled="loading">
        <ArrowRight class="h-4 w-4" />
        Convertir lead
      </AppButton>
    </template>
  </AppDrawer>
</template>
