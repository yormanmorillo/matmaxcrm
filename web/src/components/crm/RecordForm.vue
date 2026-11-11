<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { AlertCircle } from 'lucide-vue-next'
import AppDrawer from '@/components/ui/AppDrawer.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppField from '@/components/ui/AppField.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import EntitySelect from './EntitySelect.vue'
import { useMetadataStore } from '@/stores/metadata'
import { createRecord, getRecord, updateRecord } from '@/lib/api'
import { useUiStore } from '@/stores/ui'
import { currency, humanize, localToUtc, toInputDate, toInputDateTime } from '@/lib/format'
import { fieldLabel, fieldPlaceholder } from '@/lib/fieldLabels'
import { ENTITY_LABELS, optionLabel, priorityMeta, stageMeta, statusMeta } from '@/lib/constants'
import type { EntityRecord, FieldDef } from '@/types/espocrm'
import { APP_CURRENCY_SYMBOL } from '@/lib/config'

const props = withDefaults(
  defineProps<{
    entity: string
    fields: string[]
    record?: EntityRecord | null
    initial?: Record<string, unknown>
    title?: string
  }>(),
  { record: null, initial: () => ({}), title: '' },
)

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ (event: 'saved', record: EntityRecord): void }>()

const metadata = useMetadataStore()
const ui = useUiStore()

const form = reactive<Record<string, any>>({})
const errors = reactive<Record<string, string>>({})
const saving = ref(false)
const loadingRecord = ref(false)
const apiError = ref('')
let initializeSeq = 0

const entityLabel = computed(() => ENTITY_LABELS[props.entity] ?? props.entity)
const drawerTitle = computed(() => {
  if (props.title) return props.title
  return props.record?.id ? `Editar ${entityLabel.value.toLowerCase()}` : `Nuevo ${entityLabel.value.toLowerCase()}`
})

const visibleFields = computed(() =>
  props.fields.filter((name) => Boolean(metadata.entityDefs[props.entity]?.fields?.[name])),
)

const recordSelect = computed(() => {
  const fields = new Set<string>(['name', 'createdAt', 'modifiedAt', 'parentId', 'parentType'])
  for (const name of visibleFields.value) {
    const def = definition(name)
    fields.add(name)
    if (def && ['link', 'linkOne', 'linkParent'].includes(def.type)) {
      fields.add(`${name}Id`)
      fields.add(`${name}Name`)
    }
  }
  return [...fields].join(',')
})

const linkTargets: Record<string, string> = {
  account: 'Account',
  contact: 'Contact',
  assignedUser: 'User',
  createdBy: 'User',
  modifiedBy: 'User',
  teams: 'Team',
  campaign: 'Campaign',
  originalLead: 'Lead',
}

function definition(name: string): FieldDef | null {
  return metadata.entityDefs[props.entity]?.fields?.[name] ?? null
}

function f(name: string): FieldDef {
  return definition(name) ?? ({ type: 'varchar' } as FieldDef)
}

function targetEntity(name: string, def: FieldDef): string {
  return String(def.entity ?? linkTargets[name] ?? '')
}

function isWide(name: string, def: FieldDef): boolean {
  return ['text', 'address'].includes(def.type) || ['description', 'addressStreet'].includes(name)
}

function isDisabled(name: string): boolean {
  return props.entity === 'Contact' && name === 'title' && !form.account
}

function fieldHint(name: string): string {
  if (props.entity === 'Contact' && name === 'title' && !form.account) {
    return 'Selecciona una empresa para guardar el puesto del contacto.'
  }
  return ''
}

function displayValue(name: string): string {
  const value = props.record?.[`${name}Name`]
  return value ? String(value) : ''
}

function optionText(name: string, def: FieldDef, option: string): string {
  if (name === 'stage') return stageMeta(option).label
  if (['status', 'priority'].includes(name)) {
    return name === 'priority' ? priorityMeta(option).label : statusMeta(props.entity, option).label
  }
  return optionLabel(name, option) || humanize(option)
}

