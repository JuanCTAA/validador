import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path/posix'
import { arrayBuffer } from 'node:stream/consumers'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { DocumentInitParameters, PDFDocumentProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api.js'

const require = createRequire(import.meta.url)
const pdfjsPath = path.dirname(require.resolve('pdfjs-dist/package.json'))

// Cache path strings
const STANDARD_FONTS_PATH = path.join(pdfjsPath, `standard_fonts${path.sep}`)
const CMAPS_PATH = path.join(pdfjsPath, `cmaps${path.sep}`)
const PREFIX = 'data:application/pdf;base64,'
// biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
const CLEAN_STRING_PATTERN = /^þÿ|\u0000/g

export type PdfMetadata = {
  Title?: string
  Author?: string
  Producer?: string
  Creator?: string
  CreationDate?: string
  ModDate?: string
}

export type Options = {
  /** For cases where the PDF is encrypted with a password */
  password?: string
  /** defaults to `1`. If you want high-resolution images, increase this */
  scale?: number
  /** render parameters which are passed to `PdfPage#render` */
  renderParams?: Omit<RenderParameters, 'canvas' | 'canvasContext' | 'viewport'>
  /** document init parameters which are passed to pdfjs.getDocument */
  docInitParams?: Partial<DocumentInitParameters>
}

export async function parseInput(input: string | Uint8Array | Buffer | NodeJS.ReadableStream): Promise<Uint8Array> {
  // Buffer is a subclass of Uint8Array, but it's not actually
  // compatible: [https://github.com/sindresorhus/uint8array-extras/issues/4](https://github.com/sindresorhus/uint8array-extras/issues/4)
  if (Buffer.isBuffer(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
  }
  if (input instanceof Uint8Array) return input
  // provided with a data url or a path to a file on disk
  if (typeof input === 'string') {
    if (input.startsWith(PREFIX)) {
      const buffer = Buffer.from(input.slice(PREFIX.length), 'base64')
      return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    }
    return new Uint8Array(readFileSync(input))
  }
  // provided a ReadableStream (or any object with an asyncIterator that yields buffer chunks)
  if (typeof input === 'object' && input && Symbol.asyncIterator in input) {
    return new Uint8Array(await arrayBuffer(input as any))
  }
  throw new Error(
    'pdf-to-img received an unexpected input. Provide a path to file, a data URL, a Uint8Array, a Buffer, or a ReadableStream.',
  )
}

/** required since k-yle/pdf-to-img#58, the objects from pdfjs are weirdly structured */
function sanitize<T extends Record<string, unknown>>(x: T): T {
  const result = {} as T

  for (const key in x) {
    const value = x[key]
    if (typeof value === 'string') {
      result[key] = value.replace(CLEAN_STRING_PATTERN, '') as any
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitize(value as any) as any
    } else {
      result[key] = value as any
    }
  }
  return result
}

export async function pdf(
  input: string | Uint8Array | Buffer | NodeJS.ReadableStream,
  options: Options = {},
): Promise<{
  length: number
  metadata: PdfMetadata
  getPage(pageNumber: number): Promise<Buffer>
  destroy(): Promise<void> // Add destroy method
  [Symbol.asyncIterator](): AsyncIterator<Buffer, void, void>
}> {
  const data = await parseInput(input)
  const pdfDocument = (await pdfjs.getDocument({
    password: options.password,
    standardFontDataUrl: STANDARD_FONTS_PATH,
    cMapUrl: CMAPS_PATH,
    cMapPacked: true,
    ...options.docInitParams,
    isEvalSupported: false,
    data,
  }).promise) as unknown as PDFDocumentProxy

  const metadata = await pdfDocument.getMetadata()

  async function getPage(pageNumber: number): Promise<Buffer> {
    const page = await pdfDocument.getPage(pageNumber)
    const viewport = page.getViewport({ scale: options.scale ?? 1 })
    // @ts-expect-error
    const { canvas } = pdfDocument.canvasFactory.create(
      viewport.width,
      viewport.height,
      !!options.renderParams?.background,
    )
    await page.render({
      canvas,
      viewport,
      ...options.renderParams,
    }).promise

    const buffer = canvas.toBuffer('image/png') as Buffer
    page.cleanup()

    return buffer
  }

  return {
    length: pdfDocument.numPages as number,
    metadata: sanitize<PdfMetadata>(metadata.info ?? {}),
    getPage,
    async destroy() {
      await pdfDocument.destroy()
    },
    [Symbol.asyncIterator]() {
      let pg = 0
      return {
        async next() {
          if (pg < pdfDocument.numPages) {
            pg += 1
            return { done: false, value: await getPage(pg) }
          }
          return { done: true, value: undefined as any }
        },
      }
    },
  }
}
