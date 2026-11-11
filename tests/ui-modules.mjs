import { chromium } from 'playwright'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
const base = 'https://crm.matmax.site'
const out = fileURLToPath(new URL('../docs/screenshots', import.meta.url))
fs.mkdirSync(out, { recursive: true })
const suffix = Date.now().toString().slice(-5)
const results = []
const errors = []
let browser

async function login(page) {
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
  await page.fill('#login-user', process.env.ADMIN_USER)
  await page.fill('#login-password', process.env.ADMIN_PASS)
  await page.getByRole('button', { name: /Iniciar sesión/i }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 })
  await page.waitForTimeout(900)
}

async function apiDelete(page, entity, id) {
  return page.evaluate(async ({ entity, id }) => {
    const s = JSON.parse(sessionStorage.getItem('matmax.session'))
    const b = btoa(`${s.user.userName}:${s.token}`)
    const r = await fetch(`/api/v1/${entity}/${id}`, { method: 'DELETE', headers: { 'Espo-Authorization': b } })
    return r.status
  }, { entity, id })
}

try {
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' })
  const page = await context.newPage()
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()} ${r.url()}`) })
  await login(page)
  results.push('login OK')

  const dataCounts = await page.evaluate(async () => {
    const s = JSON.parse(sessionStorage.getItem('matmax.session'))
    const b = btoa(`${s.user.userName}:${s.token}`)
    const get = async (e) => (await (await fetch(`/api/v1/${e}?maxSize=1&select=id`, { headers: { 'Espo-Authorization': b } })).json()).total
    return { accounts: await get('Account'), leads: await get('Lead'), opportunities: await get('Opportunity') }
  })
  if (dataCounts.accounts > 0) {
    await page.goto(`${base}/accounts`, { waitUntil: 'networkidle' })
    await page.locator('tbody tr').first().click()
    await page.waitForURL(/\/accounts\/.+/)
    await page.waitForTimeout(900)
    results.push(`empresa: ${(await page.locator('h1').first().innerText()).trim()}`)
    await page.getByRole('button', { name: 'Contactos', exact: true }).first().click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${out}/17-account-detail.png`, fullPage: true })
  } else {
    results.push('empresas: sin registros, se omite ficha (CRM limpio)')
  }
  if (dataCounts.leads > 0) {
    await page.goto(`${base}/leads`, { waitUntil: 'networkidle' })
    await page.locator('tbody tr').first().click()
    await page.waitForURL(/\/leads\/.+/)
    await page.waitForTimeout(800)
    results.push(`lead: ${(await page.locator('h1').first().innerText()).trim()}`)
    await page.screenshot({ path: `${out}/18-lead-detail.png`, fullPage: true })
  } else {
    results.push('leads: sin registros, se omite ficha (CRM limpio)')
  }
  if (dataCounts.opportunities > 0) {
    await page.goto(`${base}/opportunities`, { waitUntil: 'networkidle' })
    await page.locator('tbody tr').first().click()
    await page.waitForURL(/\/opportunities\/.+/)
    await page.waitForTimeout(900)
    results.push(`oportunidad: ${(await page.locator('h1').first().innerText()).trim()}`)
    await page.screenshot({ path: `${out}/19-opportunity-detail.png`, fullPage: true })
  } else {
    results.push('oportunidades: sin registros, se omite ficha (CRM limpio)')
  }

  // Create + complete task
  await page.goto(`${base}/activities`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Nueva tarea/i }).first().click()
  const taskDialog = page.getByRole('dialog')
  await taskDialog.waitFor({ state: 'visible' })
  const taskName = `Tarea E2E ${suffix}`
  await taskDialog.getByPlaceholder('Nombre', { exact: true }).fill(taskName)
  await taskDialog.getByRole('button', { name: /Crear tarea/i }).click()
  await taskDialog.waitFor({ state: 'hidden', timeout: 15000 })
  await page.waitForTimeout(1000)
  const taskRow = page.locator('div').filter({ hasText: taskName }).first()
  const taskVisible = await page.getByText(taskName, { exact: true }).count()
  results.push(`tarea creada: ${taskVisible > 0 ? 'OK' : 'FALLO'}`)
  const taskId = await page.evaluate(async (name) => {
    const s = JSON.parse(sessionStorage.getItem('matmax.session')); const b = btoa(`${s.user.userName}:${s.token}`)
    const r = await fetch(`/api/v1/Task?maxSize=5&where[0][type]=textFilter&where[0][value]=${encodeURIComponent(name)}`, { headers: { 'Espo-Authorization': b } })
    const j = await r.json(); return j.list[0]?.id
  }, taskName)
  if (taskId) {
    await page.getByText(taskName, { exact: true }).first().locator('xpath=ancestor::div[contains(@class,"flex")]').locator('button').last().click().catch(() => {})
    await page.waitForTimeout(1000)
    const status = await page.evaluate(async (id) => {
      const s = JSON.parse(sessionStorage.getItem('matmax.session')); const b = btoa(`${s.user.userName}:${s.token}`)
      const r = await fetch(`/api/v1/Task/${id}?select=status`, { headers: { 'Espo-Authorization': b } }); const j = await r.json(); return j.status
    }, taskId)
    results.push(`completar tarea: ${status === 'Completed' ? 'OK' : `FALLO (${status})`}`)
    await apiDelete(page, 'Task', taskId)
  }
  await page.screenshot({ path: `${out}/20-activities.png`, fullPage: true })

  // Calendar create meeting
  await page.goto(`${base}/calendar`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  const today = new Date()
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  await page.locator('button').filter({ hasText: new RegExp(`^${today.getDate()}$`) }).first().click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: /Reunión/i }).last().click()
  const meetDialog = page.getByRole('dialog')
  await meetDialog.waitFor({ state: 'visible' })
  const meetName = `Reunión E2E ${suffix}`
  await meetDialog.getByPlaceholder('Nombre', { exact: true }).fill(meetName)
  await meetDialog.getByRole('button', { name: /Crear reunión/i }).click()
  await meetDialog.waitFor({ state: 'hidden', timeout: 15000 })
  await page.waitForTimeout(1200)
  const meetVisible = await page.getByText(meetName, { exact: true }).count()
  results.push(`reunión creada: ${meetVisible > 0 ? 'OK' : 'FALLO'}`)
  await page.screenshot({ path: `${out}/21-calendar.png`, fullPage: true })
  const meetId = await page.evaluate(async (name) => {
    const s = JSON.parse(sessionStorage.getItem('matmax.session')); const b = btoa(`${s.user.userName}:${s.token}`)
    const r = await fetch(`/api/v1/Meeting?maxSize=5&where[0][type]=textFilter&where[0][value]=${encodeURIComponent(name)}`, { headers: { 'Espo-Authorization': b } })
    const j = await r.json(); return j.list[0]?.id
  }, meetName)
  if (meetId) await apiDelete(page, 'Meeting', meetId)

  await page.goto(`${base}/reports`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${out}/22-reports.png`, fullPage: true })
  results.push('informes OK')

  await page.goto(`${base}/settings/fields`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  results.push(`campos personalizados: ${(await page.locator('h1').first().innerText()).trim()}`)
  await page.goto(`${base}/settings/admin`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  results.push(`administración: ${(await page.locator('h1').first().innerText()).trim()}`)

  // Mobile
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-ES', isMobile: true, hasTouch: true })
  const mpage = await mobile.newPage()
  mpage.on('pageerror', (e) => errors.push(`mobile pageerror: ${e.message}`))
  mpage.on('response', (r) => { if (r.status() >= 400) errors.push(`mobile http ${r.status()} ${r.url()}`) })
  await login(mpage)
  await mpage.screenshot({ path: `${out}/23-mobile-dashboard.png`, fullPage: true })
  await mpage.getByRole('button', { name: /Abrir menú/i }).click()
  await mpage.waitForTimeout(500)
  await mpage.screenshot({ path: `${out}/24-mobile-sidebar.png`, fullPage: false })
  const navVisible = await mpage.locator('aside').getByText('Contactos', { exact: true }).isVisible()
  results.push(`menú móvil: ${navVisible ? 'OK' : 'FALLO'}`)
  await mobile.close()
} catch (err) {
  results.push(`ERROR: ${err.message}`)
} finally {
  console.log(results.join('\n'))
  console.log('ERRORS:', errors.length ? JSON.stringify([...new Set(errors)], null, 2) : 'none')
  if (browser) await browser.close()
}
