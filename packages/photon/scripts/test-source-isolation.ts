import { cp, mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const fixture = await mkdtemp(join(tmpdir(), 'photon-source-'))
async function run(command: string[]) {
  console.log(`$ ${command.join(' ')}`)
  const child = Bun.spawn(command, { cwd: fixture, stdout: 'inherit', stderr: 'inherit' })
  const code = await child.exited
  console.log(`exit: ${code}`)
  if (code !== 0) throw new Error(`${command.join(' ')} failed (${code})`)
}
try {
  console.log(`Bun ${Bun.version}; source fixture: ${fixture}`)
  if (Bun.version !== '1.4.4') throw new Error('Source isolation requires Bun 1.4.4')
  for (const name of await readdir(root)) {
    if (['node_modules', 'dist', 'coverage'].includes(name)) continue
    await cp(join(root, name), join(fixture, name), { recursive: true, dereference: false })
  }
  await run(['bun', 'install', '--frozen-lockfile', '--ignore-scripts'])
  const lock = await readFile(join(fixture, 'bun.lock'), 'utf8')
  if (/@gravito\/(core|resilience)|workspace:/.test(lock)) {
    throw new Error('Source dependency tree contains framework or workspace dependencies')
  }
  await run(['bun', 'run', 'build'])
  await run(['bun', 'run', 'typecheck'])
  await run(['bun', 'test', '--timeout=10000'])
  console.log(
    'Source isolation passed: install/build/typecheck/test without framework or workspace'
  )
} finally {
  await rm(fixture, { recursive: true, force: true })
}
