// Global type definitions for Bun
// Used when bun-types is not available (e.g. in frontend packages)

interface BunFile extends Blob {
  exists(): Promise<boolean>
  stat(): Promise<{ size: number; mtime: Date; atime: Date; ctime: Date }>
  text(): Promise<string>
  json(): Promise<any>
  arrayBuffer(): Promise<ArrayBuffer>
  slice(start?: number, end?: number, contentType?: string): BunFile
  stream(): ReadableStream
  writer(options?: any): any
  name?: string
  lastModified: number
}

declare global {
  var Bun: {
    file: (path: string) => BunFile
    write: (path: string, content: string | Blob | ArrayBuffer | ArrayBufferView) => Promise<number>
    serve: (options: any) => any
    [key: string]: any
  }
}

export {}
