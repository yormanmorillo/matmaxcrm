<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import AppAvatar from '@/components/ui/AppAvatar.vue'

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    backTo: string
    backLabel?: string
    avatarName?: string
    square?: boolean
    loading?: boolean
  }>(),
  { subtitle: '', backLabel: 'Volver', avatarName: '', square: false, loading: false },
)

const router = useRouter()
</script>

<template>
  <div class="space-y-4">
    <button
      type="button"
      class="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted transition hover:text-brand"
      @click="router.push(backTo)"
    >
      <ArrowLeft class="h-3.5 w-3.5" />
      {{ backLabel }}
    </button>

    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex min-w-0 items-start gap-3.5">
        <template v-if="loading">
          <div class="skeleton h-14 w-14 rounded-2xl" />
          <div class="space-y-2">
            <div class="skeleton h-7 w-52" />
            <div class="skeleton h-4 w-36" />
          </div>
        </template>
        <template v-else>
          <AppAvatar :name="avatarName || title" size="xl" :square="square" />
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="truncate text-[26px] font-semibold leading-tight tracking-[-0.02em]">{{ title }}</h1>
              <slot name="badges" />
            </div>
            <p v-if="subtitle" class="mt-1 text-[13px] text-muted">{{ subtitle }}</p>
            <div v-if="$slots.meta" class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-faint">
              <slot name="meta" />
            </div>
          </div>
        </template>
      </div>
      <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
