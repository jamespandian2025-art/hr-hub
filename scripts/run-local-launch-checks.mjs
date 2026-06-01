import { spawn } from 'node:child_process'

const checks = [
  { script: 'lint', label: 'ESLint' },
  { script: 'check:types', label: 'TypeScript' },
  { script: 'build', label: 'Production build' },
  { script: 'check:security', label: 'Security checks' },
  { script: 'check:hrms', label: 'HR/payroll business rules' },
  { script: 'check:roles', label: 'Role-based QA' },
  { script: 'check:smoke', label: 'Route and flow smoke tests', retries: 1 },
]

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function runCheck({ script, label }) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== ${label} (${script}) ===`)
    const child = spawn(`npm run ${script}`, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true,
    })
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`${label} failed with exit code ${code}`))
    })
  })
}

for (const check of checks) {
  for (let attempt = 0; attempt <= (check.retries || 0); attempt += 1) {
    try {
      await runCheck(check)
      break
    } catch (error) {
      if (attempt >= (check.retries || 0)) throw error
      console.log(`\n${check.label} failed once; waiting briefly and retrying...`)
      await sleep(2500)
    }
  }
  await sleep(1000)
}

console.log('\nAll local launch checks passed.')
