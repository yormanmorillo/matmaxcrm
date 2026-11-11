<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'

const ui = useUiStore()

function close(): void {
  ui.answerConfirm(false)
}
</script>

<template>
  <AppModal v-model:open="ui.confirm.open" :title="ui.confirm.title" size="sm" hide-close :layer="120" @update:open="(value) => !value && close()">
    <p class="text-sm leading-relaxed text-muted">{{ ui.confirm.message }}</p>
    <template #footer>
      <AppButton variant="secondary" @click="close">{{ ui.confirm.cancelLabel }}</AppButton>
      <AppButton
        :variant="ui.confirm.tone === 'danger' ? 'danger' : 'primary'"
        @click="ui.answerConfirm(true)"
      >
        {{ ui.confirm.confirmLabel }}
      </AppButton>
    </template>
  </AppModal>
</template>
