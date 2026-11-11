import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

export interface SavedView {
  id: string
  name: string
  state: Record<string, string>
  createdAt: string
}

function storageKey(context: string, userId: string): string {
  return `matmax.savedViews.${context}.${userId || 'anon'}`
}

function read(context: string, userId: string): SavedView[] {
  try {
    const raw = localStorage.getItem(storageKey(context, userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useSavedViews(context: string) {
  const auth = useAuthStore()
  const userId = auth.user?.id ?? ''
  const views = ref<SavedView[]>(read(context, userId))
  const sorted = computed(() => [...views.value].sort((a, b) => a.name.localeCompare(b.name, 'es')))

  function persist(): void {
    localStorage.setItem(storageKey(context, userId), JSON.stringify(views.value))
  }

  function save(name: string, state: Record<string, string>): SavedView {
    const view: SavedView = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      state,
      createdAt: new Date().toISOString(),
    }
    views.value = [...views.value, view]
    persist()
    return view
  }

  function remove(id: string): void {
    views.value = views.value.filter((view) => view.id !== id)
    persist()
  }

  function rename(id: string, name: string): void {
    views.value = views.value.map((view) => (view.id === id ? { ...view, name: name.trim() } : view))
    persist()
  }

  return { views: sorted, save, remove, rename }
}
