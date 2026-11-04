import { getCompoundByCid, searchCompounds } from '@/lib/pubchem'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const cidParam = request.nextUrl.searchParams.get('cid')
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  const full = request.nextUrl.searchParams.get('full') === '1'

  if (cidParam) {
    const cid = Number(cidParam)
    const compound = await getCompoundByCid(cid)
    if (!compound) {
      return NextResponse.json({ error: 'Compound not found' }, { status: 404 })
    }
    return NextResponse.json(compound)
  }

  if (!query) {
    return NextResponse.json({ error: 'Missing q or cid' }, { status: 400 })
  }

  if (full) {
    const results = await searchCompounds(query)
    const compound = results[0] ? await getCompoundByCid(results[0].cid) : null
    return NextResponse.json({ results, compound })
  }

  const results = await searchCompounds(query)
  return NextResponse.json({ results })
}
