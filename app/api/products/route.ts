import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 상품 목록 조회
export async function GET() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products: data })
}

// 상품 추가
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, my_price, group_id, link } = body

  if (!name) return NextResponse.json({ error: '상품명이 필요합니다.' }, { status: 400 })

  const { data, error } = await supabase
    .from('products')
    .insert({ name, my_price: my_price || null, group_id: group_id || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 링크가 있으면 가격 히스토리에 수동 기록
  if (link && data) {
    await supabase.from('price_history').insert({
      product_id:         data.id,
      naver_lowest_price: my_price || null,
      link,
      total:              my_price || null,
    })
  }

  return NextResponse.json({ product: data })
}

// 상품 삭제
export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 })

  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