function setFormFromRecord(record: EntityRecord): void {
  const next: Record<string, unknown> = { ...props.initial }
  for (const name of visibleFields.value) {
    const def = definition(name)
    if (!def) continue
    if (['link', 'linkOne', 'linkParent'].includes(def.type)) {
      const link = record[name] as { id?: string } | null | undefined
      next[name] = record[`${name}Id`] ?? link?.id ?? next[name] ?? ''
    } else if (['date'].includes(def.type)) {
      next[name] = toInputDate(record[name] ?? next[name])
    } else if (['datetime', 'datetimeOptional'].includes(def.type)) {
      next[name] = toInputDateTime(record[name] ?? next[name])
    } else if (record[name] !== undefined) {
      next[name] = record[name]
    }
  }
  for (const name of visibleFields.value) {
    if (next[name] === undefined) {
      next[name] = f(name).type === 'bool' ? false : ''
    }
  }
  if (['Task', 'Call', 'Meeting'].includes(props.entity)) {
    const parentId = record.parentId ? String(record.parentId) : ''
    if (record.parentType === 'Contact' && parentId && !next.contact) next.contact = parentId
    if (record.parentType === 'Account' && parentId && !next.account) next.account = parentId
  }
  if (!props.record?.id) {
    if (props.entity === 'Contact' && !next.addressCountry) next.addressCountry = 'Costa Rica'
    if (props.entity === 'Account' && !next.billingAddressCountry) next.billingAddressCountry = 'Costa Rica'
    const entityDefaults: Record<string, Record<string, string>> = {
      Task: { status: 'Not Started', priority: 'Normal' },
      Call: { status: 'Planned' },
      Meeting: { status: 'Planned' },
      Lead: { status: 'New' },
      Opportunity: { stage: 'Prospecting' },
    }
    for (const name of visibleFields.value) {
      if (next[name] !== '' && next[name] !== null && next[name] !== undefined) continue
      const metaDefault = f(name).default
      const fallback = entityDefaults[props.entity]?.[name]
      if (typeof metaDefault === 'string' && metaDefault) next[name] = metaDefault
      else if (fallback) next[name] = fallback
    }
  }
  Object.keys(form).forEach((key) => delete form[key])
  Object.assign(form, next)
}

async function initialize(): Promise<void> {
  if (!open.value) return
  const seq = ++initializeSeq
  apiError.value = ''
  Object.keys(errors).forEach((key) => delete errors[key])
  loadingRecord.value = true
  try {
    await metadata.load()
    if (seq !== initializeSeq) return
    const record = props.record?.id
      ? await getRecord<EntityRecord>(props.entity, props.record.id, { select: recordSelect.value })
      : ({} as EntityRecord)
    if (seq !== initializeSeq) return
    setFormFromRecord(record)
  } catch (error) {
    if (seq === initializeSeq) {
      apiError.value = error instanceof Error ? error.message : 'No se pudo cargar el registro.'
    }
  } finally {
    if (seq === initializeSeq) loadingRecord.value = false
  }
}

watch(
  () => [open.value, props.record?.id],
  () => {
    if (open.value) void initialize()
  },
  { immediate: true },
)

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key])
  let valid = true
  for (const name of visibleFields.value) {
    const def = definition(name)
    if (!def) continue
    const value = form[name]
    const empty = value === undefined || value === null || value === ''
    if (def.required && empty) {
      errors[name] = 'Este campo es obligatorio.'
      valid = false
      continue
    }
    if (name === 'emailAddress' && !empty && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
      errors[name] = 'Introduce un email válido.'
      valid = false
    }
    if (def.type === 'currency' && !empty && Number.isNaN(Number(value))) {
      errors[name] = 'Introduce un importe válido.'
      valid = false
    }
  }
  return valid
}

function payload(): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const name of visibleFields.value) {
    const def = definition(name)
    if (!def) continue
    let value = form[name]
    if (typeof value === 'string') value = value.trim()
    if (value === '') value = null

    if (props.entity === 'Contact' && name === 'title' && !form.account) {
      continue
    }
    if (['link', 'linkOne', 'linkParent'].includes(def.type)) {
      data[`${name}Id`] = value || null
    } else if (['datetime', 'datetimeOptional'].includes(def.type) && value) {
      data[name] = localToUtc(value)
    } else {
      data[name] = value
    }
  }
  if (['Task', 'Call', 'Meeting'].includes(props.entity)) {
    // En EspoCRM 10 account/contact de una actividad son enlaces derivados de solo lectura.
    // El vínculo real se guarda como parentId + parentType.
    delete data.accountId
    delete data.contactId
    if (form.contact) {
      data.parentId = String(form.contact)
      data.parentType = 'Contact'
    } else if (form.account) {
      data.parentId = String(form.account)
      data.parentType = 'Account'
    } else {
      data.parentId = null
      data.parentType = null
    }
  }
  return data
}

