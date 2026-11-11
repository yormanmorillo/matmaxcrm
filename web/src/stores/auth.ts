import { defineStore } from 'pinia'
import { loginRequest } from '@/lib/api'
import { clearSession, loadSession, saveSession } from '@/lib/session'
import type { AclScope, Session } from '@/types/espocrm'

type AclAction = 'read' | 'create' | 'edit' | 'delete' | 'stream'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    session: loadSession() as Session | null,
    loading: false,
    error: '' as string,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.session?.token),
    user: (state) => state.session?.user ?? null,
    acl: (state) => state.session?.acl ?? null,
    isAdmin: (state) => state.session?.user?.type === 'admin',
    displayName: (state) => {
      const user = state.session?.user
      if (!user) return ''
      return (
        user.name ||
        [user.firstName, user.lastName].filter(Boolean).join(' ') ||
        user.userName
      )
    },
  },

  actions: {
    async login(userName: string, password: string): Promise<void> {
      this.loading = true
      this.error = ''
      try {
        const data = await loginRequest(userName.trim(), password)
        const session: Session = {
          token: data.token,
          user: data.user,
          acl: data.acl,
          preferences: data.preferences,
        }
        this.session = session
        saveSession(session)
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'No se pudo iniciar sesión.'
        throw error
      } finally {
        this.loading = false
      }
    },

    logout(): void {
      this.session = null
      clearSession()
    },

    scopeAcl(scope: string): AclScope | null {
      return this.session?.acl?.table?.[scope] ?? null
    },

    can(scope: string, action: AclAction): boolean {
      const acl = this.scopeAcl(scope)
      if (!acl) return false
      if (this.isAdmin) {
        if (action === 'create') return acl.create === 'yes' || acl.create === true
        return Boolean(acl[action]) && acl[action] !== 'no'
      }
      if (action === 'create') return acl.create === 'yes' || acl.create === true
      const value = acl[action]
      return Boolean(value) && value !== 'no'
    },

    canRead(scope: string): boolean {
      return this.can(scope, 'read')
    },
  },
})
