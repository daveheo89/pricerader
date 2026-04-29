'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

// ── 타입 ──────────────────────────────────────────
type RowInput = { name: string; myPrice: number | null }

type ResultRow = {
  searchName:  string
  myPrice:     number | null
  naverPrice:  number | null
  matchType:   'exact' | 'keyword' | null
  shipping:    string
  total:       number | null
  note:        string
  link:        string
  mall:        string
  status:      'pending' | 'done' | 'error'
  error?:      string
}

// ── 유틸 ──────────────────────────────────────────
function rowClass(row: ResultRow): string {
  if (!row.naverPrice || !row.myPrice) return ''
  if (row.matchType === 'keyword') return 'row-orange'
  if (row.naverPrice < row.myPrice)  return 'row-yellow'
  return ''
}

// ── 컴포넌트 ──────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()

  // 탭
  const [tab, setTab] = useState<'products' | 'results' | 'settings'>('products')

  // 입력 목록
  const [rows, setRows]         = useState<RowInput[]>([{ name: '', myPrice: null }])
  const [results, setResults]   = useState<ResultRow[]>([])
  const [searching, setSearching] = useState(false)
  const [progress, setProgress]   = useState({ done: 0, total: 0 })
  const stopRef = useRef(false)

  // 설정
  const [settings, setSettings] = useState({
    clientId: '', clientSecret: '', email: '', cronTime: '09:00', newPassword: ''
  })
  const [settingMsg, setSettingMsg] = useState('')

  // 수기 입력 행 관리
  function addRow() {
    setRows(prev => [...prev, { name: '', myPrice: null }])
  }
  function removeRow(i: number) {
    setRows(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateRow(i: number, key: keyof RowInput, val: string) {
    setRows(prev => prev.map((r, idx) =>
      idx !== i ? r : { ...r, [key]: key === 'myPrice' ? (val ? parseInt(val) : null) : val }
    ))
  }

  // 엑셀 파싱
  function handleExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
      const parsed: RowInput[] = []
      for (let i = 1; i < data.length; i++) {
        const name = String(data[i][0] || '').trim()
        if (!name || name === '검색할 상품명') continue
        const price = data[i][1] ? parseInt(String(data[i][1])) : null
        parsed.push({ name, myPrice: isNaN(price!) ? null : price })
      }
      if (parsed.length) setRows(parsed)
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  // 검색 실행
  async function startSearch() {
    const validRows = rows.filter(r => r.name.trim())
    if (!validRows.length) return
    stopRef.current = false
    setSearching(true)
    setProgress({ done: 0, total: validRows.length })
    setResults(validRows.map(r => ({
      searchName: r.name, myPrice: r.myPrice,
      naverPrice: null, matchType: null, shipping: '-',
      total: null, note: '-', link: '', mall: '',
      status: 'pending',
    })))
    setTab('results')

    for (let i = 0; i < validRows.length; i++) {
      if (stopRef.current) break
      const row = validRows[i]
      try {
        const res = await fetch('/api/search', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name: row.name, myPrice: row.myPrice }),
        })
        const data = await res.json()
        setResults(prev => prev.map((r, idx) =>
          idx !== i ? r : data.result
            ? {
                ...r,
                naverPrice: data.result.price,
                matchType:  data.result.matchType,
                shipping:   data.result.shippingStr,
                total:      data.result.total,
                note:       data.result.note,
                link:       data.result.link,
                mall:       data.result.mall,
                status:     'done',
              }
            : { ...r, status: 'error', error: data.error || '결과 없음' }
        ))
      } catch {
        setResults(prev => prev.map((r, idx) =>
          idx !== i ? r : { ...r, status: 'error', error: '네트워크 오류' }
        ))
      }
      setProgress({ done: i + 1, total: validRows.length })
      await new Promise(r => setTimeout(r, 300))
    }
    setSearching(false)
  }

  // 엑셀 복사
  function copyToClipboard() {
    const headers = ['검색상품', '판매가(원)', '네이버 최저가(원)', '검색방식', '배송비', '배송포함 합계(원)', '비고', '네이버 쇼핑 링크']
    const dataRows = results.map(r => [
      r.searchName,
      r.myPrice   ?? '-',
      r.naverPrice ?? '-',
      r.matchType === 'exact' ? '정확일치' : r.matchType === 'keyword' ? '★키워드검색' : '-',
      r.shipping,
      r.total     ?? '-',
      r.note,
      r.link || '-',
    ])
    const tsv = [headers, ...dataRows].map(row => row.join('\t')).join('\n')
    navigator.clipboard.writeText(tsv).then(() => alert('클립보드에 복사됐어요! 엑셀에서 Ctrl+V 하세요.'))
  }

  // 설정 저장
  async function saveSettings() {
    setSettingMsg('')
    const body: any = {}
    if (settings.clientId && settings.clientSecret) {
      body.naver_client_id     = settings.clientId
      body.naver_client_secret = settings.clientSecret
    }
    if (settings.email)       body.alert_email  = settings.email
    if (settings.cronTime)    body.cron_time     = settings.cronTime
    if (settings.newPassword) body.new_password  = settings.newPassword

    const res = await fetch('/api/settings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    setSettingMsg(data.ok ? '저장됐어요!' : (data.error || '저장 실패'))
  }

  // 로그아웃
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="min-h-screen bg-[#f9f9f8]">
      {/* 상단 네비 */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#1D9E75]" />
          <span className="text-sm font-medium text-gray-900">가격레이더</span>
        </div>
        <div className="flex gap-1">
          {(['products', 'results', 'settings'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                tab === t
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              { t === 'products' ? '상품 관리'
              : t === 'results'  ? '검색 결과'
              :                    '설정' }
            </button>
          ))}
        </div>
        <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600 transition">
          로그아웃
        </button>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* ──── 상품 관리 탭 ──── */}
        {tab === 'products' && (
          <div>
            {/* 엑셀 업로드 */}
            <label className="block border-2 border-dashed border-gray-200 rounded-xl
                              p-6 text-center cursor-pointer hover:border-[#1D9E75]
                              hover:bg-[#E1F5EE]/30 transition mb-4">
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcel} />
              <p className="text-sm font-medium text-gray-700 mb-1">
                상품목록.xlsx 드래그&드롭 또는 클릭
              </p>
              <p className="text-xs text-gray-400">A열 = 상품명 · B열 = 판매가(원)</p>
            </label>

            {/* 수기 입력 */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
              <p className="text-xs font-medium text-gray-500 mb-3">수기 입력</p>
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`상품명 ${i + 1}`}
                      value={row.name}
                      onChange={e => updateRow(i, 'name', e.target.value)}
                      className="flex-1 h-9 px-3 text-sm border border-gray-200 rounded-lg
                                 focus:outline-none focus:border-[#1D9E75] transition"
                    />
                    <input
                      type="number"
                      placeholder="판매가(원)"
                      value={row.myPrice ?? ''}
                      onChange={e => updateRow(i, 'myPrice', e.target.value)}
                      className="w-32 h-9 px-3 text-sm border border-gray-200 rounded-lg
                                 focus:outline-none focus:border-[#1D9E75] transition"
                    />
                    {rows.length > 1 && (
                      <button onClick={() => removeRow(i)}
                        className="h-9 px-3 text-xs text-red-500 bg-red-50 border border-red-100
                                   rounded-lg hover:bg-red-100 transition">
                        삭제
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={addRow}
                  className="h-8 px-3 text-xs text-gray-500 border border-dashed border-gray-300
                             rounded-lg hover:border-gray-400 transition">
                  + 행 추가
                </button>
              </div>
            </div>

            {/* 검색 시작 */}
            <button
              onClick={startSearch}
              disabled={searching || !rows.some(r => r.name.trim())}
              className="w-full h-11 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm
                         font-medium rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {searching ? `검색 중... (${progress.done}/${progress.total})` : '최저가 검색 시작'}
            </button>
          </div>
        )}

        {/* ──── 검색 결과 탭 ──── */}
        {tab === 'results' && (
          <div>
            {/* 진행률 */}
            {searching && (
              <div className="mb-4">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-[#1D9E75] transition-all duration-300"
                       style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-gray-500">
                  {progress.done}/{progress.total} 검색 중...
                </p>
              </div>
            )}

            {/* 색상 범례 + 복사 버튼 */}
            {results.length > 0 && (
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-yellow-300 border border-yellow-400 inline-block" />
                    정확 검색 + 내 가격 이하
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-orange-400 border border-orange-500 inline-block" />
                    키워드 검색 (상품명 확인 필요)
                  </span>
                </div>
                <button onClick={copyToClipboard}
                  className="h-8 px-4 bg-[#217346] hover:bg-[#185c38] text-white text-xs
                             font-medium rounded-lg transition">
                  엑셀 복사 (Ctrl+V)
                </button>
              </div>
            )}

            {/* 결과 테이블 */}
            {results.length > 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-gray-50">
                      {['검색상품','판매가','네이버 최저가','검색방식','배송비','합계','비고','링크'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-medium
                                               text-gray-500 border-b border-gray-200 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, i) => (
                      <tr key={i} className={`border-b border-gray-100 last:border-0 ${rowClass(row)}`}>
                        <td className="px-3 py-2.5 text-gray-800 max-w-[220px] truncate" title={row.searchName}>
                          {row.searchName}
                        </td>
                        <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                          {row.myPrice ? row.myPrice.toLocaleString() + '원' : '-'}
                        </td>
                        <td className={`px-3 py-2.5 font-medium whitespace-nowrap ${
                          row.naverPrice && row.myPrice && row.naverPrice < row.myPrice
                            ? 'text-[#0F6E56]'
                            : row.naverPrice && row.myPrice && row.naverPrice > row.myPrice
                            ? 'text-red-600' : 'text-gray-800'
                        }`}>
                          {row.status === 'pending' ? (
                            <span className="text-gray-400">검색 중...</span>
                          ) : row.status === 'error' ? (
                            <span className="text-red-500 text-xs">{row.error}</span>
                          ) : row.naverPrice ? (
                            row.naverPrice.toLocaleString() + '원'
                          ) : '-'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {row.matchType === 'exact' ? (
                            <span className="text-xs px-2 py-0.5 bg-[#E1F5EE] text-[#085041] rounded-full">정확일치</span>
                          ) : row.matchType === 'keyword' ? (
                            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">★키워드검색</span>
                          ) : '-'}
                        </td>
                        <td className={`px-3 py-2.5 text-xs whitespace-nowrap ${
                          row.shipping === '무료' ? 'text-[#0F6E56] font-medium' : 'text-gray-500'
                        }`}>
                          {row.status === 'done' ? row.shipping : '-'}
                        </td>
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                          {row.total ? row.total.toLocaleString() + '원' : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-xs whitespace-nowrap">{row.note}</td>
                        <td className="px-3 py-2.5">
                          {row.link ? (
                            <a href={row.link} target="_blank" rel="noopener noreferrer"
                               className="text-xs text-[#1D9E75] hover:underline">
                              보기 →
                            </a>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <p className="text-sm text-gray-400">
                  상품 관리 탭에서 상품을 입력하고 검색을 시작하세요.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ──── 설정 탭 ──── */}
        {tab === 'settings' && (
          <div className="max-w-lg space-y-4">

            {/* 네이버 API 키 */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm font-medium text-gray-900 mb-4">네이버 API 키</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Client ID</label>
                  <input type="text" placeholder="발급받은 Client ID"
                    value={settings.clientId}
                    onChange={e => setSettings(s => ({ ...s, clientId: e.target.value }))}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg
                               focus:outline-none focus:border-[#1D9E75] transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Client Secret</label>
                  <input type="password" placeholder="발급받은 Client Secret"
                    value={settings.clientSecret}
                    onChange={e => setSettings(s => ({ ...s, clientSecret: e.target.value }))}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg
                               focus:outline-none focus:border-[#1D9E75] transition"
                  />
                </div>
              </div>
            </div>

            {/* 알림 설정 */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm font-medium text-gray-900 mb-4">알림 설정</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">알림 이메일</label>
                  <input type="email" placeholder="알림받을@이메일.com"
                    value={settings.email}
                    onChange={e => setSettings(s => ({ ...s, email: e.target.value }))}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg
                               focus:outline-none focus:border-[#1D9E75] transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">자동 재검색 시각</label>
                  <input type="time" value={settings.cronTime}
                    onChange={e => setSettings(s => ({ ...s, cronTime: e.target.value }))}
                    className="h-9 px-3 text-sm border border-gray-200 rounded-lg
                               focus:outline-none focus:border-[#1D9E75] transition"
                  />
                </div>
              </div>
            </div>

            {/* 비밀번호 변경 */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm font-medium text-gray-900 mb-4">비밀번호 변경</p>
              <input type="password" placeholder="새 비밀번호"
                value={settings.newPassword}
                onChange={e => setSettings(s => ({ ...s, newPassword: e.target.value }))}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg
                           focus:outline-none focus:border-[#1D9E75] transition"
              />
            </div>

            {settingMsg && (
              <p className={`text-sm px-3 py-2 rounded-lg ${
                settingMsg.includes('저장') ? 'bg-[#E1F5EE] text-[#085041]' : 'bg-red-50 text-red-600'
              }`}>
                {settingMsg}
              </p>
            )}

            <button onClick={saveSettings}
              className="w-full h-11 bg-[#1D9E75] hover:bg-[#0F6E56] text-white text-sm
                         font-medium rounded-xl transition">
              저장
            </button>
          </div>
        )}

      </main>
    </div>
  )
}
