import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { naverLowestPrice } from '@/lib/naver'
import { decrypt } from '@/lib/encrypt'

export async function POST(req: NextRequest) {
  try {
    const { name, myPrice } = await req.json()
    if (!name) {
      return NextResponse.json({ error: '상품명이 필요합니다.' }, { status: 400 })
    }

    // DB에서 네이버 API 키 가져오기
    const { data: settings } = await supabase
      .from('settings')
      .select('naver_client_id, naver_client_secret')
      .eq('id', 1)
      .single()

    if (!settings?.naver_client_id || !settings?.naver_client_secret) {
      return NextResponse.json(
        { error: '네이버 API 키가 설정되지 않았습니다. 설정 화면에서 입력해주세요.' },
        { status: 400 }
      )
    }

    // 암호화된 키 복호화
    const clientId     = await decrypt(settings.naver_client_id)
    const clientSecret = await decrypt(settings.naver_client_secret)

    // 검색 실행
    const result = await naverLowestPrice(name, clientId, clientSecret)

    if (!result) {
      return NextResponse.json({ result: null })
    }

    // 비고 계산
    let note = '-'
    if (myPrice && result.price < myPrice) {
      note = `▼ ${(myPrice - result.price).toLocaleString()}원 저렴`
    } else if (myPrice && result.price === myPrice) {
      note = '동일'
    } else if (myPrice) {
      note = `▲ ${(result.price - myPrice).toLocaleString()}원 비쌈`
    }

    return NextResponse.json({
      result: {
        ...result,
        note,
        shippingStr: result.shipping === 0 ? '무료' : `${result.shipping.toLocaleString()}원`,
      },
    })

  } catch (err: any) {
    console.error('Search error:', err)
    if (err.message === 'API_KEY_INVALID') {
      return NextResponse.json({ error: 'API 키가 올바르지 않습니다.' }, { status: 400 })
    }
    if (err.message === 'API_PERMISSION_DENIED') {
      return NextResponse.json({ error: 'API 권한이 없습니다. 네이버 개발자센터를 확인하세요.' }, { status: 400 })
    }
    return NextResponse.json({ error: '검색 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
