<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Plus, Printer, Trash2 } from 'lucide-vue-next'
import AppDrawer from '@/components/ui/AppDrawer.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppField from '@/components/ui/AppField.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import { getList, request } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { APP_CURRENCY_SYMBOL } from '@/lib/config'
import { QUOTE_STATUS } from '@/lib/constants'
import { currency, formatDate, toInputDate } from '@/lib/format'
import type { EntityRecord } from '@/types/espocrm'

interface QuoteLine {
  key: string
  treatmentId: string
  name: string
  qty: number
  price: number
}

const props = defineProps<{
  quote?: EntityRecord | null
  opportunity?: EntityRecord | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ (event: 'saved'): void; (event: 'deleted'): void }>()

const auth = useAuthStore()
const ui = useUiStore()

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const treatments = ref<EntityRecord[]>([])
const opportunities = ref<EntityRecord[]>([])
const lines = ref<QuoteLine[]>([])
const newTreatmentId = ref('')

const form = ref({
  name: '',
  status: 'Draft',
  validUntil: '',
  taxRate: '13',
  opportunityId: '',
  opportunityName: '',
  accountId: '',
  accountName: '',
  contactId: '',
  contactName: '',
  notes: '',
})

const subtotal = computed(() => lines.value.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.price || 0), 0))
const taxAmount = computed(() => subtotal.value * (Number(form.value.taxRate || 0) / 100))
const total = computed(() => subtotal.value + taxAmount.value)
const isEdit = computed(() => Boolean(props.quote?.id))

function plus(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return toInputDate(date)
}

function parseLines(value: unknown): QuoteLine[] {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (!Array.isArray(parsed)) return []
    return parsed.map((line, index) => ({
      key: `${Date.now()}-${index}`,
      treatmentId: String(line.treatmentId ?? ''),
      name: String(line.name ?? ''),
      qty: Number(line.qty ?? line.quantity ?? 1),
      price: Number(line.price ?? line.unitPrice ?? 0),
    }))
  } catch {
    return []
  }
}

