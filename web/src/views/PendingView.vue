<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  Clock3,
  Facebook,
  Inbox,
  Instagram,
  Mail,
  MessageCircle,
  Plug,
  Workflow,
  type LucideIcon,
} from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'

interface ModuleInfo {
  title: string
  subtitle: string
  icon: LucideIcon
  status: string
  description: string
  bullets: string[]
  note: string
}

const props = defineProps<{ module: string }>()
const router = useRouter()

const modules: Record<string, ModuleInfo> = {
  inbox: {
    title: 'Bandeja de entrada',
    subtitle: 'Conversaciones omnicanal',
    icon: Inbox,
    status: 'Arquitectura definida',
    description:
      'La bandeja unificará conversaciones de email y mensajería en un modelo propio de conversaciones, mensajes, canales, asignaciones, prioridades y estados.',
    bullets: [
      'Modelo unificado: conversación → mensajes → canal → agente',
      'Asignación y prioridades por equipo',
      'Historial y auditoría de cada interacción',
      'Webhooks con validación de autenticidad',
    ],
    note: 'No se muestran conversaciones simuladas. El módulo se activará cuando exista al menos un canal conectado.',
  },
  email: {
    title: 'Email',
    subtitle: 'IMAP / SMTP',
    icon: Mail,
    status: 'Pendiente de credenciales',
    description:
      'MATMAX soporta cuentas de correo IMAP/SMTP y grupos de email. La configuración se realizará desde la administración y la SPA consumirá los mensajes vía API.',
    bullets: [
      'Cuenta SMTP para envío y IMAP para recepción',
      'Grupos de email y asignación automática',
      'Vinculación de mensajes a contactos, empresas y oportunidades',
      'Firma, plantillas y respuestas rápidas',
    ],
    note: 'Facilita las credenciales del buzón para activar la integración.',
  },
  whatsapp: {
    title: 'WhatsApp',
    subtitle: 'Business Cloud API',
    icon: MessageCircle,
    status: 'Arquitectura preparada',
    description:
      'Integración con WhatsApp Business Cloud API mediante un servicio de canal que normaliza mensajes al modelo de conversaciones del CRM.',
    bullets: [
      'Verificación de webhooks con firma',
      'Plantillas y ventanas de conversación',
      'Asignación a agentes y equipos',
      'Trazabilidad de estados de entrega',
    ],
    note: 'Requiere número verificado, token de Meta y URL de webhook HTTPS.',
  },
  facebook: {
    title: 'Facebook Messenger',
    subtitle: 'Meta Graph API',
    icon: Facebook,
    status: 'Arquitectura preparada',
    description:
      'Canal de Messenger integrado en la misma bandeja omnicanal, con identidad de contacto y asignación por equipo.',
    bullets: [
      'Webhook firmado por Meta',
      'Mapeo de usuario de Messenger a contacto',
      'Respuestas desde el CRM',
      'Historial unificado',
    ],
    note: 'No se simulan conversaciones ni conexiones.',
  },
  instagram: {
    title: 'Instagram Messaging',
    subtitle: 'Meta Graph API',
    icon: Instagram,
    status: 'Arquitectura preparada',
    description:
      'Mensajería de Instagram conectada al mismo modelo de conversaciones y a la ficha del contacto.',
    bullets: [
      'Webhook firmado',
      'Mensajes directos y respuestas',
      'Asignación y prioridad',
      'Historial unificado',
    ],
    note: 'Requiere cuenta profesional de Instagram vinculada a una app de Meta.',
  },
  integrations: {
    title: 'Integraciones',
    subtitle: 'Webhooks y APIs externas',
    icon: Plug,
    status: 'Diseño modular',
    description:
      'La arquitectura deja preparados webhooks HTTPS, validación de firma, reintentos y automatizaciones externas. n8n será opcional, nunca una dependencia del CRM base.',
    bullets: [
      'Webhooks de entrada con validación HMAC',
      'Salida de eventos del CRM',
      'Reintentos y cola persistente',
      'n8n opcional para orquestación',
    ],
    note: 'No hay conectores activos todavía. Evitamos botones que simulen conexión.',
  },
  automations: {
    title: 'Automatizaciones',
    subtitle: 'Workflows y reglas',
    icon: Workflow,
    status: 'Requiere extensión',
    description:
      'Las automatizaciones avanzadas forman parte de un módulo de pago. No se ha instalado ni simulado. No se ha instalado ni simulado.',
    bullets: [
      'Workflows con condiciones y acciones',
      'Reglas de asignación y notificación',
      'Alternativa: n8n externo vía webhooks',
      'Auditoría de ejecuciones',
    ],
    note: 'Para activarlo, adquiere el Advanced Pack o diseña la automatización en n8n.',
  },
}

const info = computed<ModuleInfo>(
  () =>
    modules[props.module] ?? {
      title: 'Módulo pendiente',
      subtitle: 'En preparación',
      icon: Clock3,
      status: 'Pendiente',
      description: 'Este módulo forma parte de la hoja de ruta y todavía no está implementado.',
      bullets: [],
      note: 'No se muestran funciones ficticias.',
    },
)
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 py-4">
    <button class="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted transition hover:text-brand" @click="router.back()">
      <ArrowLeft class="h-3.5 w-3.5" />
      Volver
    </button>

    <div class="card p-6 sm:p-8">
      <div class="flex items-start gap-4">
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <component :is="info.icon" class="h-5 w-5" />
        </span>
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-[24px] font-semibold tracking-tight">{{ info.title }}</h1>
            <AppBadge tone="warning" dot>{{ info.status }}</AppBadge>
          </div>
          <p class="mt-1 text-[13px] text-muted">{{ info.subtitle }}</p>
        </div>
      </div>

      <p class="mt-6 text-[13px] leading-relaxed text-muted">{{ info.description }}</p>

      <div v-if="info.bullets.length" class="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div
          v-for="bullet in info.bullets"
          :key="bullet"
          class="flex items-start gap-2 rounded-lg border border-line bg-surface-2/50 px-3 py-2.5 text-[12px] text-muted"
        >
          <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          {{ bullet }}
        </div>
      </div>

      <div class="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-3 text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
        {{ info.note }}
      </div>

      <div class="mt-6 flex flex-wrap gap-2">
        <AppButton variant="primary" size="sm" @click="router.push('/')">Ir al dashboard</AppButton>
        <AppButton variant="secondary" size="sm" @click="router.push('/settings/admin')">Ver administración</AppButton>
      </div>
    </div>
  </div>
</template>
