import { NextResponse } from 'next/server'
import { adminClient, bearerToken, getUserFromToken } from '@/lib/api'

/**
 * Per-user app settings stored as key/value rows in `app_settings`.
 * Supported keys:
 *  - withdrawal_limit: max single-send amount per coin (empty = no limit)
 *  - whitelist_only: 'true' = only send to saved/whitelisted addresses
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
      .from('app_settings')
      .select('key, value')
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json(
        { error: `Settings lookup failed: ${error.message}` },
        { status: 500 }
      )
    }

    const settings: Record<string, string> = {}
    for (const row of data ?? []) {
      settings[row.key] = row.value
    }
    return NextResponse.json({ settings })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 })
  }
}

export async function PUT(request: Request) {
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

    let body: { key?: unknown; value?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const key = typeof body.key === 'string' ? body.key.trim() : ''
    const value = typeof body.value === 'string' ? body.value : ''
    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 })
    }

    const supabase = adminClient()
    const { error } = await supabase.from('app_settings').upsert(
      { user_id: user.id, key, value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,key' }
    )
    if (error) {
      return NextResponse.json(
        { error: `Could not save setting: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, key, value })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Settings PUT error:', error)
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 })
  }
}