async function load(): Promise<void> {
  if (!open.value) return
  loading.value = true
  error.value = ''
  try {
    const [treatmentResult, opportunityResult] = await Promise.all([
      getList<EntityRecord>('CTreatment', {
        maxSize: 200,
        orderBy: 'name',
        order: 'asc',
        select: 'name,category,price,duration,active',
      }),
      getList<EntityRecord>('Opportunity', {
        maxSize: 200,
        orderBy: 'closeDate',
        order: 'asc',
        select: 'name,accountId,accountName,contactId,contactName,stage,amount',
      }),
    ])
    treatments.value = treatmentResult.list.filter((item) => item.active !== false)
    opportunities.value = opportunityResult.list

    const q = props.quote
    if (q) {
      form.value = {
        name: String(q.name ?? ''),
        status: String(q.status ?? 'Draft'),
        validUntil: q.validUntil ? toInputDate(q.validUntil) : plus(15),
        taxRate: String(q.taxRate ?? 13),
        opportunityId: String(q.opportunityId ?? ''),
        opportunityName: String(q.opportunityName ?? ''),
        accountId: String(q.accountId ?? ''),
        accountName: String(q.accountName ?? ''),
        contactId: String(q.contactId ?? ''),
        contactName: String(q.contactName ?? ''),
        notes: String(q.notes ?? ''),
      }
      lines.value = parseLines(q.items)
      if (!lines.value.length) lines.value = [{ key: `${Date.now()}`, treatmentId: '', name: '', qty: 1, price: 0 }]
    } else {
      form.value = {
        name: `Presupuesto ${formatDate(new Date())}`,
        status: 'Draft',
        validUntil: plus(15),
        taxRate: '13',
        opportunityId: '',
        opportunityName: '',
        accountId: '',
        accountName: '',
        contactId: '',
        contactName: '',
        notes: '',
      }
      lines.value = []
      if (props.opportunity) applyOpportunity(String(props.opportunity.id))
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudieron cargar los datos del presupuesto.'
  } finally {
    loading.value = false
  }
}

function applyOpportunity(value: string | number | null | undefined): void {
  const id = value ? String(value) : ''
  const opportunity = id
    ? opportunities.value.find((item) => item.id === id) ?? (props.opportunity?.id === id ? props.opportunity : undefined)
    : undefined
  form.value.opportunityId = id
  form.value.opportunityName = String(opportunity?.name ?? '')
  form.value.accountId = String(opportunity?.accountId ?? '')
  form.value.accountName = String(opportunity?.accountName ?? '')
  form.value.contactId = String(opportunity?.contactId ?? '')
  form.value.contactName = String(opportunity?.contactName ?? '')
}

function addTreatment(): void {
  const treatment = treatments.value.find((item) => item.id === newTreatmentId.value)
  if (!treatment) return
  lines.value.push({
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    treatmentId: treatment.id,
    name: String(treatment.name ?? ''),
    qty: 1,
    price: Number(treatment.price ?? 0),
  })
  newTreatmentId.value = ''
}

function addBlank(): void {
  lines.value.push({
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    treatmentId: '',
    name: '',
    qty: 1,
    price: 0,
  })
}

function removeLine(key: string): void {
  lines.value = lines.value.filter((line) => line.key !== key)
}

async function save(): Promise<void> {
  error.value = ''
  if (!form.value.name.trim()) {
    error.value = 'El nombre del presupuesto es obligatorio.'
    return
  }
  if (!form.value.opportunityId) {
    error.value = 'Selecciona la oportunidad a la que pertenece el presupuesto.'
    return
  }
  if (!lines.value.length) {
    error.value = 'Añade al menos un tratamiento.'
    return
  }
  if (lines.value.some((line) => !line.name.trim() || Number(line.qty) <= 0)) {
    error.value = 'Revisa las líneas: nombre y cantidad son obligatorios.'
    return
  }
  saving.value = true
  const payload = {
    name: form.value.name.trim(),
    status: form.value.status,
    validUntil: form.value.validUntil || null,
    taxRate: Number(form.value.taxRate || 0),
    subtotal: Number(subtotal.value.toFixed(2)),
    taxAmount: Number(taxAmount.value.toFixed(2)),
    total: Number(total.value.toFixed(2)),
    subtotalCurrency: 'CRC',
    taxAmountCurrency: 'CRC',
    totalCurrency: 'CRC',
    items: JSON.stringify(
      lines.value.map((line) => ({
        treatmentId: line.treatmentId,
        name: line.name.trim(),
        qty: Number(line.qty),
        price: Number(line.price),
      })),
    ),
    opportunityId: form.value.opportunityId,
    opportunityName: form.value.opportunityName,
    accountId: form.value.accountId || null,
    accountName: form.value.accountName || null,
    contactId: form.value.contactId || null,
    contactName: form.value.contactName || null,
    notes: form.value.notes || null,
    assignedUserId: auth.user?.id ?? null,
    teamsIds: (auth.user as unknown as { teamsIds?: string[] } | null)?.teamsIds ?? [],
  }
  try {
    if (isEdit.value) {
      await request(`/CCQuote/${props.quote?.id}`, { method: 'PATCH', body: payload })
    } else {
      await request('/CCQuote', { method: 'POST', body: payload })
    }
    ui.toast('success', isEdit.value ? 'Presupuesto actualizado' : 'Presupuesto creado')
    emit('saved')
    open.value = false
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo guardar el presupuesto.'
  } finally {
    saving.value = false
  }
}

function printQuote(): void {
  if (!props.quote?.id) return
  window.location.assign(`/quotes/${props.quote.id}/print`)
}

async function remove(): Promise<void> {
  if (!props.quote?.id) return
  const confirmed = await ui.askConfirm({
    title: 'Eliminar presupuesto',
    message: `Se eliminará «${props.quote.name}».`,
    confirmLabel: 'Eliminar presupuesto',
  })
  if (!confirmed) return
  try {
    await request(`/CCQuote/${props.quote.id}`, { method: 'DELETE' })
    ui.toast('success', 'Presupuesto eliminado')
    emit('deleted')
    open.value = false
  } catch (err) {
    ui.toast('error', 'No se pudo eliminar', err instanceof Error ? err.message : undefined)
  }
}

watch(
  () => [open.value, props.quote?.id],
  () => {
    if (open.value) void load()
  },
  { immediate: true },
)
</script>

<template>
  <AppDrawer v-model:open="open" :title="isEdit ? 'Editar presupuesto' : 'Nuevo presupuesto'" width="2xl">
    <div v-if="loading" class="flex items-center justify-center py-16">
      <span class="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
    </div>

    <form v-else class="space-y-5" @submit.prevent="save">
      <div v-if="error" class="rounded-xl border border-danger/20 bg-danger/[0.05] px-3.5 py-3 text-[12px] text-danger">
        {{ error }}
      </div>

      <section class="rounded-xl border border-line p-4">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AppField label="Nombre" required class="sm:col-span-2">
            <AppInput v-model="form.name" placeholder="Ej. Presupuesto implantes" />
          </AppField>
          <AppField label="Oportunidad" required class="sm:col-span-2">
            <AppSelect v-model="form.opportunityId" @update:model-value="applyOpportunity">
              <option value="">Selecciona una oportunidad</option>
              <option v-for="opportunity in opportunities" :key="opportunity.id" :value="opportunity.id">
                {{ opportunity.name }}{{ opportunity.accountName ? ` · ${opportunity.accountName}` : '' }}
              </option>
            </AppSelect>
          </AppField>
          <AppField label="Estado">
            <AppSelect v-model="form.status">
              <option v-for="(meta, key) in QUOTE_STATUS" :key="key" :value="key">{{ meta.label }}</option>
            </AppSelect>
          </AppField>
          <AppField label="Válido hasta">
            <AppInput v-model="form.validUntil" type="date" />
          </AppField>
          <AppField label="IVA (%)">
            <AppInput v-model="form.taxRate" type="number" min="0" max="100" step="0.01" />
          </AppField>
        </div>
      </section>

      <section class="rounded-xl border border-line p-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-[12px] font-semibold">Tratamientos</h3>
          <div class="flex items-center gap-1.5">
            <AppSelect v-model="newTreatmentId" class="!h-9 w-[230px] text-[12px]">
              <option value="">Añadir tratamiento…</option>
              <option v-for="treatment in treatments" :key="treatment.id" :value="treatment.id">
                {{ treatment.name }} · {{ currency(treatment.price) }}
              </option>
            </AppSelect>
            <AppButton size="sm" variant="secondary" aria-label="Añadir tratamiento" :disabled="!newTreatmentId" @click="addTreatment">
              <Plus class="h-3.5 w-3.5" />
            </AppButton>
          </div>
        </div>

        <div v-if="lines.length" class="space-y-2">
          <div v-for="line in lines" :key="line.key" class="grid grid-cols-12 items-end gap-2 rounded-lg bg-surface-2/50 p-2">
            <div class="col-span-5">
              <AppInput v-model="line.name" placeholder="Tratamiento" class="!h-9 text-[12px]" />
            </div>
            <div class="col-span-2">
              <AppInput v-model.number="line.qty" type="number" min="1" step="1" class="!h-9 text-[12px]" />
            </div>
            <div class="col-span-2">
              <div class="relative">
                <AppInput v-model.number="line.price" type="number" min="0" step="1" class="!h-9 pr-7 text-[12px]" />
                <span class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-faint">{{ APP_CURRENCY_SYMBOL }}</span>
              </div>
            </div>
            <div class="col-span-2 pb-2 text-right text-[12px] font-medium tabular-nums">{{ currency(line.qty * line.price) }}</div>
            <div class="col-span-1 flex justify-end">
              <button type="button" class="rounded-lg p-1.5 text-faint hover:bg-surface hover:text-danger" aria-label="Quitar línea" @click="removeLine(line.key)">
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
        <p v-else class="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[12px] text-faint">
          Añade un tratamiento del catálogo o una línea manual.
        </p>
        <button type="button" class="mt-2 text-[11px] font-medium text-brand hover:underline" @click="addBlank">
          + Añadir línea manual
        </button>
      </section>

      <section class="rounded-xl border border-line p-4">
        <div class="ml-auto w-full max-w-xs space-y-1.5 text-[12px]">
          <div class="flex justify-between text-muted"><span>Subtotal</span><span class="tabular-nums">{{ currency(subtotal) }}</span></div>
          <div class="flex justify-between text-muted"><span>IVA ({{ form.taxRate }}%)</span><span class="tabular-nums">{{ currency(taxAmount) }}</span></div>
          <div class="flex justify-between border-t border-line pt-1.5 font-semibold"><span>Total</span><span class="tabular-nums">{{ currency(total) }}</span></div>
        </div>
        <AppField label="Notas" class="mt-4">
          <AppTextarea v-model="form.notes" :rows="2" placeholder="Condiciones, financiación, observaciones…" />
        </AppField>
      </section>
    </form>

    <template #footer>
      <AppButton v-if="isEdit" variant="secondary" :disabled="saving" @click="printQuote">
        <Printer class="h-4 w-4" />
        PDF
      </AppButton>
      <AppButton v-if="isEdit" variant="ghost" class="mr-auto !text-danger" :disabled="saving" @click="remove">
        <Trash2 class="h-4 w-4" />
        Eliminar
      </AppButton>
      <AppButton variant="secondary" :disabled="saving" @click="open = false">Cancelar</AppButton>
      <AppButton variant="primary" :loading="saving" :disabled="loading" @click="save">
        {{ isEdit ? 'Guardar cambios' : 'Crear presupuesto' }}
      </AppButton>
    </template>
  </AppDrawer>
</template>
