import { cp, mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const fixture = await realpath(await mkdtemp(join(tmpdir(), 'photon-contracts-')))
async function run(command: string[], cwd: string) {
  console.log(`$ ${command.join(' ')}`)
  const child = Bun.spawn(command, { cwd, stdout: 'inherit', stderr: 'inherit' })
  const code = await child.exited
  console.log(`exit: ${code}`)
  if (code !== 0) {
    throw new Error(`${command.join(' ')} failed (${code})`)
  }
}

try {
  console.log(`Bun ${Bun.version}; tarball HTTP fixture: ${fixture}`)
  if (Bun.version !== '1.4.4') {
    throw new Error('HTTP contracts require Bun 1.4.4')
  }
  await rm(join(root, 'dist'), { recursive: true, force: true })
  await run(['bun', 'run', 'build'], root)
  await run(['bun', 'pm', 'pack', '--destination', fixture], root)
  const archive = (await readdir(fixture)).find((name) => name.endsWith('.tgz'))
  if (!archive) {
    throw new Error('No package archive generated')
  }
  await writeFile(
    join(fixture, 'package.json'),
    JSON.stringify({
      name: 'photon-http-contracts',
      private: true,
      type: 'module',
      dependencies: { '@gravito/photon': `file:./${archive}` },
      devDependencies: { typescript: '5.9.3', 'bun-types': '1.3.10' },
    })
  )
  await run(['bun', 'install', '--ignore-scripts', '--omit', 'peer'], fixture)
  const lock = await readFile(join(fixture, 'bun.lock'), 'utf8')
  if (/@gravito\/(core|resilience)|workspace:/.test(lock)) {
    throw new Error('Framework dependency in HTTP fixture')
  }
  const suite = await readFile(join(root, 'tests/contract/http.contract.test.ts'), 'utf8')
  if (!suite.includes("from '../../src'")) {
    throw new Error('Contract source import changed')
  }
  await writeFile(
    join(fixture, 'http.contract.test.ts'),
    suite.replace("from '../../src'", "from '@gravito/photon'")
  )
  await cp(join(root, 'scripts/fixtures/contracts-tsconfig.json'), join(fixture, 'tsconfig.json'))
  await run(['bun', 'x', '--no-install', 'tsc', '-p', 'tsconfig.json'], fixture)
  await run(['bun', 'test', 'http.contract.test.ts', '--timeout=10000'], fixture)
} finally {
  await rm(fixture, { recursive: true, force: true })
}
