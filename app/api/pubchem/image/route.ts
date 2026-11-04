import { getCompoundImageUrl } from '@/lib/pubchem'

export async function GET(request: Request) {
  const cid = Number(new URL(request.url).searchParams.get('cid'))
  if (!Number.isSafeInteger(cid) || cid <= 0) {
    return Response.json({ error: 'A valid compound CID is required.' }, { status: 400 })
  }

  try {
    const response = await fetch(getCompoundImageUrl(cid), {
      signal: AbortSignal.timeout(20_000),
      next: { revalidate: 86_400 },
    })
    if (!response.ok) {
      return Response.json({ error: 'PubChem did not return a structure image.' }, { status: 502 })
    }

    const image = await response.arrayBuffer()
    return new Response(image, {
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error(`PubChem structure image request failed for CID ${cid}.`, error)
    return Response.json({ error: 'Could not retrieve the structure image from PubChem.' }, { status: 502 })
  }
}
