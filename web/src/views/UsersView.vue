<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Check, Search, ShieldCheck, UserRound } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppDrawer from '@/components/ui/AppDrawer.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import { getList, getRecord, updateRecord } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useReferenceStore } from '@/stores/reference'
import { useUiStore } from '@/stores/ui'
import type { EntityRecord } from '@/types/espocrm'

const router = useRouter()
const auth = useAuthStore()
const reference = useReferenceStore()
const ui = useUiStore()

const users = ref<EntityRecord[]>([])
const roles = ref<EntityRecord[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const drawerOpen = ref(false)
const selected = ref<EntityRecord | null>(null)
const saving = ref(false)

const form = reactive({
  firstName: '',
  lastName: '',
  emailAddress: '',
  isActive: true,
  teamsIds: [] as string[],
  rolesIds: [] as string[],
})

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return users.value
  return users.value.filter(
    (user) =>
      String(user.name ?? '').toLowerCase().includes(term) ||
      String(user.userName ?? '').toLowerCase().includes(term) ||
      String(user.emailAddress ?? '').toLowerCase().includes(term),
  )
})

function typeLabel(type: unknown): string {
  if (type === 'admin') return 'Administrador'
  if (type === 'api') return 'API'
  if (type === 'portal') return 'Portal'
  return 'Usuario'
}

function teamsOf(user: EntityRecord): string[] {
  const ids = (user.teamsIds as string[] | undefined) ?? []
  const names = (user.teamsNames as Record<string, string> | undefined) ?? {}
  return ids.map((id) => names[id] ?? reference.teamById(id)?.name ?? id)
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const data = await getList('User', {
      maxSize: 100,
      orderBy: 'userName',
      order: 'asc',
      select: 'name,userName,firstName,lastName,emailAddress,isActive,type,teamsIds,teamsNames,rolesIds,createdAt',
    })
    users.value = data.list
    if (auth.canRead('Role')) {
      const roleData = await getList('Role', { maxSize: 50, orderBy: 'name', order: 'asc', select: 'name' })
      roles.value = roleData.list
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudieron cargar los usuarios.'
  } finally {
    loading.value = false
  }
}

async function openUser(user: EntityRecord): Promise<void> {
  selected.value = user
  drawerOpen.value = true
  try {
    const full = await getRecord<EntityRecord>('User', user.id)
    selected.value = full
    form.firstName = String(full.firstName ?? '')
    form.lastName = String(full.lastName ?? '')
    form.emailAddress = String(full.emailAddress ?? '')
    form.isActive = Boolean(full.isActive)
    form.teamsIds = [...((full.teamsIds as string[] | undefined) ?? [])]
    form.rolesIds = [...((full.rolesIds as string[] | undefined) ?? [])]
  } catch {
    form.firstName = String(user.firstName ?? '')
    form.lastName = String(user.lastName ?? '')
    form.emailAddress = String(user.emailAddress ?? '')
    form.isActive = Boolean(user.isActive)
    form.teamsIds = [...((user.teamsIds as string[] | undefined) ?? [])]
    form.rolesIds = [...((user.rolesIds as string[] | undefined) ?? [])]
  }
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
}

async function save(): Promise<void> {
  if (!selected.value) return
  saving.value = true
  try {
    await updateRecord('User', selected.value.id, {
      firstName: form.firstName,
      lastName: form.lastName,
      emailAddress: form.emailAddress,
      isActive: form.isActive,
      teamsIds: form.teamsIds,
      ...(auth.canRead('Role') ? { rolesIds: form.rolesIds } : {}),
    })
    ui.toast('success', 'Usuario actualizado')
    drawerOpen.value = false
    await load()
  } catch (err) {
    ui.toast('error', 'No se pudo actualizar', err instanceof Error ? err.message : undefined)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void reference.loadTeams()
  void load()
})
</script>

