<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import AppButton from '@/components/ui/AppButton.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const userName = ref('')
const password = ref('')
const showPassword = ref(false)
const formError = ref('')
const userNameInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  userNameInput.value?.focus()
})

async function submit(): Promise<void> {
  formError.value = ''
  if (!userName.value.trim() || !password.value) {
    formError.value = 'Introduce tu usuario y contraseña.'
    return
  }
  try {
    await auth.login(userName.value, password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(redirect)
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'No se pudo iniciar sesión.'
    password.value = ''
  }
}
</script>

<template>
  <div class="flex min-h-screen bg-canvas">
    <!-- Brand panel -->
    <div class="relative hidden w-[46%] overflow-hidden bg-[#07120f] lg:flex lg:flex-col lg:justify-between">
      <div
        class="pointer-events-none absolute inset-0 opacity-70"
        style="
          background-image:
            radial-gradient(circle at 18% 18%, rgba(45, 212, 191, 0.18), transparent 38%),
            radial-gradient(circle at 82% 72%, rgba(217, 154, 43, 0.12), transparent 34%),
            linear-gradient(145deg, #07120f 0%, #0b1f1a 55%, #07120f 100%);
        "
      />
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.22]"
        style="
          background-image: linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
        "
      />

      <div class="relative z-10 p-12">
        <div class="flex items-center gap-3">
          <span class="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-xl shadow-emerald-950/40">
            <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 18V7l8 6 8-6v11" />
            </svg>
            <span class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-[#07120f]" />
          </span>
          <div>
            <p class="text-[17px] font-semibold tracking-[0.16em] text-white">MATMAX</p>
            <p class="text-[9px] font-medium tracking-[0.34em] text-emerald-200/60">CRM</p>
          </div>
        </div>
      </div>

      <div class="relative z-10 px-12 pb-14">
        <p class="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-emerald-200/80">
          <Sparkles class="h-3 w-3" />
          Tu CRM, en tu servidor
        </p>
        <h1 class="max-w-lg text-[38px] font-semibold leading-[1.08] tracking-[-0.03em] text-white">
          El control comercial<br />que tu equipo<br />
          <span class="text-emerald-300">necesita.</span>
        </h1>
        <p class="mt-5 max-w-md text-[14px] leading-relaxed text-white/50">
          Contactos, empresas, oportunidades y pipeline en una interfaz clara. Sin ruido,
          sin datos fuera de tu infraestructura.
        </p>

        <div class="mt-10 grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
          <div class="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5">
            <ShieldCheck class="mb-2 h-4 w-4 text-emerald-300" />
            <p class="text-[12px] font-medium text-white/80">Datos bajo tu control</p>
            <p class="mt-0.5 text-[11px] leading-relaxed text-white/35">Autoalojado, sin dependencia de terceros.</p>
          </div>
          <div class="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5">
            <ArrowRight class="mb-2 h-4 w-4 text-amber-300" />
            <p class="text-[12px] font-medium text-white/80">Permisos reales</p>
            <p class="mt-0.5 text-[11px] leading-relaxed text-white/35">Roles y equipos aplicados en el backend.</p>
          </div>
        </div>
      </div>

      <div class="relative z-10 border-t border-white/[0.06] px-12 py-5 text-[11px] text-white/25">
        © 2026 MATMAX · Plataforma CRM profesional
      </div>
    </div>

    <!-- Form -->
    <div class="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
      <div class="w-full max-w-[400px]">
        <div class="mb-8 flex items-center gap-3 lg:hidden">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 18V7l8 6 8-6v11" />
            </svg>
          </span>
          <div>
            <p class="text-[15px] font-semibold tracking-[0.16em]">MATMAX</p>
            <p class="text-[8px] font-medium tracking-[0.3em] text-muted">CRM</p>
          </div>
        </div>

        <div class="mb-8">
          <h2 class="text-[28px] font-semibold tracking-[-0.025em]">Bienvenido de nuevo</h2>
          <p class="mt-1.5 text-[13px] text-muted">Accede con tu cuenta de MATMAX CRM.</p>
        </div>

        <form class="space-y-4" @submit.prevent="submit">
          <div>
            <label for="login-user" class="field-label">Usuario</label>
            <div class="relative">
              <UserRound class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <input
                id="login-user"
                ref="userNameInput"
                v-model="userName"
                type="text"
                autocomplete="username"
                class="input-base h-11 pl-10"
                placeholder="tu.usuario"
                :disabled="auth.loading"
              />
            </div>
          </div>

          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <label for="login-password" class="text-[12px] font-medium text-muted">Contraseña</label>
            </div>
            <div class="relative">
              <Lock class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                class="input-base h-11 px-10"
                placeholder="••••••••••"
                :disabled="auth.loading"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-faint transition hover:text-ink"
                :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            v-if="formError"
            class="rounded-xl border border-danger/20 bg-danger/[0.06] px-3.5 py-2.5 text-[12px] font-medium text-danger"
            role="alert"
          >
            {{ formError }}
          </div>

          <AppButton type="submit" variant="primary" size="lg" block :loading="auth.loading">
            Iniciar sesión
            <ArrowRight v-if="!auth.loading" class="h-4 w-4" />
          </AppButton>
        </form>

        <div class="mt-8 flex items-start gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-3">
          <ShieldCheck class="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p class="text-[11px] leading-relaxed text-muted">
            Conexión cifrada. Tus credenciales se envían directamente a tu instancia de MATMAX y
            nunca se almacenan en el navegador.
          </p>
        </div>

        <p class="mt-8 text-center text-[11px] text-faint">
          ¿Problemas para acceder? Contacta con el administrador de tu organización.
        </p>
      </div>
    </div>
  </div>
</template>
