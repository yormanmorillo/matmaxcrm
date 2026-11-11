import { defineStore } from 'pinia'
import { getList } from '@/lib/api'
import type { EntityRecord } from '@/types/espocrm'

export const useReferenceStore = defineStore('reference', {
  state: () => ({
    users: [] as EntityRecord[],
    teams: [] as EntityRecord[],
    usersLoaded: false,
    teamsLoaded: false,
    usersLoading: false,
    teamsLoading: false,
  }),

  actions: {
    async loadUsers(force = false): Promise<void> {
      if ((this.usersLoaded && !force) || this.usersLoading) return
      this.usersLoading = true
      try {
        const data = await getList('User', {
          maxSize: 200,
          orderBy: 'userName',
          order: 'asc',
          select: 'name,userName,firstName,lastName,isActive,type,emailAddress,avatar,teamsIds',
        })
        this.users = data.list
        this.usersLoaded = true
      } catch {
        this.users = []
      } finally {
        this.usersLoading = false
      }
    },

    async loadTeams(force = false): Promise<void> {
      if ((this.teamsLoaded && !force) || this.teamsLoading) return
      this.teamsLoading = true
      try {
        const data = await getList('Team', {
          maxSize: 200,
          orderBy: 'name',
          order: 'asc',
          select: 'name,description',
        })
        this.teams = data.list
        this.teamsLoaded = true
      } catch {
        this.teams = []
      } finally {
        this.teamsLoading = false
      }
    },

    userById(id: unknown): EntityRecord | null {
      return this.users.find((user) => user.id === id) ?? null
    },

    teamById(id: unknown): EntityRecord | null {
      return this.teams.find((team) => team.id === id) ?? null
    },
  },
})
