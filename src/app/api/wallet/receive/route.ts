import { NextResponse } from 'next/server'
import { adminClient, bearerToken, getUserFromToken } from '@/lib/api'

/**
 * GET /api/wallet/receive - list the user's receive requests (invoices)
 */
export async function GET(request: Request) {
  try {
    const token = bearerToken(request)
    if (!token) {
      return NextResponse.json(
        { error: 'Missing access token. Please sign in again.' },
        { status: 401 }
      )
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json(
        { error: 'Session expired. Please sign in again.' },
        { status: 401 }
      )
    }

    const supabase = adminClient()
    const coin = request.url.includes('coin=sol') ? 'sol' : 'ltc'
    const { data, error } = await supabase
      .from('receive_requests')
      .select('id, amount_ltc, note, coin, created_at')
      .eq('user_id', user.id)
      .eq('coin', coin)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json(
        { error: `Receive requests lookup failed: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ requests: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Receive requests API error:', error)
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    )
  }
}

/**
 * POST /api/wallet/receive - create a new receive request (invoice)
 */
export async function POST(request: Request) {
  try {
    const token = bearerToken(request)
    if (!token) {
      return NextResponse.json(
        { error: 'Missing access token. Please sign in again.' },
        { status: 401 }
      )
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json(
        { error: 'Session expired. Please sign in again.' },
        { status: 401 }
      )
    }

    let body: { amount?: unknown; note?: unknown; coin?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const coin: 'ltc' | 'sol' = body.coin === 'sol' ? 'sol' : 'ltc'
    const amount = Number(body.amount)
    const note =
      typeof body.note === 'string' && body.note.trim().length <= 200
        ? body.note.trim()
        : null

    if (!isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Please enter a valid amount' },
        { status: 400 }
      )
    }

    const supabase = adminClient()
    const { data, error } = await supabase
      .from('receive_requests')
      .insert({ user_id: user.id, amount_ltc: amount, note, coin })
      .select('id, amount_ltc, note, coin, created_at')
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Could not create receive request: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ request: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Receive request API error:', error)
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    )
  }
}
