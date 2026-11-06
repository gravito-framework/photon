/** A10: fixed-source comparison; no throughput pass/fail threshold. */
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { cpus, platform, release, tmpdir, totalmem } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const baseline = process.env.PHOTON_BENCHMARK_BASELINE ?? '89f81ea04d4447f5ce64b44219b34dc6bb8c1c17'
const root = resolve(import.meta.dirname, '../../..')
const output = resolve(
  process.argv[2] ??
    join(root, 'artifacts', `benchmark-${Date.now()}`)
)
if (Bun.version !== '1.4.4') {
  throw new Error('Benchmark requires Bun 1.4.4')
}
await mkdir(dirname(output), { recursive: true })
await mkdir(output)
const temporary = await mkdtemp(join(tmpdir(), 'photon-benchmark-'))
async function command(args: string[], cwd = root) {
  const child = Bun.spawn(args, { cwd, stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  await writeFile(
    join(output, 'commands.log'),
    `${JSON.stringify(args)} cwd=${cwd} exit=${code}\n${stderr}`,
    { flag: 'a' }
  )
  if (code !== 0) {
    throw new Error(`${args.join(' ')} exited ${code}: ${stderr}`)
  }
  return stdout
}
try {
  await writeFile(join(output, 'commands.log'), '')
  const sha = (await command(['git', 'rev-parse', 'HEAD'])).trim()
  const diff = await command(['git', 'diff', 'HEAD', '--binary'])
  await writeFile(join(output, 'worktree.diff'), diff)
  await writeFile(join(output, 'status.txt'), await command(['git', 'status', '--short']))
  const archive = join(temporary, 'baseline.tar')
  await command([
    'git',
    'archive',
    '--format=tar',
    `--output=${archive}`,
    baseline,
    'packages/photon',
  ])
  const old = join(temporary, 'old')
  await mkdir(old)
  await command(['tar', '-xf', archive, '-C', old])
  // Both revisions resolve the same package-local third-party dependencies.
  await symlink(join(root, 'packages/photon/node_modules'), join(old, 'packages/photon/node_modules'))
  const workerRelative = 'packages/photon/scripts/benchmark-worker.ts'
  await mkdir(join(old, 'packages/photon/scripts'), { recursive: true })
  await cp(join(root, workerRelative), join(old, workerRelative))
  await cp(join(root, workerRelative), join(output, 'benchmark-worker.ts'))
  await cp(import.meta.path, join(output, 'benchmark.ts'))
  await writeFile(
    join(output, 'metadata.json'),
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        baseline,
        current: sha,
        bun: Bun.version,
        platform: platform(),
        arch: process.arch,
        os: release(),
        cpu: cpus()[0]?.model,
        logicalCpus: cpus().length,
        memoryBytes: totalmem(),
        nodeEnv: 'production',
        workerSha256: createHash('sha256')
          .update(await readFile(join(root, workerRelative)))
          .digest('hex'),
        currentDiffSha256: createHash('sha256').update(diff).digest('hex'),
        dependencyLockSha256: createHash('sha256')
          .update(await readFile(join(root, 'packages/photon/bun.lock')))
          .digest('hex'),
        rounds: 5,
        load: {
          'in-process': { warmup: 20000, iterations: 100000 },
          socket: { warmup: 2000, iterations: 10000 },
        },
        concurrency: 1,
        ordering:
          'alternate old/current within each scenario, transport and round; fresh child process each time',
        dependencies:
          'shared package-local dependencies; independent-engine revisions only',
      },
      null,
      2
    )
  )
  const results: object[] = []
  for (let round = 1; round <= 5; round++) {
    for (const transport of ['in-process', 'socket']) {
      for (const scenario of ['standard', 'middleware', 'fast']) {
        for (const label of round % 2 ? ['baseline', 'current'] : ['current', 'baseline']) {
          const cwd = label === 'baseline' ? old : root
          const args = [process.execPath]
          args.push(join(cwd, workerRelative), scenario, transport, String(round))
          const child = Bun.spawn(args, {
            cwd,
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
            `${JSON.stringify(args)} cwd=${cwd} NODE_ENV=production exit=${exitCode}\n${stderr}`,
            { flag: 'a' }
          )
          await writeFile(
            join(output, `${label}-${transport}-${scenario}-${round}.log`),
            stdout + stderr
          )
          if (exitCode !== 0) {
            throw new Error(
              `Benchmark failed: ${label} ${scenario} ${transport}: ${stdout}${stderr}`
            )
          }
          const result = { label, ...JSON.parse(stdout.trim().split('\n').at(-1) ?? '') }
          results.push(result)
          await writeFile(join(output, 'results.json'), JSON.stringify(results, null, 2))
          console.log(
            `${label} ${transport} ${scenario} round ${round}: ${Math.round(result.requestsPerSecond)} req/s errors=${result.errors}`
          )
        }
      }
    }
  }
  console.log(`Evidence: ${output}`)
} finally {
  await rm(temporary, { recursive: true, force: true })
}
