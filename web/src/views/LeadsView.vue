<script setup lang="ts">
import EntityListPage from '@/components/crm/EntityListPage.vue'
import { LEAD_CONFIG } from '@/lib/constants'
</script>

<template>
  <EntityListPage :config="LEAD_CONFIG" title="Leads" />
</template>
