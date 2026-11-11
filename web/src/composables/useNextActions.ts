import { computed, onMounted, ref, watch, type Ref } from 'vue'
import { getList } from '@/lib/api'
import { parseDate } from '@/lib/format'
import type { EntityRecord } from '@/types/espocrm'

export interface NextAction {
  id: string
  type: 'Task' | 'Call' | 'Meeting'
  name: string
  date: string
  overdue: boolean
}

const ACTIVITY_TYPES = ['Task', 'Call', 'Meeting'] as const

function isOpen(activity: EntityRecord): boolean {
  if (activity._scope === 'Task') return !['Completed', 'Canceled'].includes(String(activity.status))
  return activity.status === 'Planned'
}

function actionDate(activity: EntityRecord): string {
  return String(activity._scope === 'Task' ? activity.dateEnd ?? '' : activity.dateStart ?? activity.dateEnd ?? '')
}

/**
 * Carga actividades abiertas y calcula la próxima acción de cada oportunidad.
 * Se apoya en accountId/contactId (derivados de parentId en EspoCRM 10).
 */
export function useNextActions(opportunities: Ref<EntityRecord[]>) {
  const actions = ref<Record<string, NextAction>>({})
  const loading = ref(false)
  const error = ref('')

  async function load(): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      const responses = await Promise.all(
        ACTIVITY_TYPES.map((type) =>
          getList(type, {
            maxSize: 200,
            orderBy: type === 'Task' ? 'dateEnd' : 'dateStart',
            order: 'asc',
            select:
              type === 'Task'
                ? 'name,status,dateEnd,parentId,parentType,accountId,contactId,assignedUserName'
                : 'name,status,dateStart,dateEnd,parentId,parentType,accountId,contactId,assignedUserName',
          }),
        ),
      )

      const byContact = new Map<string, NextAction[]>()
      const byAccount = new Map<string, NextAction[]>()

      responses.forEach((response, index) => {
        const type = ACTIVITY_TYPES[index]
        for (const raw of response.list) {
          const activity: EntityRecord = { ...raw, _scope: type }
          if (!isOpen(activity)) continue
          const date = actionDate(activity)
          if (!date || !parseDate(date)) continue
          const action: NextAction = {
            id: activity.id,
            type,
            name: String(activity.name ?? ''),
            date,
            overdue: (parseDate(date)?.getTime() ?? 0) < Date.now(),
          }
          const contactKey = activity.parentType === 'Contact' ? activity.parentId : activity.contactId
          const accountKey = activity.parentType === 'Account' ? activity.parentId : null
          if (contactKey) {
            const list = byContact.get(String(contactKey)) ?? []
            list.push(action)
            byContact.set(String(contactKey), list)
          }
          if (accountKey) {
            const list = byAccount.get(String(accountKey)) ?? []
            list.push(action)
            byAccount.set(String(accountKey), list)
          }
        }
      })

      const next: Record<string, NextAction> = {}
      for (const opportunity of opportunities.value) {
        const contact = opportunity.contactId ? byContact.get(String(opportunity.contactId)) ?? [] : []
        const account = opportunity.accountId ? byAccount.get(String(opportunity.accountId)) ?? [] : []
        const candidates = [...contact, ...account]
        const unique = [...new Map(candidates.map((item) => [item.id, item])).values()]
        unique.sort((a, b) => (parseDate(a.date)?.getTime() ?? 0) - (parseDate(b.date)?.getTime() ?? 0))
        if (unique.length) next[opportunity.id] = unique[0]
      }
      actions.value = next
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'No se pudieron cargar las próximas acciones.'
      actions.value = {}
    } finally {
      loading.value = false
    }
  }

  watch(
    () => opportunities.value.map((item) => item.id).join(','),
    () => void load(),
  )

  onMounted(load)

  return {
    actions,
    loading,
    error,
    load,
    actionFor: (id: string): NextAction | undefined => actions.value[id],
    overdueCount: computed(() => Object.values(actions.value).filter((action) => action.overdue).length),
  }
}
