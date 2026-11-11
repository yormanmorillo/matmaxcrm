<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Building2,
  CalendarDays,
  ChartPie,
  CheckSquare,
  CornerDownLeft,
  KanbanSquare,
  LayoutDashboard,
  Loader2,
  Search,
  Settings,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-vue-next'
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { useUiStore } from '@/stores/ui'
import { request } from '@/lib/api'
import { cn } from '@/lib/cn'

interface Hit {
  id: string
  _scope?: string
  name?: string
  firstName?: string
  lastName?: string
  [key: string]: unknown
}

interface Command {
  label: string
  hint: string
  to: string
  icon: LucideIcon
}

const ui = useUiStore()
const router = useRouter()

const query = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const hits = ref<Hit[]>([])
const error = ref('')
const activeIndex = ref(0)
let debounce: number | undefined
let searchSeq = 0

const commands: Command[] = [
  { label: 'Dashboard', hint: 'Inicio', to: '/', icon: LayoutDashboard },
  { label: 'Contactos', hint: 'CRM', to: '/contacts', icon: Users },
  { label: 'Empresas', hint: 'CRM', to: '/accounts', icon: Building2 },
  { label: 'Leads', hint: 'CRM', to: '/leads', icon: Target },
  { label: 'Oportunidades', hint: 'CRM', to: '/opportunities', icon: TrendingUp },
  { label: 'Pipeline comercial', hint: 'CRM', to: '/pipeline', icon: KanbanSquare },
  { label: 'Actividades', hint: 'CRM', to: '/activities', icon: CheckSquare },
  { label: 'Calendario', hint: 'CRM', to: '/calendar', icon: CalendarDays },
  { label: 'Informes', hint: 'Gestión', to: '/reports', icon: ChartPie },
  { label: 'Preferencias', hint: 'Configuración', to: '/settings', icon: Settings },
]

const scopeIcons: Record<string, LucideIcon> = {
  Contact: Users,
  Account: Building2,
  Lead: Target,
  Opportunity: TrendingUp,
  Task: CheckSquare,
  Call: CalendarDays,
  Meeting: CalendarDays,
}

const scopeRoutes: Record<string, string> = {
  Contact: '/contacts',
  Account: '/accounts',
  Lead: '/leads',
  Opportunity: '/opportunities',
  Task: '/activities',
  Call: '/activities',
  Meeting: '/activities',
}

const filteredCommands = computed(() => {
  const term = query.value.trim().toLowerCase()
  if (!term) return commands
  return commands.filter(
    (command) =>
      command.label.toLowerCase().includes(term) || command.hint.toLowerCase().includes(term),
  )
})

const totalItems = computed(() => filteredCommands.value.length + hits.value.length)

function hitName(hit: Hit): string {
  return (
    hit.name ||
    [hit.firstName, hit.lastName].filter(Boolean).join(' ') ||
    String(hit.id)
  )
}

function reset(): void {
  query.value = ''
  hits.value = []
  error.value = ''
  activeIndex.value = 0
  loading.value = false
}

watch(
  () => ui.commandOpen,
  async (open) => {
    if (!open) {
      reset()
      return
    }
    await nextTick()
    inputRef.value?.focus()
  },
)

watch(query, (value) => {
  window.clearTimeout(debounce)
  activeIndex.value = 0
  const term = value.trim()
  if (term.length < 2) {
    hits.value = []
    loading.value = false
    return
  }
  loading.value = true
  debounce = window.setTimeout(async () => {
    const seq = ++searchSeq
    try {
      const response = await request<{ list?: Hit[] }>('/GlobalSearch', {
        params: { q: term, maxSize: 20 },
      })
      if (seq !== searchSeq) return
      hits.value = (response.list ?? []).filter((hit) => hit?._scope && hit?.id)
      error.value = ''
    } catch (err) {
      if (seq !== searchSeq) return
      hits.value = []
      error.value = err instanceof Error ? err.message : 'No se pudo buscar.'
    } finally {
      if (seq === searchSeq) loading.value = false
    }
  }, 260)
})