<template>
  <div class="space-y-5">
    <PageHeader title="Usuarios" :subtitle="`${users.length} cuentas · permisos gestionados por MATMAX`" eyebrow="Gestión">
      <template #actions>
        <AppButton variant="secondary" size="sm" @click="router.push('/roles')">
          <ShieldCheck class="h-4 w-4" />
          Roles
        </AppButton>
      </template>
    </PageHeader>

    <div class="card overflow-hidden">
      <div class="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
        <div class="relative w-full sm:max-w-sm">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <AppInput v-model="search" class="!h-9 pl-9 text-[13px]" placeholder="Buscar usuario…" />
        </div>
        <AppBadge tone="brand" size="sm">ACL activa</AppBadge>
      </div>

      <div v-if="error" class="border-b border-line bg-danger/[0.04] px-4 py-3 text-[12px] text-danger">{{ error }}</div>

      <div v-if="loading" class="space-y-2 p-4">
        <div v-for="index in 5" :key="index" class="skeleton h-14" />
      </div>

      <div v-else-if="filtered.length" class="divide-y divide-line">
        <button
          v-for="user in filtered"
          :key="user.id"
          type="button"
          class="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface-2/60"
          @click="openUser(user)"
        >
          <AppAvatar :name="String(user.name ?? user.userName)" size="md" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-[13px] font-medium">{{ user.name || user.userName }}</p>
            <p class="text-[11px] text-faint">{{ user.userName }}<span v-if="user.emailAddress"> · {{ user.emailAddress }}</span></p>
          </div>
          <div class="hidden max-w-[220px] flex-wrap gap-1 md:flex">
            <AppBadge v-for="team in teamsOf(user).slice(0, 2)" :key="team" tone="neutral" size="sm">{{ team }}</AppBadge>
          </div>
          <AppBadge :tone="user.type === 'admin' ? 'violet' : 'neutral'" size="sm">{{ typeLabel(user.type) }}</AppBadge>
          <AppBadge :tone="user.isActive ? 'success' : 'danger'" size="sm" dot>
            {{ user.isActive ? 'Activo' : 'Inactivo' }}
          </AppBadge>
        </button>
      </div>
      <AppEmpty v-else title="Sin usuarios" description="No hay usuarios que coincidan." />
    </div>

    <AppDrawer v-model:open="drawerOpen" title="Usuario" width="lg">
      <div v-if="selected" class="space-y-6">
        <div class="flex items-center gap-3">
          <AppAvatar :name="String(selected.name ?? selected.userName)" size="xl" />
          <div>
            <p class="text-[16px] font-semibold">{{ selected.name || selected.userName }}</p>
            <p class="text-[12px] text-muted">{{ selected.userName }} · {{ typeLabel(selected.type) }}</p>
            <p class="mt-1 text-[11px] text-faint">Alta: {{ formatDate(selected.createdAt) }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="field-label">Nombre</label>
            <AppInput v-model="form.firstName" :disabled="!auth.isAdmin" />
          </div>
          <div>
            <label class="field-label">Apellidos</label>
            <AppInput v-model="form.lastName" :disabled="!auth.isAdmin" />
          </div>
          <div class="sm:col-span-2">
            <label class="field-label">Email</label>
            <AppInput v-model="form.emailAddress" type="email" :disabled="!auth.isAdmin" />
          </div>
        </div>

        <div class="flex items-center justify-between rounded-xl border border-line px-3.5 py-3">
          <div>
            <p class="text-[12px] font-medium">Cuenta activa</p>
            <p class="text-[11px] text-faint">Un usuario inactivo no puede iniciar sesión.</p>
          </div>
          <button
            type="button"
            :disabled="!auth.isAdmin"
            :class="['relative h-5 w-9 rounded-full transition-colors', form.isActive ? 'bg-brand' : 'bg-line', !auth.isAdmin && 'opacity-50']"
            @click="form.isActive = !form.isActive"
          >
            <span :class="['absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', form.isActive ? 'left-[18px]' : 'left-0.5']" />
          </button>
        </div>

        <div>
          <p class="mb-2 text-[12px] font-semibold">Equipos</p>
          <div class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            <button
              v-for="team in reference.teams"
              :key="team.id"
              type="button"
              :disabled="!auth.isAdmin"
              class="flex items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-left text-[12px] transition hover:bg-surface-2 disabled:opacity-60"
              @click="form.teamsIds = toggle(form.teamsIds, team.id)"
            >
              <span class="flex h-4 w-4 items-center justify-center rounded border border-line">
                <Check v-if="form.teamsIds.includes(team.id)" class="h-3 w-3 text-brand" />
              </span>
              {{ team.name }}
            </button>
          </div>
        </div>

        <div v-if="roles.length">
          <p class="mb-2 text-[12px] font-semibold">Roles</p>
          <div class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            <button
              v-for="role in roles"
              :key="role.id"
              type="button"
              :disabled="!auth.isAdmin"
              class="flex items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-left text-[12px] transition hover:bg-surface-2 disabled:opacity-60"
              @click="form.rolesIds = toggle(form.rolesIds, role.id)"
            >
              <span class="flex h-4 w-4 items-center justify-center rounded border border-line">
                <Check v-if="form.rolesIds.includes(role.id)" class="h-3 w-3 text-brand" />
              </span>
              {{ role.name }}
            </button>
          </div>
        </div>

        <p class="flex items-start gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[11px] leading-relaxed text-muted">
          <UserRound class="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
          Los permisos efectivos se calculan en el backend combinando roles, equipos y ACL. La interfaz no puede ampliarlos.
        </p>
      </div>

      <template #footer>
        <AppButton variant="secondary" @click="drawerOpen = false">Cerrar</AppButton>
        <AppButton v-if="auth.isAdmin" variant="primary" :loading="saving" @click="save">Guardar cambios</AppButton>
      </template>
    </AppDrawer>
  </div>
</template>
