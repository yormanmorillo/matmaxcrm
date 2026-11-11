<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { MessageSquare, Send } from 'lucide-vue-next'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import AppEmpty from '@/components/ui/AppEmpty.vue'
import { request } from '@/lib/api'
import { relativeTime } from '@/lib/format'
import { useUiStore } from '@/stores/ui'

const props = withDefaults(
  defineProps<{
    parentType: string
    parentId: string
    canPost?: boolean
  }>(),
  { canPost: true },
)

const ui = useUiStore()
const loading = ref(true)
const error = ref('')
const posts = ref<Record<string, unknown>[]>([])
const note = ref('')
const sending = ref(false)

function authorName(post: Record<string, unknown>): string {
  const createdBy = post.createdBy as { name?: string } | string | null | undefined
  if (createdBy && typeof createdBy === 'object') return String(createdBy.name ?? 'Sistema')
  if (typeof createdBy === 'string') return createdBy
  return 'Sistema'
}

function eventLabel(post: Record<string, unknown>): string {
  switch (post.type) {
    case 'Post':
      return ''
    case 'Create':
      return 'creó el registro'
    case 'Update':
      return 'actualizó el registro'
    case 'Status':
      return 'cambió el estado'
    case 'Assign':
      return 'cambió la asignación'
    case 'EmailReceived':
      return 'recibió un email'
    case 'EmailSent':
      return 'envió un email'
    default:
      return 'registró una actualización'
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const data = await request<{ list: Record<string, unknown>[] }>(`/${props.parentType}/${props.parentId}/stream`, {
      params: { maxSize: 30 },
    })
    posts.value = data.list ?? []
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar el historial.'
  } finally {
    loading.value = false
  }
}

async function submit(): Promise<void> {
  const text = note.value.trim()
  if (!text) return
  sending.value = true
  try {
    await request('/Note', {
      method: 'POST',
      body: { type: 'Post', parentId: props.parentId, parentType: props.parentType, post: text },
    })
    note.value = ''
    await load()
    ui.toast('success', 'Nota publicada')
  } catch (err) {
    ui.toast('error', 'No se pudo publicar la nota', err instanceof Error ? err.message : undefined)
  } finally {
    sending.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div v-if="canPost" class="rounded-xl border border-line bg-surface-2/50 p-3">
      <AppTextarea v-model="note" :rows="2" placeholder="Escribe una nota interna…" />
      <div class="mt-2 flex justify-end">
        <AppButton size="sm" variant="primary" :loading="sending" :disabled="!note.trim()" @click="submit">
          <Send class="h-3.5 w-3.5" />
          Publicar
        </AppButton>
      </div>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="index in 3" :key="index" class="skeleton h-16" />
    </div>
    <div v-else-if="error" class="text-[12px] text-danger">{{ error }}</div>
    <div v-else-if="posts.length" class="space-y-3">
      <article v-for="post in posts" :key="String(post.id)" class="flex gap-3">
        <AppAvatar :name="authorName(post)" size="sm" />
        <div class="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 py-2.5">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[12px] font-medium">{{ authorName(post) }}</p>
            <span class="text-[10px] text-faint">{{ relativeTime(post.createdAt) }}</span>
          </div>
          <p v-if="post.type === 'Post'" class="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-muted">
            {{ post.post }}
          </p>
          <p v-else class="mt-1 text-[11px] text-muted">
            {{ eventLabel(post) }}
            <span v-if="post.data" class="text-faint">· {{ post.data }}</span>
          </p>
        </div>
      </article>
    </div>
    <AppEmpty
      v-else
      compact
      title="Sin historial"
      description="Las notas y cambios del registro aparecerán aquí."
    >
      <template #icon><MessageSquare class="h-4 w-4" /></template>
    </AppEmpty>
  </div>
</template>
