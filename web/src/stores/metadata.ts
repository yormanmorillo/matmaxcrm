import { defineStore } from 'pinia'
import { request } from '@/lib/api'
import type { EntityDef, FieldDef, MetadataResponse } from '@/types/espocrm'

export const useMetadataStore = defineStore('metadata', {
  state: () => ({
    entityDefs: {} as Record<string, EntityDef>,
    loaded: false,
    loading: false as boolean | null,
    error: '',
  }),

  getters: {
    fields: (state) => (entity: string): Record<string, FieldDef> => state.entityDefs[entity]?.fields ?? {},
  },

  actions: {
    async load(force = false): Promise<void> {
      if (this.loaded && !force) return
      if (this.loading) {
        while (this.loading) await new Promise((resolve) => window.setTimeout(resolve, 60))
        return
      }
      this.loading = true
      this.error = ''
      try {
        const data = await request<MetadataResponse>('/Metadata')
        this.entityDefs = data.entityDefs ?? {}
        this.loaded = true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'No se pudo cargar la metadata.'
      } finally {
        this.loading = false
      }
    },

    field(entity: string, name: string): FieldDef | null {
      return this.entityDefs[entity]?.fields?.[name] ?? null
    },

    options(entity: string, name: string): string[] {
      return this.entityDefs[entity]?.fields?.[name]?.options ?? []
    },

    customFields(entity: string): string[] {
      const fields = this.entityDefs[entity]?.fields ?? {}
      return Object.entries(fields)
        .filter(([, def]) => def.isCustom)
        .map(([name]) => name)
    },
  },
})
