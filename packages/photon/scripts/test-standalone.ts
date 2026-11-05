import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const fixture = await realpath(await mkdtemp(join(tmpdir(), 'photon-standalone-')))
async function run(command: string[], cwd: string) {
  console.log(`$ ${command.join(' ')}`)
  const process = Bun.spawn(command, { cwd, stdout: 'inherit', stderr: 'inherit' })
  const code = await process.exited
  console.log(`exit: ${code}`)
  if (code !== 0) throw new Error(`${command.join(' ')} failed (${code})`)
}
try {
  console.log(`Bun ${Bun.version}; consumer fixture: ${fixture}`)
  if (Bun.version !== '1.4.4') throw new Error('Standalone verification requires Bun 1.4.4')
  await rm(join(root, 'dist'), { recursive: true, force: true })
  await run(['bun', 'run', 'build'], root)
  await run(['bun', 'pm', 'pack', '--destination', fixture], root)
  const archive = (await readdir(fixture)).find((name) => name.endsWith('.tgz'))
  if (!archive) throw new Error('No package archive generated')
  await writeFile(
    join(fixture, 'package.json'),
    JSON.stringify({
      name: 'photon-standalone-verification',
      private: true,
      type: 'module',
      dependencies: { '@gravito/photon': `file:./${archive}` },
      devDependencies: { typescript: '5.9.3', 'bun-types': '1.3.10', '@types/deno': '2.7.0' },
    })
  )
  await run(['bun', 'install', '--ignore-scripts', '--omit', 'peer'], fixture)
  const lock = await readFile(join(fixture, 'bun.lock'), 'utf8')
  if (/@gravito\/(core|resilience)|workspace:/.test(lock)) {
    throw new Error('Standalone dependency tree contains framework or workspace dependencies')
  }
  // All package links must stay inside this independently installed consumer.
  const visited = new Set<string>()
  async function inspectTree(path: string): Promise<void> {
    const actual = await realpath(path)
    if (!actual.startsWith(`${fixture}/`)) throw new Error(`Dependency escapes fixture: ${path}`)
    if (visited.has(actual)) return
    visited.add(actual)
    if ((await lstat(actual)).isDirectory()) {
      for (const name of await readdir(actual)) await inspectTree(join(actual, name))
    }
  }
  await inspectTree(join(fixture, 'node_modules'))
  const installed = join(fixture, 'node_modules/@gravito/photon')
  const manifest = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'))
  const publicFixture = await readFile(join(root, 'scripts/fixtures/public.ts'), 'utf8')
  for (const [subpath, conditions] of Object.entries(manifest.exports)) {
    const specifier = `@gravito/photon${subpath === '.' ? '' : subpath.slice(1)}`
    if (!publicFixture.includes(`'${specifier}'`))
      throw new Error(`Missing consumer case: ${specifier}`)
    for (const target of Object.values(conditions as Record<string, string>)) {
      await readFile(join(installed, target))
    }
  }
  for (const file of new Bun.Glob('**/*.d.ts').scanSync(join(installed, 'dist'))) {
    const declaration = await readFile(join(installed, 'dist', file), 'utf8')
    if (/(?:from|import).*['"]@gravito\/(core|resilience)|workspace:/.test(declaration)) {
      throw new Error(`Framework declaration leak: ${file}`)
    }
  }
  for (const name of ['public.ts', 'variables.ts']) {
    await cp(join(root, 'scripts/fixtures', name), join(fixture, name))
  }
  await writeFile(
    join(fixture, 'optional-absent.ts'),
    `
try { import.meta.resolve('@opentelemetry/api'); throw new Error('OTel must be absent') }
catch (error) { if (!(error instanceof Error) || !error.message.includes('Cannot find')) throw error }
import { Photon } from '@gravito/photon'
import { otelMiddleware } from '@gravito/photon/middleware/otel'
const app = new Photon()
app.use(otelMiddleware())
app.get('/', c => c.text('without-otel'))
if (await (await app.request('/')).text() !== 'without-otel') throw new Error('OTel fallback failed')
console.log('OTel physically absent; root and no-op middleware work')
`
  )
  await run(['bun', 'optional-absent.ts'], fixture)
  await writeFile(
    join(fixture, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        target: 'ESNext',
        module: 'ESNext',
        moduleResolution: 'bundler',
        types: ['bun-types'],
      },
      include: ['smoke.ts', 'variables.ts'],
    })
  )
  await writeFile(
    join(fixture, 'smoke.ts'),
    `
import { Photon } from '@gravito/photon'
const app = new Photon()
app.use(async (c, next) => { c.header('x-photon', 'yes'); await next() })
app.get('/hello', c => c.json({ ok: true }))
app.post('/echo', async c => c.json(await c.req.json()))
app.get('/error', () => { throw new Error('expected') })
app.onError((_error, c) => c.json({ error: 'handled' }, 500))
const server = Bun.serve(app.serveConfig({ port: 0, hostname: '127.0.0.1' }))
try {
  const base = server.url
  const ok = await fetch(new URL('/hello', base))
  if (ok.status !== 200 || ok.headers.get('x-photon') !== 'yes' || !(await ok.json()).ok) throw Error('GET contract')
  const post = await fetch(new URL('/echo', base), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value: 42 }) })
  if (post.status !== 200 || (await post.json()).value !== 42) throw Error('POST contract')
  const missing = await fetch(new URL('/missing', base))
  if (missing.status !== 404) throw Error('404 contract')
  const error = await fetch(new URL('/error', base))
  if (error.status !== 500 || (await error.json()).error !== 'handled') throw Error('error contract')
} finally { await server.stop(true) }
console.log('Standalone HTTP contracts passed')
`
  )
  await run(['bun', 'x', '--no-install', 'tsc', '-p', 'tsconfig.json'], fixture)
  await writeFile(
    join(fixture, 'tsconfig.public.json'),
    JSON.stringify({
      extends: './tsconfig.json',
      compilerOptions: { types: ['bun-types', 'deno'] },
      include: ['public.ts'],
    })
  )
  await run(['bun', 'x', '--no-install', 'tsc', '-p', 'tsconfig.public.json'], fixture)
  await run(['bun', 'public.ts'], fixture)
  // Compile each negative case in its own module and require its intended diagnostic.
  const cases: Array<{ name: string; diagnostic: number; source: string }> = JSON.parse(
    await readFile(join(root, 'scripts/fixtures/rejections.json'), 'utf8')
  )
  await mkdir(join(fixture, 'negative'))
  for (const test of cases) {
    await writeFile(
      join(fixture, 'negative', `${test.name}.ts`),
      `
import { Photon, type GravitoMiddleware } from '@gravito/photon'
const app = new Photon<{ user: string; optional?: string }>()
${test.source}
`
    )
  }
  await writeFile(
    join(fixture, 'tsconfig.invalid.json'),
    JSON.stringify({
      extends: './tsconfig.json',
      include: ['negative/*.ts'],
    })
  )
  const invalidCommand = [
    'bun',
    'x',
    '--no-install',
    'tsc',
    '-p',
    'tsconfig.invalid.json',
    '--pretty',
    'false',
  ]
  console.log(`$ ${invalidCommand.join(' ')}`)
  const rejected = Bun.spawn(invalidCommand, { cwd: fixture, stdout: 'pipe', stderr: 'inherit' })
  const diagnostics = await new Response(rejected.stdout).text()
  const code = await rejected.exited
  console.log(diagnostics)
  console.log(`exit: ${code} (expected type rejection)`)
  if (code !== 2) throw new Error('Invalid consumer did not fail typechecking')
  const actual = [
    ...diagnostics.matchAll(/negative\/(case-[a-z0-9-]+)\.ts\(\d+,\d+\): error TS(\d+):/g),
  ]
  for (const test of cases) {
    if (!actual.some((match) => match[1] === test.name && Number(match[2]) === test.diagnostic)) {
      throw new Error(`Missing expected TS${test.diagnostic} rejection: ${test.name}`)
    }
  }
  if (
    diagnostics.split('\n').filter((line) => /error TS/.test(line)).length !== actual.length ||
    actual.some(
      (match) =>
        !cases.some((test) => test.name === match[1] && test.diagnostic === Number(match[2]))
    )
  ) {
    throw new Error('Unexpected diagnostic outside rejection cases')
  }
  await run(['bun', 'smoke.ts'], fixture)
} finally {
  await rm(fixture, { recursive: true, force: true })
}
