import { onMounted, ref, watch, type Ref } from 'vue'
import { getList } from '@/lib/api'
import type { EntityRecord } from '@/types/espocrm'
import type { EntityConfig } from '@/lib/constants'

export interface WhereClause {
  type: string
  field?: string
  value?: unknown
  [key: string]: unknown
}

export function useEntityList(config: EntityConfig, extraWhere?: Ref<WhereClause[]>) {
  const rows = ref<EntityRecord[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(25)
  const search = ref('')
  const loading = ref(true)
  const error = ref('')
  let searchTimer: number | undefined

  async function load(): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      const where: WhereClause[] = []
      if (search.value.trim()) {
        where.push({ type: 'textFilter', value: search.value.trim() })
      }
      if (extraWhere?.value?.length) where.push(...extraWhere.value)

      const data = await getList(config.entity, {
        maxSize: pageSize.value,
        offset: (page.value - 1) * pageSize.value,
        orderBy: config.defaultOrderBy,
        order: config.defaultOrder ?? 'desc',
        select: config.select,
        where: where.length ? where : undefined,
      })
      rows.value = data.list
      total.value = data.total >= 0 ? data.total : data.list.length
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'No se pudieron cargar los datos.'
      rows.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  watch(search, () => {
    window.clearTimeout(searchTimer)
    searchTimer = window.setTimeout(() => {
      page.value = 1
      void load()
    }, 280)
  })

  watch([page, pageSize], () => {
    void load()
  })

  if (extraWhere) {
    watch(
      extraWhere,
      () => {
        page.value = 1
        void load()
      },
      { deep: true },
    )
  }

  onMounted(load)

  return {
    rows,
    total,
    page,
    pageSize,
    search,
    loading,
    error,
    load,
    refresh: load,
  }
}
