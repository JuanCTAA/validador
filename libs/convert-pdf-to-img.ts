import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path/posix'
import { arrayBuffer } from 'node:stream/consumers'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { DocumentInitParameters, RenderParameters } from 'pdfjs-dist/types/src/display/api.js'

const require = createRequire(import.meta.url)
const pdfjsPath = path.dirname(require.resolve('pdfjs-dist/package.json'))

const PREFIX = 'data:application/pdf;base64,'

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
  // compatible: https://github.com/sindresorhus/uint8array-extras/issues/4
  if (Buffer.isBuffer(input)) return Uint8Array.from(input)
  if (input instanceof Uint8Array) return input
  // provided with a data url or a path to a file on disk
  if (typeof input === 'string') {
    if (input.startsWith(PREFIX)) {
      return Uint8Array.from(Buffer.from(input.slice(PREFIX.length), 'base64'))
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
  // eslint-disable-next-line unicorn/prefer-structured-clone -- TODO: wait for min nodejs version to be bumped
  const object = JSON.parse(JSON.stringify(x)) as T
  // remove UTF16 BOM and weird 0x0 character introduced in k-yle/pdf-to-img#138 and k-yle/pdf-to-img#184
  for (const key in object as any) {
    if (typeof (object as any)[key] === 'string') {
      // eslint-disable-next-line no-control-regex -- this is deliberate
      // biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
      ;(object as any)[key] = ((object as any)[key] as string).replaceAll(/(^þÿ|\u0000)/g, '')
    }
  }
  return object
}

export async function pdf(
  input: string | Uint8Array | Buffer | NodeJS.ReadableStream,
  options: Options = {},
): Promise<{
  length: number
  metadata: PdfMetadata
  getPage(pageNumber: number): Promise<Buffer>
  [Symbol.asyncIterator](): AsyncIterator<Buffer, void, void>
}> {
  const data = await parseInput(input)
  const pdfDocument: any = await pdfjs.getDocument({
    password: options.password,
    standardFontDataUrl: path.join(pdfjsPath, `standard_fonts${path.sep}`),
    cMapUrl: path.join(pdfjsPath, `cmaps${path.sep}`),
    cMapPacked: true,
    ...options.docInitParams,
    isEvalSupported: false,
    data,
  }).promise
  const metadata = await pdfDocument.getMetadata()
  async function getPage(pageNumber: number): Promise<Buffer> {
    const page = await pdfDocument.getPage(pageNumber)
    const viewport = page.getViewport({ scale: options.scale ?? 1 })
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
    return canvas.toBuffer('image/png') as Buffer
  }
  return {
    length: pdfDocument.numPages as number,
    metadata: sanitize<PdfMetadata>(metadata.info ?? {}),
    getPage,
    [Symbol.asyncIterator]() {
      return {
        pg: 0,
        async next() {
          if (this.pg < pdfDocument.numPages) {
            this.pg += 1
            return { done: false, value: await getPage(this.pg) }
          }
          return { done: true, value: undefined as any }
        },
      }
    },
  }
}
