import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppShell from '@/components/layout/AppShell.vue'

declare module 'vue-router' {
  interface RouteMeta {
    section?: string
    title?: string
    scope?: string
    public?: boolean
    module?: string
  }
}

const router = createRouter({
  history: createWebHistory('/'),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true, title: 'Iniciar sesión' },
    },
    {
      path: '/quotes/:id/print',
      name: 'quote-print',
      component: () => import('@/views/QuotePrintView.vue'),
      meta: { title: 'Presupuesto' },
    },
    {
      path: '/',
      component: AppShell,
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: 'Dashboard', section: 'Inicio' },
        },
        {
          path: 'activity',
          name: 'activity',
          component: () => import('@/views/ActivityView.vue'),
          meta: { title: 'Actividad reciente', section: 'Inicio' },
        },
        {
          path: 'contacts',
          name: 'contacts',
          component: () => import('@/views/ContactsView.vue'),
          meta: { title: 'Contactos', section: 'CRM', scope: 'Contact' },
        },
        {
          path: 'contacts/:id',
          name: 'contact-detail',
          component: () => import('@/views/ContactDetailView.vue'),
          meta: { title: 'Contacto', section: 'CRM', scope: 'Contact' },
        },
        {
          path: 'accounts',
          name: 'accounts',
          component: () => import('@/views/AccountsView.vue'),
          meta: { title: 'Empresas', section: 'CRM', scope: 'Account' },
        },
        {
          path: 'accounts/:id',
          name: 'account-detail',
          component: () => import('@/views/AccountDetailView.vue'),
          meta: { title: 'Empresa', section: 'CRM', scope: 'Account' },
        },
        {
          path: 'leads',
          name: 'leads',
          component: () => import('@/views/LeadsView.vue'),
          meta: { title: 'Leads', section: 'CRM', scope: 'Lead' },
        },
        {
          path: 'leads/:id',
          name: 'lead-detail',
          component: () => import('@/views/LeadDetailView.vue'),
          meta: { title: 'Lead', section: 'CRM', scope: 'Lead' },
        },
        {
          path: 'opportunities',
          name: 'opportunities',
          component: () => import('@/views/OpportunitiesView.vue'),
          meta: { title: 'Oportunidades', section: 'CRM', scope: 'Opportunity' },
        },
        {
          path: 'opportunities/:id',
          name: 'opportunity-detail',
          component: () => import('@/views/OpportunityDetailView.vue'),
          meta: { title: 'Oportunidad', section: 'CRM', scope: 'Opportunity' },
        },
        {
          path: 'quotes',
          name: 'quotes',
          component: () => import('@/views/QuotesView.vue'),
          meta: { title: 'Presupuestos', section: 'CRM', scope: 'CCQuote' },
        },
        {
          path: 'treatments',
          name: 'treatments',
          component: () => import('@/views/TreatmentsView.vue'),
          meta: { title: 'Tratamientos', section: 'CRM', scope: 'CTreatment' },
        },
        {
          path: 'pipeline',
          name: 'pipeline',
          component: () => import('@/views/PipelineView.vue'),
          meta: { title: 'Pipeline comercial', section: 'CRM', scope: 'Opportunity' },
        },
        {
          path: 'activities',
          name: 'activities',
          component: () => import('@/views/ActivitiesView.vue'),
          meta: { title: 'Actividades', section: 'CRM', scope: 'Task' },
        },
        {
          path: 'calendar',
          name: 'calendar',
          component: () => import('@/views/CalendarView.vue'),
          meta: { title: 'Calendario', section: 'CRM' },
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/views/ReportsView.vue'),
          meta: { title: 'Informes', section: 'Gestión', scope: 'Opportunity' },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/UsersView.vue'),
          meta: { title: 'Usuarios', section: 'Gestión', scope: 'User' },
        },
        {
          path: 'teams',
          name: 'teams',
          component: () => import('@/views/TeamsView.vue'),
          meta: { title: 'Equipos', section: 'Gestión', scope: 'Team' },
        },
        {
          path: 'roles',
          name: 'roles',
          component: () => import('@/views/RolesView.vue'),
          meta: { title: 'Roles y permisos', section: 'Configuración', scope: 'Role' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: { title: 'Preferencias', section: 'Configuración' },
        },
        {
          path: 'settings/fields',
          name: 'custom-fields',
          component: () => import('@/views/CustomFieldsView.vue'),
          meta: { title: 'Campos personalizados', section: 'Configuración', scope: 'Role' },
        },
        {
          path: 'settings/admin',
          name: 'admin',
          component: () => import('@/views/AdminView.vue'),
          meta: { title: 'Administración', section: 'Configuración', scope: 'Role' },
        },
        {
          path: 'pending/:module',
          name: 'pending',
          component: () => import('@/views/PendingView.vue'),
          props: true,
          meta: { title: 'Módulo pendiente', section: 'Comunicación' },
        },
        {
          path: 'search',
          name: 'search',
          component: () => import('@/views/SearchView.vue'),
          meta: { title: 'Búsqueda', section: 'Inicio' },
        },
        {
          path: 'forbidden',
          name: 'forbidden',
          component: () => import('@/views/ForbiddenView.vue'),
          meta: { title: 'Acceso restringido', section: 'Sistema' },
        },
        {
          path: ':pathMatch(.*)*',
          name: 'not-found',
          component: () => import('@/views/NotFoundView.vue'),
          meta: { title: 'Página no encontrada', section: 'Sistema' },
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.public) {
    if (to.name === 'login' && auth.isAuthenticated) return { name: 'dashboard' }
    return true
  }

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.scope && !auth.canRead(to.meta.scope)) {
    return { name: 'forbidden' }
  }

  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · MATMAX CRM` : 'MATMAX CRM'
})

export default router
