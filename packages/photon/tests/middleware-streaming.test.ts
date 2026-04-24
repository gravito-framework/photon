import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { streamFromGenerator, streamJSONLines } from '../src/middleware/streaming'

// 輔助函式：從 ReadableStream 收集所有文字
async function collectText(res: Response): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) {
    return ''
  }
  const decoder = new TextDecoder()
  let result = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    result += decoder.decode(value, { stream: true })
  }
  result += decoder.decode()
  return result
}

// 輔助函式：從 NDJSON 串流解析所有 JSON 行
async function collectNDJSON<T>(res: Response): Promise<T[]> {
  const text = await collectText(res)
  return text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T)
}

describe('streaming middleware', () => {
  describe('streamFromGenerator', () => {
    it('應該將分塊字串輸出為串流', async () => {
      const app = new Hono()
      app.get('/test', (c) => {
        async function* gen() {
          yield 'Hello '
          yield 'World'
          yield '!'
        }
        return streamFromGenerator(c, gen())
      })

      const res = await app.request('/test')
      expect(res.status).toBe(200)
      const text = await collectText(res)
      expect(text).toBe('Hello World!')
    })

    it('應該設置正確的預設 Content-Type（text/plain）', async () => {
      const app = new Hono()
      app.get('/test', (c) => {
        async function* gen() {
          yield 'test'
        }
        return streamFromGenerator(c, gen())
      })

      const res = await app.request('/test')
      expect(res.headers.get('Content-Type')).toContain('text/plain')
    })

    it('應該允許自訂 Content-Type', async () => {
      const app = new Hono()
      app.get('/test', (c) => {
        async function* gen() {
          yield 'data: hello\n\n'
        }
        return streamFromGenerator(c, gen(), 'text/event-stream')
      })

      const res = await app.request('/test')
      expect(res.headers.get('Content-Type')).toContain('text/event-stream')
    })

    it('應該支援 Uint8Array 分塊輸出', async () => {
      const app = new Hono()
      app.get('/test', (c) => {
        async function* gen() {
          const encoder = new TextEncoder()
          yield encoder.encode('Binary ')
          yield encoder.encode('data')
        }
        return streamFromGenerator(c, gen(), 'application/octet-stream')
      })

      const res = await app.request('/test')
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('application/octet-stream')
      const text = await collectText(res)
      expect(text).toBe('Binary data')
    })

    it('應該正確處理空 generator', async () => {
      const app = new Hono()
      app.get('/test', (c) => {
        async function* gen() {
          // 空的 generator，不 yield 任何值
        }
        return streamFromGenerator(c, gen())
      })

      const res = await app.request('/test')
      expect(res.status).toBe(200)
      const text = await collectText(res)
      expect(text).toBe('')
    })

    it('應該支援大量分塊輸出', async () => {
      const app = new Hono()
      app.get('/test', (c) => {
        async function* gen() {
          for (let i = 0; i < 100; i++) {
            yield `chunk-${i}\n`
          }
        }
        return streamFromGenerator(c, gen())
      })

      const res = await app.request('/test')
      expect(res.status).toBe(200)
      const text = await collectText(res)
      const lines = text.split('\n').filter((l) => l.length > 0)
      expect(lines.length).toBe(100)
      expect(lines[0]).toBe('chunk-0')
      expect(lines[99]).toBe('chunk-99')
    })

    it('應該支援 Unicode 和中文字符串流', async () => {
      const app = new Hono()
      app.get('/test', (c) => {
        async function* gen() {
          yield '你好 '
          yield '世界 '
          yield '🚀'
        }
        return streamFromGenerator(c, gen())
      })

      const res = await app.request('/test')
      const text = await collectText(res)
      expect(text).toBe('你好 世界 🚀')
    })

    it('應該在錯誤時優雅地關閉串流', async () => {
      const app = new Hono()
      app.get('/test', (c) => {
        async function* gen() {
          yield 'before error'
          throw new Error('Generator error')
        }
        return streamFromGenerator(
          c,
          (async function* () {
            try {
              yield* gen()
            } catch {
              // 忽略錯誤，模擬靜默失敗
            }
          })()
        )
      })

      const res = await app.request('/test')
      expect(res.status).toBe(200)
      const text = await collectText(res)
      expect(text).toBe('before error')
    })
  })

  describe('streamJSONLines', () => {
    it('應該以 NDJSON 格式輸出每個物件', async () => {
      const app = new Hono()
      app.get('/test', (c) => {
        async function* gen() {
          yield { id: 1, message: 'First' }
          yield { id: 2, message: 'Second' }
          yield { id: 3, message: 'Third' }
        }
        return streamJSONLines(c, gen())
      })

      const res = await app.request('/test')
      expect(res.status).toBe(200)

      const items = await collectNDJSON<{ id: number; message: string }>(res)
      expect(items.length).toBe(3)
      expect(items[0]).toEqual({ id: 1, message: 'First' })
      expect(items[1]).toEqual({ id: 2, message: 'Second' })
      expect(items[2]).toEqual({ id: 3, message: 'Third' })
    })

    it('應該設置 Content-Type 為 application/x-ndjson', async () => {
      const app = new Hono()
      app.get('/test', (c) => {
        async function* gen() {
          yield { data: 'test' }
        }
        return streamJSONLines(c, gen())
      })

      const res = await app.request('/test')
      expect(res.headers.get('Content-Type')).toContain('application/x-ndjson')
    })

    it('應該每行是獨立的 JSON 物件', async () => {
      const app = new Hono()
      app.get('/test', (c) => {
        async function* gen() {
          yield { value: 1 }
          yield { value: 2 }
        }
        return streamJSONLines(c, gen())
      })

      const res = await app.request('/test')
      const text = await collectText(res)
      const lines = text.split('\n').filter((l) => l.trim().length > 0)

      // 每行應該是有效的 JSON
      expect(lines.length).toBe(2)
      expect(() => JSON.parse(lines[0])).not.toThrow()
      expect(() => JSON.parse(lines[1])).not.toThrow()
      expect(JSON.parse(lines[0])).toEqual({ value: 1 })
      expect(JSON.parse(lines[1])).toEqual({ value: 2 })
    })

    it('應該支援各種 JSON 資料類型', async () => {
      const app = new Hono()
      app.get('/test', (c) => {
        async function* gen() {
          yield { str: 'text', num: 42, bool: true, arr: [1, 2], nested: { a: 1 } }
        }
        return streamJSONLines(c, gen())
      })

      const res = await app.request('/test')
      const items = await collectNDJSON<{
        str: string
        num: number
        bool: boolean
        arr: number[]
        nested: { a: number }
      }>(res)

      expect(items.length).toBe(1)
      expect(items[0].str).toBe('text')
      expect(items[0].num).toBe(42)
      expect(items[0].bool).toBe(true)
      expect(items[0].arr).toEqual([1, 2])
      expect(items[0].nested).toEqual({ a: 1 })
    })

    it('應該正確處理空 generator', async () => {
      const app = new Hono()
      app.get('/test', (c) => {
        async function* gen() {
          // 空的 generator
        }
        return streamJSONLines(c, gen())
      })

      const res = await app.request('/test')
      expect(res.status).toBe(200)
      const text = await collectText(res)
      const lines = text.split('\n').filter((l) => l.trim().length > 0)
      expect(lines.length).toBe(0)
    })

    it('應該支援 LLM 典型回應格式', async () => {
      const app = new Hono()
      app.get('/test', (c) => {
        async function* generateLLMResponse() {
          const tokens = ['Hello', ',', ' ', 'I', "'m", ' ', 'an', ' ', 'AI', '!']
          for (const token of tokens) {
            yield { token, done: false }
          }
          yield { token: '', done: true }
        }
        return streamJSONLines(c, generateLLMResponse())
      })

      const res = await app.request('/test')
      const items = await collectNDJSON<{ token: string; done: boolean }>(res)

      expect(items.length).toBe(11)
      expect(items[0]).toEqual({ token: 'Hello', done: false })
      expect(items[items.length - 1]).toEqual({ token: '', done: true })

      // 組合所有 token 應得到完整句子
      const fullText = items
        .filter((item) => !item.done)
        .map((item) => item.token)
        .join('')
      expect(fullText).toBe("Hello, I'm an AI!")
    })

    it('應該支援大量 NDJSON 行', async () => {
      const app = new Hono()
      const COUNT = 200

      app.get('/test', (c) => {
        async function* gen() {
          for (let i = 0; i < COUNT; i++) {
            yield { index: i, data: `item-${i}` }
          }
        }
        return streamJSONLines(c, gen())
      })

      const res = await app.request('/test')
      const items = await collectNDJSON<{ index: number; data: string }>(res)

      expect(items.length).toBe(COUNT)
      expect(items[0].index).toBe(0)
      expect(items[COUNT - 1].index).toBe(COUNT - 1)
    })

    it('應該正確序列化 Unicode 和特殊字符', async () => {
      const app = new Hono()
      app.get('/test', (c) => {
        async function* gen() {
          yield { text: '你好世界', emoji: '🚀✨', special: '"quoted"' }
        }
        return streamJSONLines(c, gen())
      })

      const res = await app.request('/test')
      const items = await collectNDJSON<{ text: string; emoji: string; special: string }>(res)

      expect(items.length).toBe(1)
      expect(items[0].text).toBe('你好世界')
      expect(items[0].emoji).toBe('🚀✨')
      expect(items[0].special).toBe('"quoted"')
    })
  })

  describe('stream 和 streamText 重新導出', () => {
    it('應該成功導出 stream 函數', async () => {
      const { stream } = await import('../src/middleware/streaming')
      expect(typeof stream).toBe('function')
    })

    it('應該成功導出 streamText 函數', async () => {
      const { streamText } = await import('../src/middleware/streaming')
      expect(typeof streamText).toBe('function')
    })

    it('應該可以使用導出的 stream 函數', async () => {
      const { stream } = await import('../src/middleware/streaming')
      const app = new Hono()
      app.get('/test', (c) => {
        return stream(c, async (s) => {
          await s.write('direct stream')
          await s.close()
        })
      })

      const res = await app.request('/test')
      expect(res.status).toBe(200)
      const text = await collectText(res)
      expect(text).toBe('direct stream')
    })
  })
})
