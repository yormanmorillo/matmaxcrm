<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ExternalLink, Lock, Search, ShieldCheck } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppDrawer from '@/components/ui/AppDrawer.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import { getList, getRecord } from '@/lib/api'
import { humanize } from '@/lib/format'
import { ENTITY_LABELS } from '@/lib/constants'
import type { EntityRecord } from '@/types/espocrm'
import { ADMIN_URL } from '@/lib/config'

const roles = ref<EntityRecord[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const drawerOpen = ref(false)
const selected = ref<EntityRecord | null>(null)

const adminUrl = ADMIN_URL

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return roles.value
  return roles.value.filter((role) => String(role.name ?? '').toLowerCase().includes(term))
})

function assignmentLabel(value: unknown): string {
  if (value === 'all') return 'Todos'
  if (value === 'team') return 'Equipo'
  if (value === 'no') return 'Ninguno'
  return humanize(value)
}

function scopeRows(role: EntityRecord | null): { scope: string; label: string; acl: Record<string, string> }[] {
  const data = (role?.data as Record<string, Record<string, string>> | undefined) ?? {}
  return Object.entries(data).map(([scope, acl]) => ({
    scope,
    label: ENTITY_LABELS[scope] ?? humanize(scope),
    acl,
  }))
}

function aclTone(value: unknown): 'success' | 'warning' | 'danger' | 'neutral' {
  value = String(value ?? '')
  if (value === 'all' || value === 'yes') return 'success'
  if (value === 'team') return 'warning'
  if (value === 'own') return 'neutral'
  return 'danger'
}

function aclLabel(value: unknown): string {
  value = String(value ?? '')
  if (value === 'all') return 'Todo'
  if (value === 'team') return 'Equipo'
  if (value === 'own') return 'Propio'
  if (value === 'yes') return 'Sí'
  if (value === 'no') return 'No'
  return humanize(value)
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const data = await getList('Role', { maxSize: 100, orderBy: 'name', order: 'asc' })
    roles.value = data.list
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudieron cargar los roles.'
  } finally {
    loading.value = false
  }
}

async function openRole(role: EntityRecord): Promise<void> {
  selected.value = role
  drawerOpen.value = true
  try {
    selected.value = await getRecord<EntityRecord>('Role', role.id)
  } catch {
    /* use list record */
  }
}

function openAdmin(): void {
  window.open(adminUrl, '_blank', 'noopener')
}

onMounted(load)
</script>

<template>
  <div class="space-y-5">
    <PageHeader title="Roles y permisos" subtitle="Control de acceso por módulo y registro" eyebrow="Configuración">
      <template #actions>
        <AppButton variant="secondary" size="sm" @click="openAdmin">
          <ExternalLink class="h-4 w-4" />
          Editar en administración
        </AppButton>
      </template>
    </PageHeader>

    <div class="rounded-xl border border-line bg-surface px-4 py-3 text-[12px] leading-relaxed text-muted">
      <Lock class="mr-1.5 inline h-3.5 w-3.5 text-brand" />
      Los permisos son aplicados por el backend de MATMAX en cada petición. Esta vista refleja la configuración;
      la edición fina se realiza en la administración nativa para no alterar el núcleo.
    </div>

    <div class="card overflow-hidden">
      <div class="border-b border-line px-4 py-3.5">
        <div class="relative w-full sm:max-w-sm">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <AppInput v-model="search" class="!h-9 pl-9 text-[13px]" placeholder="Buscar rol…" />
        </div>
      </div>

      <div v-if="error" class="border-b border-line bg-danger/[0.04] px-4 py-3 text-[12px] text-danger">{{ error }}</div>

      <div v-if="loading" class="space-y-2 p-4">
        <div v-for="index in 4" :key="index" class="skeleton h-14" />
      </div>

      <div v-else-if="filtered.length" class="divide-y divide-line">
        <button
          v-for="role in filtered"
          :key="role.id"
          type="button"
          class="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface-2/60"
          @click="openRole(role)"
        >
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
            <ShieldCheck class="h-4 w-4" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[13px] font-medium">{{ role.name }}</p>
            <p class="text-[11px] text-faint">
              {{ scopeRows(role).length }} módulos · asignación {{ assignmentLabel(role.assignmentPermission).toLowerCase() }}
            </p>
          </div>
          <AppBadge tone="neutral" size="sm">{{ assignmentLabel(role.assignmentPermission) }}</AppBadge>
        </button>
      </div>
      <AppEmpty v-else title="Sin roles" description="Crea roles en la administración de MATMAX." />
    </div>

    <AppDrawer v-model:open="drawerOpen" :title="String(selected?.name ?? 'Rol')" width="xl">
      <div v-if="selected" class="space-y-4">
        <div class="flex items-center gap-3">
          <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
            <ShieldCheck class="h-5 w-5" />
          </span>
          <div>
            <p class="text-[15px] font-semibold">{{ selected.name }}</p>
            <p class="text-[11px] text-faint">Asignación: {{ assignmentLabel(selected.assignmentPermission) }}</p>
          </div>
        </div>

        <div class="overflow-x-auto rounded-xl border border-line">
          <table class="w-full min-w-[520px] text-left">
            <thead>
              <tr class="border-b border-line bg-surface-2/60 text-[10px] uppercase tracking-wide text-faint">
                <th class="px-3 py-2.5 font-semibold">Módulo</th>
                <th class="px-2.5 py-2.5 font-semibold">Crear</th>
                <th class="px-2.5 py-2.5 font-semibold">Ver</th>
                <th class="px-2.5 py-2.5 font-semibold">Editar</th>
                <th class="px-2.5 py-2.5 font-semibold">Eliminar</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in scopeRows(selected)" :key="row.scope" class="border-b border-line/70 last:border-0">
                <td class="px-3 py-2.5 text-[12px] font-medium">{{ row.label }}</td>
                <td class="px-2.5 py-2.5">
                  <AppBadge :tone="aclTone(row.acl.create)" size="sm">{{ aclLabel(row.acl.create) }}</AppBadge>
                </td>
                <td class="px-2.5 py-2.5">
                  <AppBadge :tone="aclTone(row.acl.read)" size="sm">{{ aclLabel(row.acl.read) }}</AppBadge>
                </td>
                <td class="px-2.5 py-2.5">
                  <AppBadge :tone="aclTone(row.acl.edit)" size="sm">{{ aclLabel(row.acl.edit) }}</AppBadge>
                </td>
                <td class="px-2.5 py-2.5">
                  <AppBadge :tone="aclTone(row.acl.delete)" size="sm">{{ aclLabel(row.acl.delete) }}</AppBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="text-[11px] leading-relaxed text-muted">
          «Equipo» limita el acceso a registros asignados a usuarios del mismo equipo. «Propio» solo al propietario.
          Los administradores conservan acceso completo.
        </p>
      </div>

      <template #footer>
        <AppButton variant="secondary" @click="drawerOpen = false">Cerrar</AppButton>
        <AppButton variant="primary" @click="openAdmin">
          <ExternalLink class="h-4 w-4" />
          Abrir administración
        </AppButton>
      </template>
    </AppDrawer>
  </div>
</template>
