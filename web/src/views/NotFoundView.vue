<script setup lang="ts">
import { Compass } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'

const router = useRouter()
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <div class="max-w-md text-center">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-faint">
        <Compass class="h-6 w-6" />
      </div>
      <p class="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">Error 404</p>
      <h1 class="mt-2 text-[26px] font-semibold tracking-tight">Página no encontrada</h1>
      <p class="mt-2 text-[13px] leading-relaxed text-muted">
        La ruta no existe o el registro ha sido eliminado.
      </p>
      <div class="mt-5 flex justify-center gap-2">
        <AppButton variant="primary" @click="router.push('/')">Ir al dashboard</AppButton>
      </div>
    </div>
  </div>
</template>
