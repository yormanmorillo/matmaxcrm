<script setup lang="ts">
import EntityListPage from '@/components/crm/EntityListPage.vue'
import { ACCOUNT_CONFIG } from '@/lib/constants'
</script>

<template>
  <EntityListPage :config="ACCOUNT_CONFIG" title="Empresas" />
</template>
