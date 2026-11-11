<script setup lang="ts">
export interface InfoItem {
  label: string
  value?: string | number | null
  full?: boolean
  href?: string
}

defineProps<{ items: InfoItem[] }>()
</script>

<template>
  <dl class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
    <div v-for="item in items" :key="item.label" :class="item.full && 'sm:col-span-2'">
      <dt class="text-[10px] font-semibold uppercase tracking-[0.07em] text-faint">{{ item.label }}</dt>
      <dd class="mt-1 text-[13px] leading-relaxed text-ink">
        <a v-if="item.href" :href="item.href" class="text-brand hover:underline">{{ item.value || '—' }}</a>
        <span v-else :class="!item.value && 'text-faint'">{{ item.value || '—' }}</span>
      </dd>
    </div>
  </dl>
</template>
