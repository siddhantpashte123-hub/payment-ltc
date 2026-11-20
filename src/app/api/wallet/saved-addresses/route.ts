import { NextResponse } from 'next/server'
import { adminClient, bearerToken, getUserFromToken } from '@/lib/api'

/**
 * GET /api/wallet/saved-addresses
 * Lists the current user's saved (whitelisted) recipient addresses.
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
    const { data, error } = await supabase
      .from('saved_addresses')
      .select('id, label, address, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: `Saved addresses lookup failed: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ addresses: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Saved addresses API error:', error)
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    )
  }
}

/**
 * POST /api/wallet/saved-addresses
 * Saves a new recipient address (label + address) for the user.
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

    let body: { label?: unknown; address?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const label =
      typeof body.label === 'string' ? body.label.trim().slice(0, 60) : ''
    const address =
      typeof body.address === 'string' ? body.address.trim() : ''

    if (!label || !address) {
      return NextResponse.json(
        { error: 'Label and address are required' },
        { status: 400 }
      )
    }

    const supabase = adminClient()
    const { data, error } = await supabase
      .from('saved_addresses')
      .insert({ user_id: user.id, label, address })
      .select('id, label, address, created_at')
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Could not save address: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ address: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Save address API error:', error)
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    )
  }
}
