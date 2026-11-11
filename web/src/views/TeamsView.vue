<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Plus, Search, Trash2, UsersRound } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppDrawer from '@/components/ui/AppDrawer.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import { createRecord, deleteRecord, getList, getRecord } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useReferenceStore } from '@/stores/reference'
import { useUiStore } from '@/stores/ui'
import type { EntityRecord } from '@/types/espocrm'

const auth = useAuthStore()
const reference = useReferenceStore()
const ui = useUiStore()

const teams = ref<EntityRecord[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const createOpen = ref(false)
const newName = ref('')
const creating = ref(false)
const drawerOpen = ref(false)
const selected = ref<EntityRecord | null>(null)

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return teams.value
  return teams.value.filter((team) => String(team.name ?? '').toLowerCase().includes(term))
})

function membersOf(teamId: string): EntityRecord[] {
  return reference.users.filter((user) => ((user.teamsIds as string[] | undefined) ?? []).includes(teamId))
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const data = await getList('Team', { maxSize: 100, orderBy: 'name', order: 'asc' })
    teams.value = data.list
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudieron cargar los equipos.'
  } finally {
    loading.value = false
  }
}

async function create(): Promise<void> {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    await createRecord('Team', { name: newName.value.trim() })
    ui.toast('success', 'Equipo creado')
    createOpen.value = false
    newName.value = ''
    await load()
    await reference.loadTeams(true)
  } catch (err) {
    ui.toast('error', 'No se pudo crear el equipo', err instanceof Error ? err.message : undefined)
  } finally {
    creating.value = false
  }
}

async function openTeam(team: EntityRecord): Promise<void> {
  selected.value = team
  drawerOpen.value = true
  try {
    selected.value = await getRecord<EntityRecord>('Team', team.id)
  } catch {
    /* use list record */
  }
}

async function removeTeam(): Promise<void> {
  if (!selected.value) return
  const confirmed = await ui.askConfirm({
    title: 'Eliminar equipo',
    message: `Se eliminará «${selected.value.name}». Los usuarios no se eliminarán.`,
    confirmLabel: 'Eliminar equipo',
  })
  if (!confirmed) return
  try {
    await deleteRecord('Team', selected.value.id)
    ui.toast('success', 'Equipo eliminado')
    drawerOpen.value = false
    await load()
    await reference.loadTeams(true)
  } catch (err) {
    ui.toast('error', 'No se pudo eliminar', err instanceof Error ? err.message : undefined)
  }
}

onMounted(() => {
  void reference.loadUsers()
  void load()
})
</script>

<template>
  <div class="space-y-5">
    <PageHeader title="Equipos" :subtitle="`${teams.length} equipos · base de la asignación y visibilidad`" eyebrow="Gestión">
      <template #actions>
        <AppButton v-if="auth.can('Team', 'create')" variant="primary" size="sm" @click="createOpen = true">
          <Plus class="h-4 w-4" />
          Nuevo equipo
        </AppButton>
      </template>
    </PageHeader>

    <div class="card overflow-hidden">
      <div class="border-b border-line px-4 py-3.5">
        <div class="relative w-full sm:max-w-sm">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <AppInput v-model="search" class="!h-9 pl-9 text-[13px]" placeholder="Buscar equipo…" />
        </div>
      </div>

      <div v-if="error" class="border-b border-line bg-danger/[0.04] px-4 py-3 text-[12px] text-danger">{{ error }}</div>

      <div v-if="loading" class="space-y-2 p-4">
        <div v-for="index in 4" :key="index" class="skeleton h-14" />
      </div>

      <div v-else-if="filtered.length" class="divide-y divide-line">
        <button
          v-for="team in filtered"
          :key="team.id"
          type="button"
          class="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface-2/60"
          @click="openTeam(team)"
        >
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <UsersRound class="h-4 w-4" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[13px] font-medium">{{ team.name }}</p>
            <p class="text-[11px] text-faint">Creado el {{ formatDate(team.createdAt) }}</p>
          </div>
          <div class="flex -space-x-1.5">
            <AppAvatar
              v-for="member in membersOf(team.id).slice(0, 4)"
              :key="member.id"
              :name="String(member.name ?? member.userName)"
              size="xs"
            />
          </div>
          <AppBadge tone="neutral" size="sm">{{ membersOf(team.id).length }} miembros</AppBadge>
        </button>
      </div>
      <AppEmpty v-else title="Sin equipos" description="Crea un equipo para organizar a tu equipo comercial." />
    </div>

    <AppModal v-model:open="createOpen" title="Nuevo equipo" size="sm">
      <div>
        <label class="field-label">Nombre del equipo</label>
        <AppInput v-model="newName" placeholder="Ej. Comercial" @keydown.enter="create" />
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="createOpen = false">Cancelar</AppButton>
        <AppButton variant="primary" :loading="creating" :disabled="!newName.trim()" @click="create">Crear equipo</AppButton>
      </template>
    </AppModal>

    <AppDrawer v-model:open="drawerOpen" :title="String(selected?.name ?? 'Equipo')" width="md">
      <div v-if="selected" class="space-y-5">
        <div class="flex items-center gap-3">
          <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <UsersRound class="h-5 w-5" />
          </span>
          <div>
            <p class="text-[15px] font-semibold">{{ selected.name }}</p>
            <p class="text-[11px] text-faint">Creado el {{ formatDate(selected.createdAt) }}</p>
          </div>
        </div>

        <div>
          <p class="mb-2 text-[12px] font-semibold">Miembros ({{ membersOf(selected.id).length }})</p>
          <div v-if="membersOf(selected.id).length" class="divide-y divide-line rounded-xl border border-line">
            <div v-for="member in membersOf(selected.id)" :key="member.id" class="flex items-center gap-2.5 px-3 py-2.5">
              <AppAvatar :name="String(member.name ?? member.userName)" size="sm" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-[12px] font-medium">{{ member.name || member.userName }}</p>
                <p class="text-[10px] text-faint">{{ member.emailAddress || member.userName }}</p>
              </div>
            </div>
          </div>
          <p v-else class="rounded-xl border border-line bg-surface-2 px-3 py-4 text-center text-[12px] text-faint">
            Este equipo todavía no tiene miembros. Asígnalos desde Usuarios.
          </p>
        </div>

        <p class="text-[11px] leading-relaxed text-muted">
          La visibilidad «Equipo» de los roles se aplica a los registros asignados a los miembros de este equipo.
        </p>
      </div>

      <template #footer>
        <AppButton v-if="auth.can('Team', 'delete')" variant="ghost" class="!text-danger" @click="removeTeam">
          <Trash2 class="h-4 w-4" />
          Eliminar
        </AppButton>
        <AppButton variant="secondary" @click="drawerOpen = false">Cerrar</AppButton>
      </template>
    </AppDrawer>
  </div>
</template>
