import { spawn } from 'node:child_process'

const checks = [
  ['lint', 'ESLint'],
  ['check:types', 'TypeScript'],
  ['build', 'Production build'],
  ['check:security', 'Security checks'],
  ['check:hrms', 'HR/payroll business rules'],
  ['check:roles', 'Role-based QA'],
  ['check:smoke', 'Route and flow smoke tests'],
]

function runCheck([script, label]) {
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
  await runCheck(check)
}

console.log('\nAll local launch checks passed.')
