/** Diagnostic ablations only: changes temporary copies, never production source. */
import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../..')
const output = resolve(
  process.argv[2] ??
    join(root, 'artifacts', `benchmark-investigation-${Date.now()}`)
)
assert.equal(Bun.version, '1.4.4')
await mkdir(output, { recursive: true })
const temp = await mkdtemp(join(tmpdir(), 'photon-benchmark-ablation-'))
const variants = [
  'current',
  'without-header-merge',
  'without-child-settlement',
  'without-fast-error-boundary',
]
function replaceOnce(source: string, before: string, after: string) {
  assert.equal(source.split(before).length, 2, `Expected one source fragment: ${before}`)
  return source.replace(before, after)
}
try {
  for (const variant of variants) {
    const dir = join(temp, variant)
    await mkdir(join(dir, 'scripts'), { recursive: true })
    await cp(join(root, 'packages/photon/src'), join(dir, 'src'), { recursive: true })
    await cp(
      join(root, 'packages/photon/scripts/benchmark-worker.ts'),
      join(dir, 'scripts/benchmark-worker.ts')
    )
    await symlink(join(root, 'packages/photon/node_modules'), join(dir, 'node_modules'))
    const contextPath = join(dir, 'src/engine/BunContext.ts')
    const adapterPath = join(dir, 'src/engine/BunNativeAdapter.ts')
    if (variant === 'without-header-merge') {
      const source = await readFile(contextPath, 'utf8')
      const start = source.indexOf('  set res(response: Response | undefined) {')
      const end = source.indexOf('\n  get native()', start)
      assert(start > 0 && end > start)
      await writeFile(
        contextPath,
        `${source.slice(0, start)}  set res(response: Response | undefined) { this._res = response }\n${source.slice(end)}`
      )
    }
    if (variant === 'without-child-settlement') {
      const source = await readFile(adapterPath, 'utf8')
      await writeFile(
        adapterPath,
        replaceOnce(source, 'await Promise.allSettled(pending)', 'void pending')
      )
    }
    if (variant === 'without-fast-error-boundary') {
      const source = await readFile(adapterPath, 'utf8')
      await writeFile(
        adapterPath,
        replaceOnce(
          source,
          'return this.executeFastHandler(fastHandler, request)',
          'return fastHandler(request)'
        )
      )
    }
    await cp(contextPath, join(output, `${variant}-BunContext.ts`))
    await cp(adapterPath, join(output, `${variant}-BunNativeAdapter.ts`))
  }
  const results: object[] = []
  await writeFile(join(output, 'commands.log'), '')
  for (let round = 1; round <= 5; round++) {
    for (const variant of round % 2 ? variants : [...variants].reverse()) {
      for (const scenario of ['standard', 'middleware', 'fast']) {
        const args = [
          process.execPath,
          join(temp, variant, 'scripts/benchmark-worker.ts'),
          scenario,
          'in-process',
          String(round),
        ]
        const child = Bun.spawn(args, {
          env: { ...process.env, NODE_ENV: 'production' },
          stdout: 'pipe',
          stderr: 'pipe',
        })
        const [stdout, stderr, exitCode] = await Promise.all([
          new Response(child.stdout).text(),
          new Response(child.stderr).text(),
          child.exited,
        ])
        await writeFile(
          join(output, 'commands.log'),
          `${JSON.stringify(args)} NODE_ENV=production exit=${exitCode}\n${stderr}`,
          { flag: 'a' }
        )
        assert.equal(exitCode, 0, stdout + stderr)
        const result = { variant, ...JSON.parse(stdout.trim()) }
        results.push(result)
        await writeFile(join(output, 'results.json'), JSON.stringify(results, null, 2))
        console.log(
          `${variant} ${scenario} round ${round}: ${Math.round(result.requestsPerSecond)} req/s`
        )
      }
    }
  }
  await cp(import.meta.path, join(output, 'benchmark-investigate.ts'))
  await cp(
    join(root, 'packages/photon/scripts/benchmark-worker.ts'),
    join(output, 'benchmark-worker.ts')
  )
} finally {
  await rm(temp, { recursive: true, force: true })
}
