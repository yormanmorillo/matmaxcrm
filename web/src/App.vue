<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import ToastHost from '@/components/ui/ToastHost.vue'
import ConfirmHost from '@/components/ui/ConfirmHost.vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()

function onUnauthorized(): void {
  if (route.name === 'login') return
  auth.logout()
  ui.toast('error', 'Sesión finalizada', 'Vuelve a iniciar sesión para continuar.')
  router.push({ name: 'login', query: { redirect: route.fullPath } })
}

function onKeydown(event: KeyboardEvent): void {
  const modifier = event.metaKey || event.ctrlKey
  if (modifier && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    ui.commandOpen = !ui.commandOpen
  }
}

onMounted(() => {
  window.addEventListener('matmax:unauthorized', onUnauthorized)
  window.addEventListener('keydown', onKeydown)
  ui.applyTheme()
})

onBeforeUnmount(() => {
  window.removeEventListener('matmax:unauthorized', onUnauthorized)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <RouterView />
  <ToastHost />
  <ConfirmHost />
</template>
