<script setup lang="ts">
import { ExternalLink, HardDrive, Lock, Server, ShieldCheck, Users } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { useAuthStore } from '@/stores/auth'
import { ADMIN_URL } from '@/lib/config'

const router = useRouter()
const auth = useAuthStore()
const adminUrl = ADMIN_URL

const items = [
  {
    title: 'Aplicación',
    icon: Server,
    rows: [
      ['Motor CRM', 'MATMAX CRM 1.0'],
      ['País / moneda', 'Costa Rica · CRC ₡'],
      ['Zona horaria', 'America/Costa_Rica'],
      ['API', 'REST /api/v1'],
      ['Base de datos', 'MariaDB 11.8'],
      ['Servidor web', 'Nginx + PHP-FPM'],
    ],
  },
  {
    title: 'Seguridad',
    icon: ShieldCheck,
    rows: [
      ['Transporte', 'HTTPS / TLS'],
      ['Sesión', 'Token por usuario'],
      ['Permisos', 'ACL del backend'],
      ['Base de datos', 'Sin puerto público'],
    ],
  },
]

function openAdmin(): void {
  window.open(adminUrl, '_blank', 'noopener')
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader title="Administración" subtitle="Estado del sistema y acceso a la administración nativa" eyebrow="Configuración">
      <template #actions>
        <AppButton variant="primary" size="sm" @click="openAdmin">
          <ExternalLink class="h-4 w-4" />
          Abrir administración
        </AppButton>
      </template>
    </PageHeader>

    <div class="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-[12px] leading-relaxed text-amber-800 dark:text-amber-200">
      <Lock class="mr-1.5 inline h-3.5 w-3.5" />
      La administración nativa está disponible en
      <a :href="adminUrl" target="_blank" rel="noopener" class="font-medium underline">crm.matmax.site:8443</a>.
      El subdominio <span class="font-mono">admin.crm.matmax.site</span> se activará al crear el registro DNS A;
      mientras tanto, también puedes usar el túnel SSH documentado.
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div v-for="item in items" :key="item.title" class="card p-5">
        <div class="mb-4 flex items-center gap-2">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <component :is="item.icon" class="h-4 w-4" />
          </span>
          <h2 class="section-title">{{ item.title }}</h2>
        </div>
        <dl class="space-y-2.5">
          <div v-for="[label, value] in item.rows" :key="label" class="flex items-center justify-between gap-3 text-[12px]">
            <dt class="text-muted">{{ label }}</dt>
            <dd class="text-right font-medium">{{ value }}</dd>
          </div>
        </dl>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <button class="card p-5 text-left transition hover:border-brand/40" @click="router.push('/users')">
        <Users class="mb-3 h-5 w-5 text-brand" />
        <p class="text-[13px] font-semibold">Usuarios y equipos</p>
        <p class="mt-0.5 text-[11px] text-muted">Gestiona cuentas, equipos y roles.</p>
      </button>
      <button class="card p-5 text-left transition hover:border-brand/40" @click="openAdmin">
        <HardDrive class="mb-3 h-5 w-5 text-brand" />
        <p class="text-[13px] font-semibold">Entity Manager</p>
        <p class="mt-0.5 text-[11px] text-muted">Campos, layouts y relaciones.</p>
      </button>
      <button class="card p-5 text-left transition hover:border-brand/40" @click="openAdmin">
        <ShieldCheck class="mb-3 h-5 w-5 text-brand" />
        <p class="text-[13px] font-semibold">Roles y ACL</p>
        <p class="mt-0.5 text-[11px] text-muted">Permisos finos por módulo y registro.</p>
      </button>
    </div>

    <div class="card p-5">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="section-title">Estado de la sesión</h2>
          <p class="mt-0.5 text-[12px] text-muted">
            {{ auth.displayName }} · {{ auth.isAdmin ? 'Administrador' : 'Usuario' }}
          </p>
        </div>
        <AppBadge :tone="auth.isAdmin ? 'violet' : 'neutral'">{{ auth.user?.userName }}</AppBadge>
      </div>
    </div>
  </div>
</template>
