<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowUpRight, CalendarDays, Plus, TrendingUp } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import RecordForm from './RecordForm.vue'
import { getList } from '@/lib/api'
import { currency, formatDate } from '@/lib/format'
import { OPPORTUNITY_CONFIG, stageMeta } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth'
import type { EntityRecord } from '@/types/espocrm'

const props = withDefaults(
  defineProps<{
    accountId?: string
    contactId?: string
    title?: string
    canCreate?: boolean
  }>(),
  { accountId: '', contactId: '', title: 'Oportunidades', canCreate: false },
)

const router = useRouter()
const auth = useAuthStore()
const loading = ref(true)
const items = ref<EntityRecord[]>([])
const formOpen = ref(false)

const initial = computed(() => ({
  ...(props.accountId ? { account: props.accountId } : {}),
  ...(props.contactId ? { contact: props.contactId } : {}),
}))

const fields = computed(() => OPPORTUNITY_CONFIG.formFields)

async function load(): Promise<void> {
  loading.value = true
  try {
    const where = []
    if (props.accountId) where.push({ type: 'equals', field: 'accountId', value: props.accountId })
    if (props.contactId) where.push({ type: 'equals', field: 'contactId', value: props.contactId })
    const data = await getList('Opportunity', {
      maxSize: 50,
      orderBy: 'closeDate',
      order: 'desc',
      where: where.length ? where : undefined,
      select: 'name,stage,amount,closeDate,probability,assignedUserName,contactName',
    })
    items.value = data.list
  } finally {
    loading.value = false
  }
}

function onSaved(): void {
  void load()
}

onMounted(load)
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <p class="text-[12px] text-muted">{{ items.length }} oportunidades vinculadas</p>
      <AppButton
        v-if="canCreate && auth.can('Opportunity', 'create')"
        size="sm"
        variant="secondary"
        @click="formOpen = true"
      >
        <Plus class="h-3.5 w-3.5" />
        Añadir
      </AppButton>
    </div>

    <div v-if="loading" class="space-y-2">
      <div v-for="index in 3" :key="index" class="skeleton h-14" />
    </div>
    <div v-else-if="items.length" class="divide-y divide-line rounded-xl border border-line">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-surface-2"
        @click="router.push(`/opportunities/${item.id}`)"
      >
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
          <TrendingUp class="h-4 w-4" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-[12px] font-medium">{{ item.name }}</p>
          <p class="mt-0.5 flex items-center gap-1.5 text-[10px] text-faint">
            <CalendarDays class="h-3 w-3" />
            {{ item.closeDate ? formatDate(item.closeDate) : 'Sin fecha' }}
            <span v-if="item.contactName">· {{ item.contactName }}</span>
          </p>
        </div>
        <span class="text-[12px] font-semibold tabular-nums">{{ currency(item.amount) }}</span>
        <AppBadge :tone="stageMeta(item.stage).tone" size="sm">{{ stageMeta(item.stage).label }}</AppBadge>
        <ArrowUpRight class="h-3.5 w-3.5 text-faint" />
      </button>
    </div>
    <AppEmpty v-else compact title="Sin oportunidades" description="Crea una oportunidad para empezar a medir el pipeline." />

    <RecordForm
      v-model:open="formOpen"
      entity="Opportunity"
      :fields="fields"
      :initial="initial"
      title="Nueva oportunidad"
      @saved="onSaved"
    />
  </div>
</template>
