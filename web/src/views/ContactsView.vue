<script setup lang="ts">
import EntityListPage from '@/components/crm/EntityListPage.vue'
import { CONTACT_CONFIG } from '@/lib/constants'
</script>

<template>
  <EntityListPage :config="CONTACT_CONFIG" title="Contactos" />
</template>