function goTo(path: string): void {
  ui.commandOpen = false
  router.push(path)
}

function openHit(hit: Hit): void {
  const base = hit._scope ? scopeRoutes[hit._scope] : undefined
  if (!base) return
  goTo(`${base}/${hit.id}`)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % Math.max(1, totalItems.value)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + totalItems.value) % Math.max(1, totalItems.value)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    if (activeIndex.value < filteredCommands.value.length) {
      goTo(filteredCommands.value[activeIndex.value].to)
    } else {
      const hit = hits.value[activeIndex.value - filteredCommands.value.length]
      if (hit) openHit(hit)
    }
  }
}
</script>

<template>
  <DialogRoot v-model:open="ui.commandOpen">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-[80] bg-black/50 backdrop-blur-[2px] animate-fade-in" />
      <DialogContent
        class="fixed left-1/2 top-[12vh] z-[80] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl animate-slide-up"
        @keydown="onKeydown"
      >
        <DialogTitle class="sr-only">Buscar en MATMAX CRM</DialogTitle>
        <div class="flex items-center gap-3 border-b border-line px-4">
          <Search class="h-4.5 w-4.5 shrink-0 text-faint" />
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            class="h-14 w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
            placeholder="Buscar contactos, empresas, leads, oportunidades…"
            autocomplete="off"
            spellcheck="false"
          />
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin text-faint" />
          <kbd class="hidden rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] text-faint sm:block">Esc</kbd>
        </div>

        <div class="max-h-[60vh] overflow-y-auto p-2">
          <template v-if="filteredCommands.length">
            <p class="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">
              {{ query ? 'Accesos' : 'Navegación rápida' }}
            </p>
            <button
              v-for="(command, index) in filteredCommands"
              :key="command.to + command.label"
              type="button"
              :class="
                cn(
                  'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition',
                  activeIndex === index ? 'bg-brand-soft text-ink' : 'hover:bg-surface-2',
                )
              "
              @click="goTo(command.to)"
              @mouseenter="activeIndex = index"
            >
              <span class="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface">
                <component :is="command.icon" class="h-4 w-4 text-muted" />
              </span>
              <span class="flex-1 text-[13px] font-medium">{{ command.label }}</span>
              <span class="text-[11px] text-faint">{{ command.hint }}</span>
            </button>
          </template>

          <template v-if="hits.length">
            <p class="mt-2 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">
              Resultados
            </p>
            <button
              v-for="(hit, index) in hits"
              :key="`${hit._scope}-${hit.id}`"
              type="button"
              :class="
                cn(
                  'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition',
                  activeIndex === filteredCommands.length + index ? 'bg-brand-soft' : 'hover:bg-surface-2',
                )
              "
              @click="openHit(hit)"
              @mouseenter="activeIndex = filteredCommands.length + index"
            >
              <span class="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface">
                <component :is="scopeIcons[hit._scope || 'Contact'] || Users" class="h-4 w-4 text-muted" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[13px] font-medium">{{ hitName(hit) }}</span>
                <span class="block text-[11px] text-faint">{{ hit._scope }}</span>
              </span>
            </button>
          </template>

          <div v-if="query.trim().length >= 2 && !loading && !hits.length && !error" class="px-3 py-10 text-center">
            <p class="text-sm font-medium">Sin resultados</p>
            <p class="mt-1 text-[12px] text-muted">Prueba con otro nombre, email o teléfono.</p>
          </div>
          <div v-if="error" class="px-3 py-6 text-center text-[12px] text-danger">{{ error }}</div>
        </div>

        <div class="flex items-center justify-between border-t border-line bg-surface-2/60 px-4 py-2.5 text-[11px] text-faint">
          <div class="flex items-center gap-3">
            <span class="flex items-center gap-1"><CornerDownLeft class="h-3 w-3" /> abrir</span>
            <span>↑ ↓ navegar</span>
          </div>
          <span>Búsqueda global MATMAX</span>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
