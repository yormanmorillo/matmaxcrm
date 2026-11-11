<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Printer } from 'lucide-vue-next'
import { getRecord } from '@/lib/api'
import { currency, formatDate } from '@/lib/format'
import { statusMeta } from '@/lib/constants'
import type { EntityRecord } from '@/types/espocrm'

interface PrintLine {
  name: string
  qty: number
  price: number
}

const route = useRoute()
const router = useRouter()
const quote = ref<EntityRecord | null>(null)
const loading = ref(true)
const error = ref('')

const lines = computed<PrintLine[]>(() => {
  try {
    const parsed = typeof quote.value?.items === 'string' ? JSON.parse(String(quote.value.items)) : quote.value?.items
    if (!Array.isArray(parsed)) return []
    return parsed.map((line) => ({
      name: String(line.name ?? ''),
      qty: Number(line.qty ?? line.quantity ?? 1),
      price: Number(line.price ?? line.unitPrice ?? 0),
    }))
  } catch {
    return []
  }
})

const subtotal = computed(() => Number(quote.value?.subtotal ?? lines.value.reduce((sum, line) => sum + line.qty * line.price, 0)))
const taxRate = computed(() => Number(quote.value?.taxRate ?? 0))
const taxAmount = computed(() => Number(quote.value?.taxAmount ?? subtotal.value * (taxRate.value / 100)))
const total = computed(() => Number(quote.value?.total ?? subtotal.value + taxAmount.value))
const number = computed(() => `COT-${String(quote.value?.id ?? '').slice(-6).toUpperCase()}`)

function print(): void {
  window.print()
}

onMounted(async () => {
  try {
    quote.value = await getRecord<EntityRecord>('CCQuote', String(route.params.id), {
      select:
        'name,status,total,subtotal,taxRate,taxAmount,validUntil,items,notes,opportunityName,accountName,contactName,createdAt',
    })
    document.title = `Presupuesto · ${quote.value.name ?? ''}`
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar el presupuesto.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:px-0 print:py-0">
    <div class="mx-auto max-w-4xl">
      <div class="mb-4 flex items-center justify-between print:hidden">
        <button type="button" class="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-900" @click="router.push('/quotes')">
          <ArrowLeft class="h-4 w-4" />
          Volver a presupuestos
        </button>
        <button type="button" class="flex items-center gap-2 rounded-lg bg-emerald-700 px-3.5 py-2 text-[12px] font-medium text-white hover:bg-emerald-800" @click="print">
          <Printer class="h-4 w-4" />
          Imprimir / Guardar PDF
        </button>
      </div>

      <div v-if="loading" class="rounded-2xl bg-white p-16 text-center text-slate-400">Cargando presupuesto…</div>
      <div v-else-if="error" class="rounded-2xl bg-white p-8 text-sm text-red-600">{{ error }}</div>

      <article v-else-if="quote" class="rounded-2xl bg-white p-8 shadow-sm print:rounded-none print:p-0 print:shadow-none">
        <header class="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div>
            <p class="text-[22px] font-bold tracking-[0.14em] text-slate-900">MATMAX</p>
            <p class="mt-1 text-[10px] font-semibold tracking-[0.25em] text-emerald-700">CRM · COSTA RICA</p>
            <p class="mt-4 text-[11px] leading-relaxed text-slate-500">
              Soluciones comerciales y tecnológicas<br />
              San José, Costa Rica<br />
              crm.matmax.site
            </p>
          </div>
          <div class="text-right">
            <p class="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Presupuesto</p>
            <p class="mt-1 text-[20px] font-semibold text-slate-900">{{ number }}</p>
            <p class="mt-2 text-[11px] text-slate-500">Emitido: {{ formatDate(quote.createdAt) }}</p>
            <p class="text-[11px] text-slate-500">Válido hasta: {{ quote.validUntil ? formatDate(quote.validUntil) : '—' }}</p>
            <span class="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700 print:border print:border-emerald-200">
              {{ statusMeta('CCQuote', quote.status).label }}
            </span>
          </div>
        </header>

        <section class="grid grid-cols-1 gap-6 border-b border-slate-200 py-6 sm:grid-cols-2">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Cliente</p>
            <p class="mt-1.5 text-[14px] font-medium text-slate-900">{{ quote.accountName || '—' }}</p>
            <p v-if="quote.contactName" class="mt-0.5 text-[12px] text-slate-500">{{ quote.contactName }}</p>
          </div>
          <div class="sm:text-right">
            <p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Oportunidad</p>
            <p class="mt-1.5 text-[13px] text-slate-700">{{ quote.opportunityName || '—' }}</p>
            <p class="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Concepto</p>
            <p class="mt-1 text-[12px] text-slate-700">{{ quote.name }}</p>
          </div>
        </section>

        <section class="py-6">
          <table class="w-full text-left">
            <thead>
              <tr class="border-b border-slate-200 text-[10px] uppercase tracking-[0.08em] text-slate-400">
                <th class="pb-2 font-semibold">Tratamiento</th>
                <th class="pb-2 text-center font-semibold">Cant.</th>
                <th class="pb-2 text-right font-semibold">Precio unitario</th>
                <th class="pb-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, index) in lines" :key="index" class="border-b border-slate-100 text-[12px] text-slate-700">
                <td class="py-3">{{ line.name }}</td>
                <td class="py-3 text-center">{{ line.qty }}</td>
                <td class="py-3 text-right tabular-nums">{{ currency(line.price) }}</td>
                <td class="py-3 text-right font-medium tabular-nums">{{ currency(line.qty * line.price) }}</td>
              </tr>
              <tr v-if="!lines.length">
                <td colspan="4" class="py-6 text-center text-[12px] text-slate-400">Sin líneas registradas.</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="flex justify-end border-t border-slate-200 pt-5">
          <div class="w-full max-w-xs space-y-1.5 text-[12px]">
            <div class="flex justify-between text-slate-500"><span>Subtotal</span><span class="tabular-nums">{{ currency(subtotal) }}</span></div>
            <div class="flex justify-between text-slate-500"><span>IVA ({{ taxRate }}%)</span><span class="tabular-nums">{{ currency(taxAmount) }}</span></div>
            <div class="flex justify-between border-t border-slate-200 pt-2 text-[15px] font-semibold text-slate-900"><span>Total</span><span class="tabular-nums">{{ currency(total) }}</span></div>
          </div>
        </section>

        <section v-if="quote.notes" class="mt-6 rounded-lg bg-slate-50 p-4 print:border print:border-slate-200">
          <p class="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Notas y condiciones</p>
          <p class="mt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">{{ quote.notes }}</p>
        </section>

        <footer class="mt-8 border-t border-slate-200 pt-4 text-center text-[10px] leading-relaxed text-slate-400">
          Gracias por su confianza. Este presupuesto es válido hasta la fecha indicada.<br />
          MATMAX CRM · Costa Rica · crm.matmax.site
        </footer>
      </article>
    </div>
  </div>
</template>

<style>
@media print {
  @page {
    size: A4;
    margin: 14mm;
  }
  body {
    background: #fff !important;
  }
}
</style>
