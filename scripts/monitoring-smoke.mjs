const baseUrl = (process.env.MONITORING_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '')
const failures = []

async function check(name, path, expected) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual' }).catch(error => {
    failures.push(`${name}: ${error.message}`)
    return null
  })
  if (!response) return
  const ok = expected(response)
  if (!ok) failures.push(`${name}: unexpected ${response.status}`)
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${response.status}`)
}

await check('health endpoint', '/api/health', response => response.status === 200)
await check('login uptime', '/login', response => response.status === 200)
await check('dashboard auth gate', '/dashboard', response => [200, 302, 307, 308].includes(response.status))

if (failures.length) {
  failures.forEach(failure => console.error(failure))
  process.exit(1)
}

console.log(`Monitoring smoke passed for ${baseUrl}`)
