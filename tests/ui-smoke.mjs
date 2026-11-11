import { chromium } from 'playwright'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const baseURL = 'https://crm.matmax.site'
const user = process.env.ADMIN_USER
const pass = process.env.ADMIN_PASS
const out = fileURLToPath(new URL('../docs/screenshots', import.meta.url))
fs.mkdirSync(out, { recursive: true })

const errors = []
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' })
const page = await context.newPage()
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
})
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))

async function shot(name, fullPage = true) {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage })
  console.log('shot', name)
}

try {
  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' })
  await page.waitForSelector('#login-user', { timeout: 15000 })
  await shot('01-login')

  await page.fill('#login-user', user)
  await page.fill('#login-password', pass)
  await page.getByRole('button', { name: /Iniciar sesión/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 })
  await page.waitForSelector('h1', { timeout: 20000 })
  await page.waitForTimeout(1500)
  console.log('url after login:', page.url())
  console.log('h1:', await page.locator('h1').first().innerText())
  await shot('02-dashboard')

  await page.goto(`${baseURL}/contacts`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  console.log('contacts h1:', await page.locator('h1').first().innerText())
  console.log('rows:', await page.locator('tbody tr').count())
  await shot('03-contacts')

  await page.goto(`${baseURL}/pipeline`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  console.log('pipeline h1:', await page.locator('h1').first().innerText())
  console.log('cards:', await page.locator('article').count())
  await shot('04-pipeline')

  await page.goto(`${baseURL}/opportunities`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await shot('05-opportunities')

  await page.goto(`${baseURL}/users`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  console.log('users h1:', await page.locator('h1').first().innerText())
  await shot('06-users')

  await page.goto(`${baseURL}/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot('07-settings')

  await page.goto(`${baseURL}/pending/whatsapp`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot('08-pending')

  // Dark mode
  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const themeButton = page.locator('header button[aria-label*="modo"]').first()
  await themeButton.click()
  await page.waitForTimeout(500)
  await shot('09-dashboard-dark')

  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
  console.log('dark:', isDark)
} catch (err) {
  console.error('TEST ERROR:', err.message)
  await page.screenshot({ path: `${out}/error.png`, fullPage: true }).catch(() => {})
} finally {
  console.log('ERRORS:', errors.length ? JSON.stringify(errors, null, 2) : 'none')
  await browser.close()
}
