<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowUpRight, Mail, Plus } from 'lucide-vue-next'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import RecordForm from './RecordForm.vue'
import { getList } from '@/lib/api'
import { CONTACT_CONFIG } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth'
import type { EntityRecord } from '@/types/espocrm'

const props = withDefaults(
  defineProps<{
    accountId: string
    canCreate?: boolean
  }>(),
  { canCreate: false },
)

const router = useRouter()
const auth = useAuthStore()
const loading = ref(true)
const items = ref<EntityRecord[]>([])
const formOpen = ref(false)
const fields = computed(() => CONTACT_CONFIG.formFields)
const initial = computed(() => ({ account: props.accountId }))

async function load(): Promise<void> {
  loading.value = true
  try {
    const data = await getList('Contact', {
      maxSize: 50,
      orderBy: 'name',
      order: 'asc',
      where: [{ type: 'equals', field: 'accountId', value: props.accountId }],
      select: 'name,title,emailAddress,phoneNumber,assignedUserName',
    })
    items.value = data.list
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <p class="text-[12px] text-muted">{{ items.length }} contactos vinculados</p>
      <AppButton
        v-if="canCreate && auth.can('Contact', 'create')"
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
        @click="router.push(`/contacts/${item.id}`)"
      >
        <AppAvatar :name="String(item.name ?? '')" size="sm" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-[12px] font-medium">{{ item.name }}</p>
          <p class="mt-0.5 truncate text-[10px] text-faint">{{ item.title || item.emailAddress || 'Sin cargo' }}</p>
        </div>
        <span v-if="item.emailAddress" class="hidden items-center gap-1 text-[10px] text-muted sm:flex">
          <Mail class="h-3 w-3" />
          {{ item.emailAddress }}
        </span>
        <ArrowUpRight class="h-3.5 w-3.5 text-faint" />
      </button>
    </div>
    <AppEmpty v-else compact title="Sin contactos" description="Añade el primer contacto de esta empresa." />

    <RecordForm
      v-model:open="formOpen"
      entity="Contact"
      :fields="fields"
      :initial="initial"
      title="Nuevo contacto"
      @saved="load"
    />
  </div>
</template>
