'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push('/dashboard')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || '비밀번호가 올바르지 않습니다.')
      }
    } catch {
      setError('서버 연결 오류. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9f9f8]">
      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-3 h-3 rounded-full bg-[#1D9E75]" />
          <span className="text-lg font-medium text-gray-900">가격레이더</span>
        </div>

        {/* 카드 */}
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h1 className="text-base font-medium text-gray-900 mb-1">로그인</h1>
          <p className="text-sm text-gray-500 mb-6">비밀번호를 입력하세요</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호"
              required
              autoFocus
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg
                         focus:outline-none focus:border-[#1D9E75] focus:ring-2
                         focus:ring-[#1D9E75]/10 transition"
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full h-10 bg-[#1D9E75] hover:bg-[#0F6E56] text-white
                         text-sm font-medium rounded-lg transition disabled:opacity-40
                         disabled:cursor-not-allowed"
            >
              {loading ? '확인 중...' : '로그인'}
            </button>
          </form>

          {/* 최초 실행 안내 */}
          <p className="mt-4 text-xs text-gray-400 text-center">
            처음 사용 시 → 설정에서 비밀번호를 먼저 설정하세요
          </p>
        </div>

      </div>
    </div>
  )
}
