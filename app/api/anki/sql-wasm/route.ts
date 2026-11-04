import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

export const runtime = 'nodejs'

const require = createRequire(`${process.cwd()}/package.json`)

export async function GET() {
  try {
    const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')
    const wasm = await readFile(wasmPath)
    return new Response(wasm, {
      headers: {
        'Content-Type': 'application/wasm',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('Could not load the Anki export WebAssembly asset.', error)
    return Response.json({ error: 'The Anki package generator is unavailable.' }, { status: 500 })
  }
}
