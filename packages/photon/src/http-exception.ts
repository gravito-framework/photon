/** Options for a Photon-owned HTTP exception. */
export interface ExceptionOptions {
  message?: string
  cause?: unknown
  i18nKey?: string
  i18nParams?: Record<string, string | number>
}

/**
 * HTTP error data for an application's onError handler.
 * This is not a core GravitoException; the default handler still returns 500.
 */
export class HttpException extends Error {
  readonly code = 'HTTP_ERROR'
  readonly i18nKey?: string
  readonly i18nParams?: Record<string, string | number>

  constructor(
    readonly status: number,
    options: ExceptionOptions = {}
  ) {
    super(options.message, { cause: options.cause })
    this.name = 'HttpException'
    this.i18nKey = options.i18nKey
    this.i18nParams = options.i18nParams
  }

  getLocalizedMessage(
    t: (key: string, params?: Record<string, string | number>) => string
  ): string {
    return this.i18nKey ? t(this.i18nKey, this.i18nParams) : this.message
  }
}
