import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyPassword, hashPassword, createToken, setAuthCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    if (!password) {
      return NextResponse.json({ error: '비밀번호를 입력하세요.' }, { status: 400 })
    }

    // DB에서 설정 가져오기
    const { data: settings } = await supabase
      .from('settings')
      .select('password_hash')
      .eq('id', 1)
      .single()

    // 최초 실행: 비밀번호가 없으면 지금 입력한 값으로 설정
    if (!settings?.password_hash) {
      const hash = await hashPassword(password)
      await supabase
        .from('settings')
        .upsert({ id: 1, password_hash: hash })

      const token = await createToken()
      await setAuthCookie(token)
      return NextResponse.json({ ok: true, firstTime: true })
    }

    // 비밀번호 검증
    const valid = await verifyPassword(password, settings.password_hash)
    if (!valid) {
      return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 })
    }

    const token = await createToken()
    await setAuthCookie(token)
    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
