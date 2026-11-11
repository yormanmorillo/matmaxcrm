<script setup lang="ts">
import EntityListPage from '@/components/crm/EntityListPage.vue'
import { OPPORTUNITY_CONFIG } from '@/lib/constants'
</script>

<template>
  <EntityListPage :config="OPPORTUNITY_CONFIG" title="Oportunidades" />
</template>
