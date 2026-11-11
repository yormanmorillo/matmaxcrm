<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  UserRound,
} from 'lucide-vue-next'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import { ADMIN_URL } from '@/lib/config'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

const adminUrl = ADMIN_URL
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

const breadcrumb = computed(() => {
  const section = (route.meta.section as string) || 'MATMAX'
  const title = (route.meta.title as string) || ''
  return { section, title }
})

function openAdmin(): void {
  window.open(adminUrl, '_blank', 'noopener')
}

function logout(): void {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-canvas/80 px-4 backdrop-blur-md sm:px-6">
    <button
      type="button"
      class="rounded-lg p-2 text-muted transition hover:bg-surface hover:text-ink lg:hidden"
      aria-label="Abrir menú"
      @click="ui.mobileNavOpen = true"
    >
      <Menu class="h-5 w-5" />
    </button>

    <div class="flex min-w-0 flex-1 items-center gap-2 text-[13px]">
      <span class="hidden text-faint sm:inline">{{ breadcrumb.section }}</span>
      <ChevronRight v-if="breadcrumb.title" class="hidden h-3.5 w-3.5 text-faint sm:inline" />
      <span class="truncate font-medium text-ink">{{ breadcrumb.title }}</span>
    </div>

    <button
      type="button"
      class="hidden h-9 w-[240px] items-center gap-2 rounded-xl border border-line bg-surface px-3 text-left text-[12px] text-faint shadow-sm transition hover:border-brand/30 hover:text-muted md:flex xl:w-[300px]"
      @click="ui.commandOpen = true"
    >
      <Search class="h-3.5 w-3.5" />
      <span class="flex-1">Buscar en el CRM…</span>
      <kbd class="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-faint">
        {{ isMac ? '⌘' : 'Ctrl' }} K
      </kbd>
    </button>

    <button
      type="button"
      class="rounded-lg p-2 text-muted transition hover:bg-surface hover:text-ink md:hidden"
      aria-label="Buscar"
      @click="ui.commandOpen = true"
    >
      <Search class="h-5 w-5" />
    </button>

    <button
      type="button"
      class="rounded-lg p-2 text-muted transition hover:bg-surface hover:text-ink"
      :aria-label="ui.theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'"
      @click="ui.toggleTheme()"
    >
      <Sun v-if="ui.theme === 'dark'" class="h-[18px] w-[18px]" />
      <Moon v-else class="h-[18px] w-[18px]" />
    </button>

    <DropdownMenuRoot>
      <DropdownMenuTrigger as-child>
        <button type="button" class="flex items-center gap-2 rounded-xl p-1 pr-1.5 transition hover:bg-surface">
          <AppAvatar :name="auth.displayName" size="sm" />
          <span class="hidden max-w-[120px] truncate text-[12px] font-medium sm:block">
            {{ auth.displayName }}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          align="end"
          :side-offset="8"
          class="z-50 min-w-[220px] rounded-xl border border-line bg-surface p-1.5 shadow-xl animate-slide-up"
        >
          <DropdownMenuLabel class="px-2.5 py-2">
            <p class="truncate text-[13px] font-semibold">{{ auth.displayName }}</p>
            <p class="truncate text-[11px] text-muted">{{ auth.user?.userName }}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator class="my-1 h-px bg-line" />
          <DropdownMenuItem
            class="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] outline-none transition hover:bg-surface-2 focus:bg-surface-2"
            @select="router.push('/settings')"
          >
            <UserRound class="h-4 w-4 text-faint" />
            Mi perfil
          </DropdownMenuItem>
          <DropdownMenuItem
            class="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] outline-none transition hover:bg-surface-2 focus:bg-surface-2"
            @select="router.push('/settings')"
          >
            <Settings class="h-4 w-4 text-faint" />
            Preferencias
          </DropdownMenuItem>
          <DropdownMenuItem
            v-if="auth.isAdmin"
            class="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] outline-none transition hover:bg-surface-2 focus:bg-surface-2"
            @select="openAdmin"
          >
            <ShieldCheck class="h-4 w-4 text-faint" />
            Administración
          </DropdownMenuItem>
          <DropdownMenuSeparator class="my-1 h-px bg-line" />
          <DropdownMenuItem
            class="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-danger outline-none transition hover:bg-red-500/10 focus:bg-red-500/10"
            @select="logout"
          >
            <LogOut class="h-4 w-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
  </header>
</template>
