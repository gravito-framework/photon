/**
 * @fileoverview Gravito PhotonAdapter - Barrel Export
 *
 * 提供 Gravito HttpAdapter 介面的 Photon 實作。
 * 此模組是 core 依賴解耦的關鍵，PhotonAdapter 從 @gravito/core 移至此處，
 * 確保依賴方向為 photon → core（正確的向心依賴）。
 *
 * @example
 * ```typescript
 * import { PhotonAdapter } from '@gravito/photon/adapter'
 *
 * const core = new PlanetCore({
 *   adapter: new PhotonAdapter()
 * })
 * ```
 *
 * @module @gravito/photon/adapter
 * @since 2.0.0
 */

export type { GravitoAdapter as GravitoAdapterType } from './PhotonAdapter'
export {
  createGravitoAdapter,
  createPhotonAdapter,
  GravitoAdapter,
  PhotonAdapter,
  PhotonContextWrapper,
  PhotonRequestWrapper,
  toPhotonHandler,
  toPhotonMiddleware,
} from './PhotonAdapter'
export type {
  PhotonContextExtended,
  PhotonRequestExtended,
  ResponseWithFlash,
  SessionWithFlash,
} from './photon-types'
export { hasCachedJsonBody, hasValidMethod } from './photon-types'
