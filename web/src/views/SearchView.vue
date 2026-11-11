<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Building2, Search, Target, TrendingUp, Users } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import { request } from '@/lib/api'
import { cn } from '@/lib/cn'

interface Hit {
  id: string
  _scope?: string
  name?: string
  firstName?: string
  lastName?: string
}

const route = useRoute()
const router = useRouter()
const query = ref(String(route.query.q ?? ''))
const results = ref<Hit[]>([])
const loading = ref(false)
const error = ref('')
let timer: number | undefined
let seq = 0

const scopeMeta: Record<string, { label: string; route: string; icon: typeof Users }> = {
  Contact: { label: 'Contactos', route: '/contacts', icon: Users },
  Account: { label: 'Empresas', route: '/accounts', icon: Building2 },
  Lead: { label: 'Leads', route: '/leads', icon: Target },
  Opportunity: { label: 'Oportunidades', route: '/opportunities', icon: TrendingUp },
}

const grouped = computed(() => {
  const map = new Map<string, Hit[]>()
  for (const hit of results.value) {
    const scope = String(hit._scope ?? 'Otros')
    if (!map.has(scope)) map.set(scope, [])
    map.get(scope)!.push(hit)
  }
  return [...map.entries()]
})

function nameOf(hit: Hit): string {
  return hit.name || [hit.firstName, hit.lastName].filter(Boolean).join(' ') || hit.id
}

async function search(): Promise<void> {
  const term = query.value.trim()
  if (term.length < 2) {
    results.value = []
    return
  }
  const current = ++seq
  loading.value = true
  try {
    const data = await request<{ list?: Hit[] }>('/GlobalSearch', { params: { q: term, maxSize: 50 } })
    if (current === seq) results.value = (data.list ?? []).filter((hit) => hit._scope)
    error.value = ''
  } catch (err) {
    if (current === seq) {
      error.value = err instanceof Error ? err.message : 'Error de búsqueda.'
      results.value = []
    }
  } finally {
    if (current === seq) loading.value = false
  }
}

watch(query, (value) => {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    void router.replace({ query: value ? { q: value } : {} })
    void search()
  }, 280)
})

onMounted(search)
</script>

<template>
  <div class="space-y-5">
    <PageHeader title="Búsqueda global" subtitle="Contactos, empresas, leads y oportunidades" eyebrow="Inicio" />

    <div class="relative max-w-xl">
      <Search class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      <AppInput v-model="query" class="!h-11 pl-10" placeholder="Busca por nombre, email o teléfono…" autofocus />
    </div>

    <div v-if="error" class="text-[12px] text-danger">{{ error }}</div>

    <div v-if="loading" class="space-y-2">
      <div v-for="index in 4" :key="index" class="skeleton h-14" />
    </div>

    <div v-else-if="grouped.length" class="space-y-4">
      <section v-for="[scope, hits] in grouped" :key="scope" class="card overflow-hidden">
        <header class="flex items-center gap-2 border-b border-line px-4 py-3">
          <component :is="scopeMeta[scope]?.icon" class="h-4 w-4 text-faint" />
          <h2 class="text-[12px] font-semibold">{{ scopeMeta[scope]?.label ?? scope }}</h2>
          <span class="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] text-faint">{{ hits.length }}</span>
        </header>
        <div class="divide-y divide-line">
          <button
            v-for="hit in hits"
            :key="hit.id"
            type="button"
            :class="
              cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2/60',
              )
            "
            @click="router.push(`${scopeMeta[scope]?.route}/${hit.id}`)"
          >
            <AppAvatar :name="nameOf(hit)" size="sm" :square="scope === 'Account'" />
            <span class="text-[13px] font-medium">{{ nameOf(hit) }}</span>
          </button>
        </div>
      </section>
    </div>

    <AppEmpty
      v-else-if="query.trim().length >= 2"
      title="Sin resultados"
      description="Prueba con otro nombre, empresa o dirección de email."
    />
    <AppEmpty v-else title="Empieza a buscar" description="Escribe al menos 2 caracteres para buscar en todo el CRM." />
  </div>
</template>
