<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ExternalLink, KeyRound, Moon, Save, ShieldCheck, Sun, UserRound } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import { updateRecord } from '@/lib/api'
import { saveSession } from '@/lib/session'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { ADMIN_URL } from '@/lib/config'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()

const saving = ref(false)
const error = ref('')
const adminUrl = ADMIN_URL

const form = reactive({
  firstName: String(auth.user?.firstName ?? ''),
  lastName: String(auth.user?.lastName ?? ''),
  emailAddress: String(auth.user?.emailAddress ?? ''),
})

function openAdmin(): void {
  window.open(adminUrl, '_blank', 'noopener')
}

const displayName = computed(
  () => [form.firstName, form.lastName].filter(Boolean).join(' ') || auth.user?.userName || '',
)

async function saveProfile(): Promise<void> {
  if (!auth.user) return
  error.value = ''
  if (!form.emailAddress || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailAddress)) {
    error.value = 'Introduce un email válido.'
    return
  }
  saving.value = true
  try {
    await updateRecord('User', auth.user.id, {
      firstName: form.firstName,
      lastName: form.lastName,
      emailAddress: form.emailAddress,
    })
    if (auth.session) {
      auth.session.user = {
        ...auth.session.user,
        firstName: form.firstName,
        lastName: form.lastName,
        emailAddress: form.emailAddress,
        name: displayName.value,
      }
      saveSession(auth.session)
    }
    ui.toast('success', 'Perfil actualizado')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo guardar el perfil.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  /* noop */
})
</script>

<template>
  <div class="space-y-5">
    <PageHeader title="Preferencias" subtitle="Tu perfil y la configuración de la interfaz" eyebrow="Configuración" />

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="space-y-4 lg:col-span-2">
        <div class="card p-5">
          <div class="mb-5 flex items-center gap-3">
            <AppAvatar :name="displayName" size="lg" />
            <div>
              <h2 class="section-title">Perfil</h2>
              <p class="text-[12px] text-muted">{{ auth.user?.userName }} · {{ auth.isAdmin ? 'Administrador' : 'Usuario' }}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="field-label">Nombre</label>
              <AppInput v-model="form.firstName" />
            </div>
            <div>
              <label class="field-label">Apellidos</label>
              <AppInput v-model="form.lastName" />
            </div>
            <div class="sm:col-span-2">
              <label class="field-label">Email</label>
              <AppInput v-model="form.emailAddress" type="email" />
            </div>
          </div>

          <p v-if="error" class="mt-3 text-[12px] text-danger">{{ error }}</p>

          <div class="mt-4 flex justify-end">
            <AppButton variant="primary" size="sm" :loading="saving" @click="saveProfile">
              <Save class="h-4 w-4" />
              Guardar perfil
            </AppButton>
          </div>
        </div>

        <div class="card p-5">
          <h2 class="section-title">Apariencia</h2>
          <p class="mt-0.5 text-[12px] text-muted">Elige el tema de la interfaz. Se guarda en este navegador.</p>
          <div class="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              :class="[
                'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
                ui.theme === 'light' ? 'border-brand bg-brand-soft/50' : 'border-line hover:bg-surface-2',
              ]"
              @click="ui.theme = 'light'; ui.applyTheme()"
            >
              <Sun class="h-5 w-5 text-amber-500" />
              <span>
                <span class="block text-[13px] font-medium">Claro</span>
                <span class="block text-[11px] text-faint">Luminoso y sobrio</span>
              </span>
            </button>
            <button
              type="button"
              :class="[
                'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
                ui.theme === 'dark' ? 'border-brand bg-brand-soft/50' : 'border-line hover:bg-surface-2',
              ]"
              @click="ui.theme = 'dark'; ui.applyTheme()"
            >
              <Moon class="h-5 w-5 text-violet-400" />
              <span>
                <span class="block text-[13px] font-medium">Oscuro</span>
                <span class="block text-[11px] text-faint">Para sesiones largas</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div class="card p-5">
          <h2 class="section-title mb-3">Cuenta</h2>
          <dl class="space-y-2.5 text-[12px]">
            <div class="flex justify-between gap-3">
              <dt class="text-muted">Usuario</dt>
              <dd class="font-medium">{{ auth.user?.userName }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-muted">Tipo</dt>
              <dd class="font-medium">{{ auth.isAdmin ? 'Administrador' : 'Usuario' }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-muted">Zona horaria</dt>
              <dd class="font-medium">{{ auth.user?.timeZone || 'Europe/Madrid' }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-muted">Idioma</dt>
              <dd class="font-medium">Español</dd>
            </div>
          </dl>
        </div>

        <div class="card p-5">
          <h2 class="section-title mb-2">Seguridad</h2>
          <p class="text-[11px] leading-relaxed text-muted">
            La sesión se guarda solo en esta pestaña. El token se envía por HTTPS y caduca por inactividad.
          </p>
          <AppButton class="mt-3" variant="secondary" size="sm" block @click="router.push('/settings/admin')">
            <KeyRound class="h-4 w-4" />
            Opciones de administración
          </AppButton>
        </div>

        <div v-if="auth.isAdmin" class="card p-5">
          <h2 class="section-title mb-2">Consola MATMAX</h2>
          <p class="text-[11px] leading-relaxed text-muted">
            Gestiona campos, roles, correo e integraciones desde la administración oficial sin tocar el núcleo.
          </p>
          <AppButton class="mt-3" variant="primary" size="sm" block @click="openAdmin">
            <ExternalLink class="h-4 w-4" />
            Abrir administración
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>