async function save(): Promise<void> {
  apiError.value = ''
  if (!validate()) return
  saving.value = true
  try {
    const body = payload()
    const saved = props.record?.id
      ? await updateRecord<EntityRecord>(props.entity, props.record.id, body)
      : await createRecord<EntityRecord>(props.entity, body)
    ui.toast('success', props.record?.id ? `${entityLabel.value} actualizado` : `${entityLabel.value} creado`)
    emit('saved', saved)
    open.value = false
  } catch (error) {
    apiError.value = error instanceof Error ? error.message : 'No se pudo guardar el registro.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppDrawer v-model:open="open" :title="drawerTitle" width="lg">
    <div v-if="loadingRecord" class="flex items-center justify-center py-24">
      <span class="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand" />
    </div>

    <form v-else id="record-form" class="space-y-5" @submit.prevent="save">
      <div
        v-if="apiError"
        class="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger/[0.06] px-3.5 py-3 text-[12px] text-danger"
        role="alert"
      >
        <AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
        <span class="leading-relaxed">{{ apiError }}</span>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          v-for="name in visibleFields"
          :key="name"
          :class="isWide(name, f(name)) && 'sm:col-span-2'"
        >
          <AppField
            :label="fieldLabel(name, f(name).label as string | undefined)"
            :required="definition(name)?.required"
            :error="errors[name]"
            :hint="fieldHint(name)"
          >
            <template v-if="f(name).type === 'text'">
              <AppTextarea
                v-model="form[name]"
                :rows="4"
                :placeholder="fieldPlaceholder(name)"
                :invalid="Boolean(errors[name])"
              />
            </template>

            <template
              v-else-if="
                ['enum', 'foreign'].includes(f(name).type)
              "
            >
              <AppSelect v-model="form[name]" :invalid="Boolean(errors[name])" placeholder="Selecciona…">
                <option v-for="option in f(name).options ?? []" :key="option" :value="option">
                  {{ optionText(name, f(name), option) }}
                </option>
              </AppSelect>
            </template>

            <template
              v-else-if="['link', 'linkOne', 'linkParent'].includes(f(name).type)"
            >
              <EntitySelect
                v-model="form[name]"
                :entity="targetEntity(name, f(name))"
                :label-field="targetEntity(name, f(name)) === 'User' ? 'userName' : 'name'"
                :display-value="displayValue(name)"
                :placeholder="`Buscar ${fieldLabel(name).toLowerCase()}…`"
              />
            </template>

            <template v-else-if="f(name).type === 'bool'">
              <button
                type="button"
                class="flex h-10 w-full items-center justify-between rounded-xl border border-line bg-surface px-3.5 text-left text-sm"
                @click="form[name] = !form[name]"
              >
                <span :class="form[name] ? 'text-ink' : 'text-faint'">
                  {{ form[name] ? 'Sí' : 'No' }}
                </span>
                <span
                  :class="[
                    'relative h-5 w-9 rounded-full transition-colors',
                    form[name] ? 'bg-brand' : 'bg-line',
                  ]"
                >
                  <span
                    :class="[
                      'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
                      form[name] ? 'left-[18px]' : 'left-0.5',
                    ]"
                  />
                </span>
              </button>
            </template>

            <template v-else-if="f(name).type === 'currency'">
              <div class="relative">
                <AppInput
                  v-model="form[name]"
                  type="number"
                  min="0"
                  step="0.01"
                  class="pr-9"
                  placeholder="0"
                  :invalid="Boolean(errors[name])"
                />
                <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-faint">{{ APP_CURRENCY_SYMBOL }}</span>
              </div>
            </template>

            <template
              v-else-if="
                ['int', 'float'].includes(f(name).type)
              "
            >
              <AppInput
                v-model="form[name]"
                type="number"
                :min="name === 'probability' ? 0 : undefined"
                :max="name === 'probability' ? 100 : undefined"
                :placeholder="fieldPlaceholder(name)"
                :invalid="Boolean(errors[name])"
              />
            </template>

            <template v-else-if="f(name).type === 'date'">
              <AppInput v-model="form[name]" type="date" :invalid="Boolean(errors[name])" />
            </template>

            <template
              v-else-if="['datetime', 'datetimeOptional'].includes(f(name).type)"
            >
              <AppInput v-model="form[name]" type="datetime-local" :invalid="Boolean(errors[name])" />
            </template>

            <template v-else>
              <AppInput
                v-model="form[name]"
                :type="
                  f(name).type === 'email'
                    ? 'email'
                    : f(name).type === 'url'
                      ? 'url'
                      : 'text'
                "
                :placeholder="fieldPlaceholder(name)"
                :invalid="Boolean(errors[name])"
                :disabled="isDisabled(name)"
              />
            </template>
          </AppField>
        </div>
      </div>
    </form>

    <template #footer>
      <AppButton variant="secondary" @click="open = false">Cancelar</AppButton>
      <AppButton type="submit" form="record-form" variant="primary" :loading="saving" :disabled="loadingRecord">
        {{ record?.id ? 'Guardar cambios' : `Crear ${entityLabel.toLowerCase()}` }}
      </AppButton>
    </template>
  </AppDrawer>
</template>
