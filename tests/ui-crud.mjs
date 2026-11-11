import { chromium } from 'playwright'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const base = 'https://crm.matmax.site'
const out = fileURLToPath(new URL('../docs/screenshots', import.meta.url))
fs.mkdirSync(out, { recursive: true })
const suffix = Date.now().toString().slice(-5)
const contactName = `Prueba UI ${suffix}`
const oppName = `Oportunidad UI ${suffix}`
const errors = []
const results = []

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' })
const page = await context.newPage()
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`) })
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
page.on('response', (res) => { if (res.status() >= 400) errors.push(`http ${res.status()} ${res.url()}`) })

async function login() {
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
  await page.fill('#login-user', process.env.ADMIN_USER)
  await page.fill('#login-password', process.env.ADMIN_PASS)
  await page.getByRole('button', { name: /Iniciar sesión/i }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 })
  await page.waitForTimeout(800)
}

try {
  await login()
  results.push('login OK')

  // Create contact
  await page.goto(`${base}/contacts`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Nuevo contacto/i }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor({ state: 'visible' })
  await dialog.getByPlaceholder('Nombre', { exact: true }).fill('Prueba')
  await dialog.getByPlaceholder('Apellidos').fill(`UI ${suffix}`)
  await dialog.getByPlaceholder('nombre@empresa.com').fill(`prueba.${suffix}@example.com`)
  await dialog.getByPlaceholder('+34 600 000 000').fill('+34 600 123 456')
  await dialog.getByRole('button', { name: /Crear contacto/i }).click()
  await dialog.waitFor({ state: 'hidden', timeout: 15000 })
  await page.waitForTimeout(800)
  results.push('contacto creado')

  // Global search while the record exists
  await page.keyboard.press('Control+k')
  const palette = page.getByRole('dialog')
  await palette.waitFor({ state: 'visible' })
  await palette.getByPlaceholder(/Buscar contactos/i).fill(`UI ${suffix}`)
  await page.waitForTimeout(1200)
  const hits = await palette.getByText(`Prueba UI ${suffix}`, { exact: false }).count()
  results.push(`búsqueda global: ${hits > 0 ? 'OK' : 'FALLO'}`)
  await page.screenshot({ path: `${out}/13-global-search.png`, fullPage: true })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  await page.getByPlaceholder(/Buscar contactos/i).fill(`UI ${suffix}`)
  await page.waitForTimeout(1000)
  const createdRow = page.locator('tbody tr', { hasText: `UI ${suffix}` }).first()
  await createdRow.waitFor({ state: 'visible', timeout: 10000 })
  await createdRow.click()
  await page.waitForURL(/\/contacts\/.+/)
  await page.waitForTimeout(800)
  const h1 = (await page.locator('h1').first().innerText()).trim()
  results.push(`ficha contacto: ${h1}`)
  await page.screenshot({ path: `${out}/10-contact-detail.png`, fullPage: true })

  // Edit contact
  await page.getByRole('button', { name: /^Editar$/ }).first().click()
  const editDialog = page.getByRole('dialog')
  await editDialog.waitFor({ state: 'visible' })
  const newEmail = `editado.${suffix}@example.com`
  await editDialog.getByPlaceholder('nombre@empresa.com').fill(newEmail)
  await editDialog.getByRole('button', { name: /Guardar cambios/i }).click()
  await editDialog.waitFor({ state: 'hidden', timeout: 15000 })
  await page.waitForTimeout(900)
  const emailVisible = await page.getByText(newEmail, { exact: true }).count()
  results.push(`edición contacto: ${emailVisible > 0 ? 'OK' : 'FALLO'}`)

  // Delete contact
  await page.locator('button:has(.lucide-trash-2)').first().click()
  const confirm = page.getByRole('dialog')
  await confirm.getByRole('button', { name: /Eliminar contacto/i }).click()
  await page.waitForURL(/\/contacts$/, { timeout: 15000 })
  await page.waitForTimeout(800)
  const stillThere = await page.locator('tbody tr', { hasText: `UI ${suffix}` }).count()
  results.push(`borrado contacto: ${stillThere === 0 ? 'OK' : 'FALLO'}`)

  // Create opportunity from pipeline
  await page.goto(`${base}/pipeline`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Nueva oportunidad/i }).first().click()
  const oppDialog = page.getByRole('dialog')
  await oppDialog.waitFor({ state: 'visible' })
  await oppDialog.getByPlaceholder('Nombre', { exact: true }).fill(oppName)
  const numbers = oppDialog.locator('input[type="number"]')
  await numbers.nth(0).fill('4500')
  await oppDialog.locator('input[type="date"]').fill('2026-12-31')
  await oppDialog.getByRole('button', { name: /Crear oportunidad/i }).click()
  await oppDialog.waitFor({ state: 'hidden', timeout: 15000 })
  await page.waitForTimeout(1200)
  const card = page.getByText(oppName, { exact: true }).first()
  await card.waitFor({ state: 'visible', timeout: 10000 })
  results.push('oportunidad creada')
  await page.screenshot({ path: `${out}/11-pipeline-created.png`, fullPage: true })

  // Drag card from Prospección to Negociación
  const targetColumn = page.locator('section').filter({ hasText: 'Negociación' }).first()
  const sourceCard = page.locator('article').filter({ hasText: oppName }).first()
  await sourceCard.dragTo(targetColumn)
  await page.waitForTimeout(1500)
  const negSection = page.locator('section').filter({ hasText: 'Negociación' }).first()
  const moved = await negSection.getByText(oppName, { exact: true }).count()
  results.push(`kanban drag: ${moved > 0 ? 'OK' : 'FALLO'}`)
  await page.screenshot({ path: `${out}/12-pipeline-drag.png`, fullPage: true })

  // Open detail and verify stage persisted
  await page.getByText(oppName, { exact: true }).first().click()
  await page.waitForURL(/\/opportunities\/.+/)
  await page.waitForTimeout(800)
  const stageValue = await page.locator('select').first().inputValue()
  results.push(`etapa persistida: ${stageValue}`)

  // Delete opportunity via detail
  await page.locator('button:has(.lucide-trash-2)').first().click()
  const delOpp = page.getByRole('dialog')
  await delOpp.getByRole('button', { name: /Eliminar oportunidad/i }).click()
  await page.waitForURL(/\/opportunities$/, { timeout: 15000 })
  results.push('oportunidad borrada')

} catch (err) {
  results.push(`ERROR: ${err.message}`)
  await page.screenshot({ path: `${out}/error-crud.png`, fullPage: true }).catch(() => {})
} finally {
  console.log(results.join('\n'))
  console.log('ERRORS:', errors.length ? JSON.stringify([...new Set(errors)], null, 2) : 'none')
  await browser.close()
}
