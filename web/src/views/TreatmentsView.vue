<script setup lang="ts">
import EntityListPage from '@/components/crm/EntityListPage.vue'
import { TREATMENT_CONFIG } from '@/lib/constants'
</script>

<template>
  <EntityListPage :config="TREATMENT_CONFIG" title="Tratamientos" subtitle="Catálogo de servicios, precios y duración" />
</template>
