import { describe, expect, test } from 'bun:test'
import { checkRelease } from '../scripts/check-release'

describe('publication channel', () => {
  test('accepts the beta and stable release sequence', () => {
    expect(() => checkRelease('@gravito/photon', '3.0.0-beta.1', 'beta')).not.toThrow()
    expect(() => checkRelease('@gravito/photon', '3.0.0', 'latest')).not.toThrow()
  })

  test('rejects publishing prereleases to latest or stable releases to beta', () => {
    expect(() => checkRelease('@gravito/photon', '3.0.0-beta.1', 'latest')).toThrow()
    expect(() => checkRelease('@gravito/photon', '3.0.0', 'beta')).toThrow()
  })

  test('rejects unexpected packages, malformed versions and channels', () => {
    expect(() => checkRelease('@gravito/core', '3.0.0', 'latest')).toThrow()
    for (const version of ['03.0.0', '3.0', '3.0.0-beta.01', '3.0.0-rc.1']) {
      expect(() => checkRelease('@gravito/photon', version, 'beta')).toThrow()
    }
    expect(() => checkRelease('@gravito/photon', '3.0.0', undefined)).toThrow()
  })
})
