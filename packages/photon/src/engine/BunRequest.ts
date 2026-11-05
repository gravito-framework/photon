import type { GravitoRequest, ValidationTarget } from './http-types'

/**
 * Bun-optimized implementation of GravitoRequest.
 * @internal
 */
export class BunRequest implements GravitoRequest {
  private _url: URL
  private _params: Record<string, string> = {}
  private _query: Record<string, string | string[]> | null = null
  private _validated: Partial<Record<ValidationTarget, unknown>> = {}

  constructor(
    public readonly raw: Request,
    params: Record<string, string> = {}
  ) {
    this._url = new URL(raw.url)
    this._params = { ...params }
  }

  // Internal: Set params after route match
  setParams(params: Record<string, string>) {
    this._params = { ...params }
  }

  get url(): string {
    return this.raw.url
  }

  get method(): string {
    return this.raw.method
  }

  get path(): string {
    return this._url.pathname
  }

  // Parameter Access
  param(name: string): string | undefined {
    return this._params[name]
  }

  params(): Record<string, string> {
    return this._params
  }

  query(name: string): string | undefined {
    // Lazily parse query
    if (!this._query) {
      this.parseQuery()
    }
    const val = this._query?.[name]
    if (Array.isArray(val)) {
      return val[0]
    }
    return val
  }

  queries(): Record<string, string | string[]> {
    if (!this._query) {
      this.parseQuery()
    }
    return this._query!
  }

  header(name: string): string | undefined
  header(): Record<string, string>
  header(name?: string): string | undefined | Record<string, string> {
    if (name) {
      return this.raw.headers.get(name) || undefined
    }
    const headers: Record<string, string> = {}
    this.raw.headers.forEach((value, key) => {
      headers[key] = value
    })
    return headers
  }

  // Body Parsing
  async json<T = unknown>(): Promise<T> {
    return this.raw.json() as Promise<T>
  }

  async text(): Promise<string> {
    return this.raw.text()
  }

  async formData(): Promise<FormData> {
    return this.raw.formData()
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.raw.arrayBuffer()
  }

  async parseBody<T = unknown>(): Promise<T> {
    const contentType = this.raw.headers.get('Content-Type')
    if (
      contentType?.includes('application/x-www-form-urlencoded') ||
      contentType?.includes('multipart/form-data')
    ) {
      const formData = await this.formData()
      const body: Record<string, unknown> = {}
      formData.forEach((value, key) => {
        body[key] = value
      })
      return body as T
    }
    return {} as T
  }

  // Internal method to set validated data
  // This can be used by middleware to attach validated data to the request
  setValidated(target: ValidationTarget, data: unknown) {
    this._validated[target] = data
  }

  valid<T = unknown>(target: ValidationTarget): T {
    const data = this._validated[target]
    if (data === undefined) {
      // In Photon, valid() throws or returns specific type?
      // Gravito types definition says allows undefined?
      // "valid<T = unknown>(target: ValidationTarget): T"
      // Usually framework-agnostic means we should throw if not found or return T.
      // Photon definition: valid<T>(target: keyof ValidationTargets): T
      // If not validated, likely undefined or error.
      // Let's return undefined as "unknown" implicitly.
      // Or throw to match semantics?
      // "throws {Error} If validation was not performed for this target" in types.ts JSDoc
      throw new Error(`Validation target '${target}' not found or validation failed.`)
    }
    return data as T
  }

  private parseQuery() {
    this._query = {}
    for (const [key, value] of this._url.searchParams) {
      if (this._query[key]) {
        if (Array.isArray(this._query[key])) {
          ;(this._query[key] as string[]).push(value)
        } else {
          this._query[key] = [this._query[key] as string, value]
        }
      } else {
        this._query[key] = value
      }
    }
  }
}
