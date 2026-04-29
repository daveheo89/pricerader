import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { encrypt, decrypt } from '@/lib/encrypt'
import { hashPassword } from '@/lib/auth'

// 설정 조회
export async function GET() {
  const { data } = await supabase
    .from('settings')
    .select('naver_client_id, alert_email, cron_time')
    .eq('id', 1)
    .single()

  // client_id 는 마스킹해서 반환 (보안상 원본 노출 금지)
  return NextResponse.json({
    settings: {
      naver_client_id_set: !!data?.naver_client_id,
      alert_email:         data?.alert_email || '',
      cron_time:           data?.cron_time   || '09:00',
    },
  })
}

// 설정 저장
export async function POST(req: NextRequest) {
  const body = await req.json()
  const updates: Record<string, any> = {}

  // 네이버 API 키
  if (body.naver_client_id && body.naver_client_secret) {
    updates.naver_client_id     = await encrypt(body.naver_client_id)
    updates.naver_client_secret = await encrypt(body.naver_client_secret)
  }

  // 이메일
  if (body.alert_email !== undefined) {
    updates.alert_email = body.alert_email
  }

  // 자동 재검색 시각
  if (body.cron_time) {
    updates.cron_time = body.cron_time
  }

  // 비밀번호 변경
  if (body.new_password) {
    updates.password_hash = await hashPassword(body.new_password)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '변경할 항목이 없습니다.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('settings')
    .upsert({ id: 1, ...updates })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
