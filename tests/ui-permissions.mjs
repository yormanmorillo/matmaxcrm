import { chromium, request } from 'playwright'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const base = 'https://crm.matmax.site'
const out = fileURLToPath(new URL('../docs/screenshots', import.meta.url))
fs.mkdirSync(out, { recursive: true })
const suffix = Date.now().toString().slice(-5)
const results = []
const errors = []
const b64 = (s) => Buffer.from(s).toString('base64')

const api = await request.newContext({ baseURL: base })
let adminAuth = ''
async function call(method, path, body, auth = adminAuth) {
  const res = await api.fetch(`/api/v1${path}`, {
    method,
    headers: { 'Espo-Authorization': auth, 'Content-Type': 'application/json' },
    data: body,
  })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { /* ignore */ }
  if (!res.ok()) throw new Error(`${method} ${path} -> ${res.status()} ${text.slice(0, 300)}`)
  return json
}

const created = { contacts: [], opportunities: [], user: null, account: null }
let browser

try {
  const login = await api.fetch('/api/v1/App/user', { headers: { 'Espo-Authorization': b64(`${process.env.ADMIN_USER}:${process.env.ADMIN_PASS}`) } })
  const loginJson = await login.json()
  adminAuth = b64(`${process.env.ADMIN_USER}:${loginJson.token}`)
  const adminId = loginJson.user.id

  const roles = await call('GET', '/Role?maxSize=20&select=name')
  const role = roles.list.find((r) => r.name === 'Ventas')
  const teams = await call('GET', '/Team?maxSize=20&select=name')
  const team = teams.list.find((t) => t.name === 'Comercial')
  const accounts = await call('GET', '/Account?maxSize=20&select=name')
  let account = accounts.list.find((a) => a.name === 'Nova Retail')
  if (!role || !team) throw new Error('Faltan rol/equipo base')
  if (!account) {
    account = await call('POST', '/Account', { name: `QA Account ${suffix}`, assignedUserId: adminId })
    created.account = account.id
  }

  const password = `Qa-${suffix}-Temp!`
  const qaUser = await call('POST', '/User', {
    userName: `qa.${suffix}`,
    firstName: 'QA',
    lastName: `Ventas ${suffix}`,
    type: 'regular',
    isActive: true,
    password,
    passwordConfirm: password,
    emailAddress: `qa.${suffix}@example.com`,
    rolesIds: [role.id],
    teamsIds: [team.id],
  })
  created.user = qaUser.id
  results.push(`usuario temporal creado: qa.${suffix}`)

  const visibleContact = await call('POST', '/Contact', {
    firstName: 'Visible',
    lastName: `QA ${suffix}`,
    emailAddress: `visible.${suffix}@example.com`,
    accountId: account.id,
    title: 'Rol QA',
    assignedUserId: qaUser.id,
    teamsIds: [team.id],
  })
  created.contacts.push(visibleContact.id)

  const hiddenContact = await call('POST', '/Contact', {
    firstName: 'Oculto',
    lastName: `Admin ${suffix}`,
    emailAddress: `oculto.${suffix}@example.com`,
    assignedUserId: adminId,
  })
  created.contacts.push(hiddenContact.id)

  const qaOpp = await call('POST', '/Opportunity', {
    name: `QA Opp ${suffix}`,
    accountId: account.id,
    stage: 'Prospecting',
    amount: 1500,
    probability: 20,
    closeDate: '2026-12-20',
    assignedUserId: qaUser.id,
    teamsIds: [team.id],
  })
  created.opportunities.push(qaOpp.id)

  const hiddenOpp = await call('POST', '/Opportunity', {
    name: `Admin Opp ${suffix}`,
    accountId: account.id,
    stage: 'Prospecting',
    amount: 9000,
    probability: 10,
    closeDate: '2026-12-21',
    assignedUserId: adminId,
  })
  created.opportunities.push(hiddenOpp.id)
  results.push('registros de prueba creados')

  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' })
  const page = await context.newPage()
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`) })
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  page.on('response', (res) => { if (res.status() >= 400 && !res.url().includes('/api/v1/Contact/')) errors.push(`http ${res.status()} ${res.url()}`) })

  await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
  await page.fill('#login-user', `qa.${suffix}`)
  await page.fill('#login-password', password)
  await page.getByRole('button', { name: /Iniciar sesión/i }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 })
  await page.waitForTimeout(1200)
  results.push('login QA OK')

  const navRoles = await page.locator('aside').getByText('Roles y permisos').count()
  const navAdmin = await page.locator('aside').getByText('Administración').count()
  results.push(`nav admin oculta: ${navRoles === 0 && navAdmin === 0 ? 'OK' : 'FALLO'}`)

  await page.goto(`${base}/contacts`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const visibleCount = await page.getByText(`Visible QA ${suffix}`, { exact: false }).count()
  const hiddenCount = await page.getByText(`Oculto Admin ${suffix}`, { exact: false }).count()
  results.push(`visibilidad contactos: visible=${visibleCount} oculto=${hiddenCount} ${visibleCount > 0 && hiddenCount === 0 ? 'OK' : 'FALLO'}`)
  await page.screenshot({ path: `${out}/14-qa-contacts.png`, fullPage: true })

  await page.getByText(`Visible QA ${suffix}`, { exact: false }).first().click()
  await page.waitForURL(/\/contacts\/.+/)
  await page.waitForTimeout(800)
  const deleteButtons = await page.locator('button:has(.lucide-trash-2)').count()
  results.push(`botón borrar oculto: ${deleteButtons === 0 ? 'OK' : 'FALLO'}`)

  const directDelete = await page.evaluate(async (contactId) => {
    const s = JSON.parse(sessionStorage.getItem('matmax.session'))
    const b = btoa(`${s.user.userName}:${s.token}`)
    const res = await fetch(`/api/v1/Contact/${contactId}`, { method: 'DELETE', headers: { 'Espo-Authorization': b } })
    return res.status
  }, visibleContact.id)
  results.push(`DELETE directo bloqueado: ${directDelete === 403 ? 'OK (403)' : `FALLO (${directDelete})`}`)

  await page.goto(`${base}/roles`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  const forbidden = await page.getByText('Acceso restringido').count()
  results.push(`ruta /roles bloqueada: ${forbidden > 0 ? 'OK' : 'FALLO'}`)
  await page.screenshot({ path: `${out}/15-qa-forbidden.png`, fullPage: true })

  await page.goto(`${base}/pipeline`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const qaCard = page.locator('article').filter({ hasText: `QA Opp ${suffix}` }).first()
  const hiddenCard = await page.locator('article').filter({ hasText: `Admin Opp ${suffix}` }).count()
  const hasQaCard = await qaCard.count()
  results.push(`pipeline QA: visible=${hasQaCard} oculto=${hiddenCard} ${hasQaCard > 0 && hiddenCard === 0 ? 'OK' : 'FALLO'}`)

  const targetColumn = page.locator('section').filter({ hasText: 'Negociación' }).first()
  if (hasQaCard) {
    await qaCard.dragTo(targetColumn)
    await page.waitForTimeout(1500)
  }
  const oppAfter = await call('GET', `/Opportunity/${qaOpp.id}?select=stage`)
  results.push(`QA edita etapa: ${oppAfter.stage === 'Negotiation' ? 'OK' : `FALLO (${oppAfter.stage})`}`)
  await page.screenshot({ path: `${out}/16-qa-kanban.png`, fullPage: true })
} catch (err) {
  results.push(`ERROR: ${err.message}`)
} finally {
  try {
    for (const id of created.contacts) await call('DELETE', `/Contact/${id}`)
    for (const id of created.opportunities) await call('DELETE', `/Opportunity/${id}`)
    if (created.user) await call('DELETE', `/User/${created.user}`)
    if (created.account) await call('DELETE', `/Account/${created.account}`)
    results.push('limpieza OK')
  } catch (err) {
    results.push(`LIMPIEZA ERROR: ${err.message}`)
  }
  console.log(results.join('\n'))
  console.log('ERRORS:', errors.length ? JSON.stringify([...new Set(errors)], null, 2) : 'none')
  if (browser) await browser.close()
  await api.dispose()
}
