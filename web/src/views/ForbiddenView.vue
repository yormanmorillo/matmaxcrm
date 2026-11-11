<script setup lang="ts">
import { ShieldX } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'

const router = useRouter()
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <div class="max-w-md text-center">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
        <ShieldX class="h-6 w-6" />
      </div>
      <p class="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">Error 403</p>
      <h1 class="mt-2 text-[26px] font-semibold tracking-tight">Acceso restringido</h1>
      <p class="mt-2 text-[13px] leading-relaxed text-muted">
        Tu rol no tiene permiso de lectura para este módulo. Si necesitas acceso, contacta con el administrador.
      </p>
      <div class="mt-5 flex justify-center gap-2">
        <AppButton variant="primary" @click="router.push('/')">Volver al dashboard</AppButton>
      </div>
    </div>
  </div>
</template>
