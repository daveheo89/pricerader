// ============================================================
//  네이버 쇼핑 API 검색 로직
//  Python search.py 의 핵심 알고리즘을 TypeScript로 포팅
// ============================================================

export type SearchResult = {
  title:     string
  price:     number
  shipping:  number
  total:     number
  mall:      string
  link:      string
  matchType: 'exact' | 'keyword'
}

const PROMO_PATTERNS = [
  /[\[\(【][^\]\)】]{0,20}(특가|무배|증정|할인|당일|인기|신상|이벤트|쿠폰|한정|묶음)[^\]\)】]{0,20}[\]\)】]/gi,
  /(당일출발|총알배송|로켓배송|무료배송|빠른배송|익일배송)/gi,
  /(최저가|정품|국내정품|AS가능|공식판매점|MD추천|베스트|공구|단독)/gi,
  /\d+\s*%\s*할인/gi,
]

const EXCLUDE_KEYWORDS = ['중고', '리퍼', '반품', 'b급', '대여', '렌탈']
const OVERSEAS_KEYWORDS = ['해외', '직구', 'global', 'worldwide', 'international']
const FREE_MALLS = ['쿠팡', '11번가', '지마켓', '옥션', '위메프', '롯데온', 'ssg', '네이버', '스마트스토어', '하이버']

function extractModelNumber(name: string): string | null {
  const patterns = [
    /\b[A-Za-z]{2,}-[A-Za-z0-9]{2,}(?:-[A-Za-z0-9]+)*\b/,
    /\b[A-Z]{1,3}\d{3,}[A-Za-z0-9]*\b/,
  ]
  for (const pat of patterns) {
    const m = name.match(pat)
    if (m) return m[0]
  }
  return null
}

function cleanQuery(name: string): string {
  let text = name.trim()
  for (const pat of PROMO_PATTERNS) text = text.replace(pat, ' ')
  text = text.replace(/[^\w\s\-\.]/g, ' ').replace(/\s{2,}/g, ' ').trim()
  return text
}

function extractTop3Keywords(name: string): string {
  const text = cleanQuery(name)
  const korean = text.match(/[가-힣]{2,}/g) || []
  const english = (text.match(/[A-Za-z]{2,}/g) || []).filter(
    w => !['the', 'and', 'for', 'with', 'of', 'in', 'is', 'it'].includes(w.toLowerCase())
  )
  const combined: string[] = []
  const seen = new Set<string>()
  for (const w of [...korean, ...english]) {
    if (!seen.has(w.toLowerCase())) {
      seen.add(w.toLowerCase())
      combined.push(w)
    }
    if (combined.length === 3) break
  }
  return combined.join(' ')
}

function makeQueries(rawName: string): { exact: string[]; keyword: string } {
  const text = cleanQuery(rawName)
  const exact: string[] = []
  const model = extractModelNumber(rawName)
  if (model) exact.push(model)
  const words = text.split(' ').filter(Boolean)
  if (words.length) exact.push(words.slice(0, 5).join(' '))
  const seen = new Set<string>()
  const deduped = exact.filter(q => {
    if (seen.has(q)) return false
    seen.add(q)
    return true
  })
  return { exact: deduped, keyword: extractTop3Keywords(rawName) }
}

async function callNaverApi(
  query: string,
  clientId: string,
  clientSecret: string,
  catalogOnly = false
): Promise<any[]> {
  const url = new URL('https://openapi.naver.com/v1/search/shop.json')
  url.searchParams.set('query', query)
  url.searchParams.set('display', '30')
  url.searchParams.set('sort', 'asc')

  const res = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id':     clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    if (res.status === 401) throw new Error('API_KEY_INVALID')
    if (res.status === 403) throw new Error('API_PERMISSION_DENIED')
    throw new Error(`API_ERROR_${res.status}`)
  }

  const data = await res.json()
  let items: any[] = data.items || []
  if (catalogOnly) {
    items = items.filter((it: any) => String(it.productType) === '1')
  }
  return items
}

function pickBest(items: any[]): Omit<SearchResult, 'matchType'> | null {
  for (const item of items) {
    const title = (item.title || '').replace(/<[^>]+>/g, '')
    const mall  = item.mallName || ''
    const price = parseInt(item.lprice || '0', 10)
    const link  = item.link || ''

    if (price === 0) continue
    const check = `${title} ${mall}`.toLowerCase()
    if (EXCLUDE_KEYWORDS.some(kw => check.includes(kw))) continue
    if (OVERSEAS_KEYWORDS.some(kw => check.includes(kw))) continue

    const shipping = FREE_MALLS.some(m => mall.includes(m)) ? 0 : 3000
    return { title, price, shipping, total: price + shipping, mall, link }
  }
  return null
}

// ── 메인 검색 함수 ──────────────────────────
export async function naverLowestPrice(
  rawName: string,
  clientId: string,
  clientSecret: string
): Promise<SearchResult | null> {
  const { exact, keyword } = makeQueries(rawName)

  // 1차: 정확 검색 — 카탈로그 우선
  for (const q of exact) {
    try {
      const items = await callNaverApi(q, clientId, clientSecret, true)
      const result = pickBest(items)
      if (result) return { ...result, matchType: 'exact' }
    } catch (e: any) {
      if (e.message.startsWith('API_')) throw e
    }
    await sleep(150)
  }

  // 2차: 정확 검색 — 전체
  for (const q of exact) {
    try {
      const items = await callNaverApi(q, clientId, clientSecret, false)
      const result = pickBest(items)
      if (result) return { ...result, matchType: 'exact' }
    } catch (e: any) {
      if (e.message.startsWith('API_')) throw e
    }
    await sleep(150)
  }

  // 3차: 키워드 3개 — 카탈로그
  if (keyword) {
    try {
      const items = await callNaverApi(keyword, clientId, clientSecret, true)
      const result = pickBest(items)
      if (result) return { ...result, matchType: 'keyword' }
    } catch {}
    await sleep(150)

    // 4차: 키워드 3개 — 전체
    try {
      const items = await callNaverApi(keyword, clientId, clientSecret, false)
      const result = pickBest(items)
      if (result) return { ...result, matchType: 'keyword' }
    } catch {}
  }

  return null
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}
