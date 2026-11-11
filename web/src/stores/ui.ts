import { defineStore } from 'pinia'
import type { Tone } from '@/lib/constants'

export interface ToastItem {
  id: number
  type: 'success' | 'error' | 'info'
  title: string
  description?: string
}

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: Tone | 'danger'
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
}

let confirmResolver: ((value: boolean) => void) | null = null
let toastSeed = 0

function initialTheme(): 'light' | 'dark' {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) return 'dark'
  return 'light'
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    theme: initialTheme() as 'light' | 'dark',
    sidebarCollapsed: localStorage.getItem('matmax.sidebar') === 'collapsed',
    mobileNavOpen: false,
    commandOpen: false,
    toasts: [] as ToastItem[],
    confirm: {
      open: false,
      title: '',
      message: '',
      confirmLabel: 'Confirmar',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    } as ConfirmState,
  }),

  actions: {
    applyTheme(): void {
      const dark = this.theme === 'dark'
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
      localStorage.setItem('matmax-theme', this.theme)
    },

    toggleTheme(): void {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      this.applyTheme()
    },

    toggleSidebar(): void {
      this.sidebarCollapsed = !this.sidebarCollapsed
      localStorage.setItem('matmax.sidebar', this.sidebarCollapsed ? 'collapsed' : 'expanded')
    },

    toast(type: ToastItem['type'], title: string, description?: string): void {
      const id = ++toastSeed
      this.toasts.push({ id, type, title, description })
      window.setTimeout(() => this.dismissToast(id), 4200)
    },

    dismissToast(id: number): void {
      this.toasts = this.toasts.filter((toast) => toast.id !== id)
    },

    askConfirm(options: ConfirmOptions): Promise<boolean> {
      if (confirmResolver) {
        confirmResolver(false)
        confirmResolver = null
      }
      this.confirm = {
        open: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Confirmar',
        cancelLabel: options.cancelLabel ?? 'Cancelar',
        tone: options.tone ?? 'danger',
      }
      return new Promise<boolean>((resolve) => {
        confirmResolver = resolve
      })
    },

    answerConfirm(value: boolean): void {
      this.confirm.open = false
      if (confirmResolver) {
        confirmResolver(value)
        confirmResolver = null
      }
    },
  },
})
