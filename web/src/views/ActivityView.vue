<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowUpRight, Building2, RefreshCw, Target, TrendingUp, Users } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import { getList } from '@/lib/api'
import { relativeTime } from '@/lib/format'
import type { EntityRecord } from '@/types/espocrm'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const items = ref<EntityRecord[]>([])
const filter = ref('all')

const scopeMeta: Record<string, { label: string; route: string; icon: typeof Users }> = {
  Contact: { label: 'Contacto', route: '/contacts', icon: Users },
  Account: { label: 'Empresa', route: '/accounts', icon: Building2 },
  Lead: { label: 'Lead', route: '/leads', icon: Target },
  Opportunity: { label: 'Oportunidad', route: '/opportunities', icon: TrendingUp },
}

const filtered = computed(() =>
  filter.value === 'all' ? items.value : items.value.filter((item) => item._scope === filter.value),
)

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const [contacts, accounts, leads, opportunities] = await Promise.all([
      getList('Contact', { maxSize: 8, orderBy: 'createdAt', order: 'desc', select: 'name,createdAt,assignedUserName' }),
      getList('Account', { maxSize: 8, orderBy: 'createdAt', order: 'desc', select: 'name,createdAt,assignedUserName' }),
      getList('Lead', { maxSize: 8, orderBy: 'createdAt', order: 'desc', select: 'name,createdAt,assignedUserName,status' }),
      getList('Opportunity', { maxSize: 8, orderBy: 'createdAt', order: 'desc', select: 'name,createdAt,assignedUserName,stage,amount,contactName' }),
    ])
    const merged: EntityRecord[] = [
      ...contacts.list.map((item) => ({ ...item, _scope: 'Contact' })),
      ...accounts.list.map((item) => ({ ...item, _scope: 'Account' })),
      ...leads.list.map((item) => ({ ...item, _scope: 'Lead' })),
      ...opportunities.list.map((item) => ({ ...item, _scope: 'Opportunity' })),
    ]
    items.value = merged.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar la actividad.'
  } finally {
    loading.value = false
  }
}

function open(item: EntityRecord): void {
  const meta = scopeMeta[String(item._scope)]
  if (meta) router.push(`${meta.route}/${item.id}`)
}

onMounted(load)
</script>

<template>
  <div class="space-y-5">
    <PageHeader title="Actividad reciente" subtitle="Últimos registros creados en el CRM" eyebrow="Inicio">
      <template #actions>
        <AppButton variant="secondary" size="sm" :loading="loading" @click="load">
          <RefreshCw class="h-4 w-4" />
          Actualizar
        </AppButton>
      </template>
    </PageHeader>

    <AppTabs
      v-model="filter"
      :tabs="[
        { key: 'all', label: 'Todo', count: items.length },
        { key: 'Contact', label: 'Contactos' },
        { key: 'Account', label: 'Empresas' },
        { key: 'Lead', label: 'Leads' },
        { key: 'Opportunity', label: 'Oportunidades' },
      ]"
    />

    <div class="card overflow-hidden">
      <div v-if="error" class="border-b border-line bg-danger/[0.04] px-4 py-3 text-[12px] text-danger">{{ error }}</div>
      <div v-if="loading" class="space-y-2 p-4">
        <div v-for="index in 6" :key="index" class="skeleton h-14" />
      </div>
      <div v-else-if="filtered.length" class="divide-y divide-line">
        <button
          v-for="item in filtered"
          :key="`${item._scope}-${item.id}`"
          type="button"
          class="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface-2/60"
          @click="open(item)"
        >
          <AppAvatar :name="String(item.name ?? '')" :size="'md'" :square="item._scope === 'Account'" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-[13px] font-medium">{{ item.name }}</p>
            <p class="mt-0.5 text-[11px] text-faint">
              {{ scopeMeta[String(item._scope)]?.label }} · {{ relativeTime(item.createdAt) }}
              <span v-if="item.assignedUserName"> · {{ item.assignedUserName }}</span>
              <span v-if="item.contactName"> · {{ item.contactName }}</span>
            </p>
          </div>
          <component :is="scopeMeta[String(item._scope)]?.icon" class="h-4 w-4 text-faint" />
          <ArrowUpRight class="h-3.5 w-3.5 text-faint" />
        </button>
      </div>
      <AppEmpty v-else title="Sin actividad" description="Aún no se han creado registros." />
    </div>
  </div>
</template>
