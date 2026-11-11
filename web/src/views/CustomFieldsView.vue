<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ExternalLink, SlidersHorizontal } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import { useMetadataStore } from '@/stores/metadata'
import { fieldLabel } from '@/lib/fieldLabels'
import { humanize } from '@/lib/format'
import { ENTITY_LABELS } from '@/lib/constants'
import type { FieldDef } from '@/types/espocrm'
import { ADMIN_URL } from '@/lib/config'

const metadata = useMetadataStore()
const entity = ref('Contact')
const loading = ref(true)
const adminUrl = ADMIN_URL

const entities = ['Contact', 'Account', 'Lead', 'Opportunity', 'Task', 'Call', 'Meeting']

const fields = computed(() => {
  const defs = metadata.entityDefs[entity.value]?.fields ?? {}
  return Object.entries(defs)
    .filter(([, def]) => def.isCustom)
    .map(([name, def]) => ({ name, def: def as FieldDef }))
})

const typeLabel = (type: string): string => {
  const map: Record<string, string> = {
    varchar: 'Texto',
    text: 'Texto largo',
    email: 'Email',
    phone: 'Teléfono',
    url: 'URL',
    enum: 'Lista',
    bool: 'Sí/No',
    date: 'Fecha',
    datetime: 'Fecha y hora',
    int: 'Número entero',
    float: 'Decimal',
    currency: 'Importe',
    link: 'Relación',
    image: 'Imagen',
    attachmentMultiple: 'Adjuntos',
  }
  return map[type] ?? humanize(type)
}

function openAdmin(): void {
  window.open(adminUrl, '_blank', 'noopener')
}

onMounted(async () => {
  await metadata.load()
  loading.value = false
})
</script>

<template>
  <div class="space-y-5">
    <PageHeader title="Campos personalizados" subtitle="Extensiones de datos sin modificar el núcleo" eyebrow="Configuración">
      <template #actions>
        <AppButton variant="secondary" size="sm" @click="openAdmin">
          <ExternalLink class="h-4 w-4" />
          Entity Manager
        </AppButton>
      </template>
    </PageHeader>

    <div class="rounded-xl border border-line bg-surface px-4 py-3 text-[12px] leading-relaxed text-muted">
      <SlidersHorizontal class="mr-1.5 inline h-3.5 w-3.5 text-brand" />
      Los campos se crean y editan en la administración de MATMAX (Entity Manager). La SPA los lee
      dinámicamente desde la metadata y los muestra en formularios y fichas.
    </div>

    <div class="w-[220px]">
      <AppSelect v-model="entity">
        <option v-for="item in entities" :key="item" :value="item">{{ ENTITY_LABELS[item] ?? item }}</option>
      </AppSelect>
    </div>

    <div class="card overflow-hidden">
      <div v-if="loading" class="space-y-2 p-4">
        <div v-for="index in 4" :key="index" class="skeleton h-12" />
      </div>
      <div v-else-if="fields.length" class="overflow-x-auto">
        <table class="w-full min-w-[640px] text-left">
          <thead>
            <tr class="border-b border-line text-[10px] uppercase tracking-wide text-faint">
              <th class="px-5 py-3 font-semibold">Campo</th>
              <th class="px-3 py-3 font-semibold">Nombre técnico</th>
              <th class="px-3 py-3 font-semibold">Tipo</th>
              <th class="px-3 py-3 font-semibold">Opciones</th>
              <th class="px-5 py-3 text-right font-semibold">Obligatorio</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in fields" :key="item.name" class="border-b border-line/70 last:border-0">
              <td class="px-5 py-3 text-[12px] font-medium">{{ fieldLabel(item.name, item.def.label as string | undefined) }}</td>
              <td class="px-3 py-3 font-mono text-[11px] text-faint">{{ item.name }}</td>
              <td class="px-3 py-3 text-[12px] text-muted">{{ typeLabel(item.def.type) }}</td>
              <td class="px-3 py-3 text-[11px] text-muted">{{ item.def.options?.join(', ') || '—' }}</td>
              <td class="px-5 py-3 text-right">
                <AppBadge :tone="item.def.required ? 'warning' : 'neutral'" size="sm">
                  {{ item.def.required ? 'Sí' : 'No' }}
                </AppBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppEmpty
        v-else
        title="Sin campos personalizados"
        description="Este módulo usa únicamente los campos estándar de MATMAX."
      />
    </div>
  </div>
</template>
