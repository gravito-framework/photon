import { readFile } from 'node:fs/promises'

export function checkRelease(name: string, version: string, channel: string | undefined) {
  if (name !== '@gravito/photon') throw new Error('Unexpected publication package')
  const stable = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
  const beta = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)-beta\.(0|[1-9]\d*)$/
  if (!((channel === 'latest' && stable.test(version)) || (channel === 'beta' && beta.test(version)))) {
    throw new Error(`Version ${version} does not match publication channel ${channel}`)
  }
}

if (import.meta.main) {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  checkRelease(manifest.name, manifest.version, process.env.RELEASE_CHANNEL)
  console.log(`Publication candidate: ${manifest.name}@${manifest.version} (${process.env.RELEASE_CHANNEL})`)
}
