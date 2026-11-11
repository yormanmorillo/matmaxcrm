<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  FileText,
  ChartPie,
  CheckSquare,
  ClipboardList,
  Cog,
  Facebook,
  Inbox,
  Instagram,
  KanbanSquare,
  Stethoscope,
  LayoutDashboard,
  ListTodo,
  Mail,
  MessageCircle,
  Plug,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Users,
  UsersRound,
  Workflow,
  type LucideIcon,
} from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/cn'

interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  scope?: string
  pending?: boolean
}

interface NavSection {
  label: string
  items: NavItem[]
}

const route = useRoute()
const ui = useUiStore()
const auth = useAuthStore()

const sections: NavSection[] = [
  {
    label: 'Inicio',
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard },
      { label: 'Actividad reciente', to: '/activity', icon: Activity },
      { label: 'Indicadores', to: '/reports', icon: BarChart3, scope: 'Opportunity' },
      { label: 'Tareas pendientes', to: '/activities', icon: ListTodo, scope: 'Task' },
      { label: 'Recordatorios', to: '/calendar', icon: Bell },
    ],
  },
  {
    label: 'CRM',
    items: [
      { label: 'Contactos', to: '/contacts', icon: Users, scope: 'Contact' },
      { label: 'Empresas', to: '/accounts', icon: Building2, scope: 'Account' },
      { label: 'Leads', to: '/leads', icon: Target, scope: 'Lead' },
      { label: 'Oportunidades', to: '/opportunities', icon: TrendingUp, scope: 'Opportunity' },
      { label: 'Pipeline comercial', to: '/pipeline', icon: KanbanSquare, scope: 'Opportunity' },
      { label: 'Presupuestos', to: '/quotes', icon: FileText, scope: 'CCQuote' },
      { label: 'Tratamientos', to: '/treatments', icon: Stethoscope, scope: 'CTreatment' },
      { label: 'Actividades', to: '/activities', icon: CheckSquare, scope: 'Task' },
      { label: 'Calendario', to: '/calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'Comunicación',
    items: [
      { label: 'Bandeja de entrada', to: '/pending/inbox', icon: Inbox, pending: true },
      { label: 'WhatsApp', to: '/pending/whatsapp', icon: MessageCircle, pending: true },
      { label: 'Email', to: '/pending/email', icon: Mail, pending: true },
      { label: 'Facebook', to: '/pending/facebook', icon: Facebook, pending: true },
      { label: 'Instagram', to: '/pending/instagram', icon: Instagram, pending: true },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { label: 'Equipos', to: '/teams', icon: UsersRound, scope: 'Team' },
      { label: 'Usuarios', to: '/users', icon: Users, scope: 'User' },
      { label: 'Tareas', to: '/activities?tab=tasks', icon: ClipboardList, scope: 'Task' },
      { label: 'Informes', to: '/reports', icon: ChartPie, scope: 'Opportunity' },
      { label: 'Automatizaciones', to: '/pending/automations', icon: Workflow, pending: true },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { label: 'Integraciones', to: '/pending/integrations', icon: Plug, pending: true },
      { label: 'Campos personalizados', to: '/settings/fields', icon: SlidersHorizontal, scope: 'Role' },
      { label: 'Roles y permisos', to: '/roles', icon: ShieldCheck, scope: 'Role' },
      { label: 'Preferencias', to: '/settings', icon: Settings },
      { label: 'Administración', to: '/settings/admin', icon: Cog, scope: 'Role' },
    ],
  },
]

const visibleSections = computed(() =>
  sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.scope || auth.canRead(item.scope)),
    }))
    .filter((section) => section.items.length > 0),
)

function isActive(to: string): boolean {
  const path = to.split('?')[0]
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>

<template>
  <!-- Mobile overlay -->
  <div
    v-if="ui.mobileNavOpen"
    class="fixed inset-0 z-30 bg-black/50 backdrop-blur-[1px] lg:hidden"
    @click="ui.mobileNavOpen = false"
  />

  <aside
    :class="
      cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/5 bg-[var(--sidebar)] transition-all duration-200 lg:static lg:translate-x-0',
        ui.sidebarCollapsed ? 'lg:w-[76px]' : 'lg:w-[252px]',
        ui.mobileNavOpen ? 'translate-x-0 w-[272px]' : '-translate-x-full w-[272px]',
      )
    "
    aria-label="Navegación principal"
  >
    <!-- Brand -->
    <div :class="cn('flex h-16 items-center border-b border-white/5 px-4', ui.sidebarCollapsed && 'lg:justify-center lg:px-0')">
      <RouterLink to="/" class="group flex items-center gap-2.5" @click="ui.mobileNavOpen = false">
        <span class="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-900/30">
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 18V7l8 6 8-6v11" />
          </svg>
          <span class="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-[var(--sidebar)]" />
        </span>
        <span v-if="!ui.sidebarCollapsed" class="flex flex-col leading-none">
          <span class="text-[15px] font-semibold tracking-[0.14em] text-white">MATMAX</span>
          <span class="mt-1 text-[9px] font-medium tracking-[0.28em] text-emerald-200/60">CRM</span>
        </span>
      </RouterLink>
    </div>

    <!-- Nav -->
    <nav class="scroll-thin flex-1 overflow-y-auto px-3 py-4">
      <div v-for="section in visibleSections" :key="section.label" class="mb-5 last:mb-0">
        <p
          v-if="!ui.sidebarCollapsed"
          class="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30"
        >
          {{ section.label }}
        </p>
        <div v-else class="mx-auto mb-2 h-px w-6 bg-white/10" />
        <ul class="space-y-0.5">
          <li v-for="item in section.items" :key="`${item.to}-${item.label}`">
            <RouterLink
              :to="item.to"
              :title="ui.sidebarCollapsed ? item.label : undefined"
              :class="
                cn(
                  'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
                  isActive(item.to)
                    ? 'bg-white/[0.09] text-white'
                    : 'text-white/60 hover:bg-white/[0.05] hover:text-white/90',
                  ui.sidebarCollapsed && 'lg:justify-center lg:px-0',
                )
              "
              @click="ui.mobileNavOpen = false"
            >
              <span
                v-if="isActive(item.to)"
                class="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r bg-emerald-400"
              />
              <component :is="item.icon" class="h-[17px] w-[17px] shrink-0" :stroke-width="1.8" />
              <span v-if="!ui.sidebarCollapsed" class="flex min-w-0 flex-1 items-center justify-between gap-2">
                <span class="truncate">{{ item.label }}</span>
                <span
                  v-if="item.pending"
                  class="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/35"
                >
                  Pronto
                </span>
              </span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </nav>

    <!-- Footer -->
    <div class="border-t border-white/5 p-3">
      <div v-if="!ui.sidebarCollapsed" class="rounded-xl bg-white/[0.04] p-3">
        <div class="flex items-center gap-2">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <p class="text-[11px] font-medium text-white/70">MATMAX CRM 1.0</p>
        </div>
        <p class="mt-1 text-[10px] leading-relaxed text-white/35">
          Costa Rica · v1.0
        </p>
      </div>
      <div v-else class="flex justify-center">
        <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Sistema operativo" />
      </div>
    </div>
  </aside>
</template>
