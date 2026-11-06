import { closeSync, openSync } from 'node:fs'
import { cp, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// Run from a disposable source copy: stale repository dist cannot satisfy a gate.
const root = resolve(import.meta.dirname, '..')
const output = resolve(
  process.env.PHOTON_RELEASE_ARTIFACTS ??
    (await mkdtemp(join(tmpdir(), 'photon-release-evidence-')))
)
const stage = await mkdtemp(join(tmpdir(), 'photon-release-source-'))
const results: Array<{ command: string[]; exitCode: number; log: string }> = []
await mkdir(output, { recursive: true })
console.log(`Release evidence: ${output}`)
async function run(command: string[], name: string) {
  const log = join(output, `${name}.log`)
  const fd = openSync(log, 'w')
  let exitCode: number
  try {
    const child = Bun.spawn(command, {
      cwd: stage,
      env: { ...process.env, PHOTON_RELEASE_ARTIFACTS: output },
      stdout: fd,
      stderr: fd,
    })
    exitCode = await child.exited
  } finally {
    closeSync(fd)
  }
  results.push({ command, exitCode, log })
  console.log(`$ ${command.join(' ')} → ${exitCode} (${log})`)
  if (exitCode !== 0) {
    throw new Error(`Release gate failed: ${name}; see ${log}`)
  }
}
try {
  if (Bun.version !== '1.4.4') {
    throw new Error('Release verification requires Bun 1.4.4')
  }
  for (const name of await readdir(root)) {
    if (['node_modules', 'dist', 'coverage'].includes(name)) {
      continue
    }
    await cp(join(root, name), join(stage, name), { recursive: true, dereference: false })
  }
  await run(['bun', 'run', 'test:source-isolation'], 'source-isolation')
  await run(['bun', 'install', '--frozen-lockfile', '--ignore-scripts'], 'install')
  await run(['bun', 'run', 'test:standalone'], 'standalone')
  await run(['bun', 'run', 'test:contracts'], 'contracts')
  // Pin the validation tool independently of the monorepo's hoisted tools.
  await run(['bun', 'x', '--bun', 'publint@0.3.18', '--strict'], 'publint')
  await run(['bun', 'pm', 'pack', '--destination', output], 'pack')
  await run(['npm', 'pack', '--dry-run', '--json', '--ignore-scripts'], 'npm-pack-dry-run')
  console.log('Photon release rehearsal passed. No publication performed; A7 remains pending.')
} finally {
  await writeFile(
    join(output, 'results.json'),
    JSON.stringify(
      {
        bun: Bun.version,
        platform: process.platform,
        architecture: process.arch,
        results,
        passed: results.length === 7 && results.every((result) => result.exitCode === 0),
      },
      null,
      2
    )
  )
  await rm(stage, { recursive: true, force: true })
}
