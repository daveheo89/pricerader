# 가격레이더 — 1주차 배포 가이드

## 순서 요약

1. 깃허브에 이 폴더 전체를 업로드
2. Vercel 에서 Import → 환경변수 입력 → Deploy
3. Supabase SQL Editor 에서 `supabase_setup.sql` 실행
4. 웹앱 접속 → 비밀번호 설정 → 네이버 API 키 입력 → 검색 시작

---

## 환경변수 (Vercel > Settings > Environment Variables)

| 이름 | 값 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase anon 키 |
| `AUTH_SECRET` | 랜덤 32자+ 문자열 | 로그인 토큰 서명용 |
| `ENCRYPT_KEY` | **정확히 32자** 문자열 | API 키 암호화용 |
| `RESEND_API_KEY` | `re_xxxx` | 이메일 알림 (선택) |
| `ALERT_EMAIL` | 이메일 주소 | 알림 받을 주소 |

### ENCRYPT_KEY 예시 (정확히 32자여야 함)
```
myPriceRader2025!SecretKey123456
```

---

## 최초 실행

1. 배포된 URL 접속
2. 비밀번호 입력 (처음 입력한 값이 비밀번호로 설정됨)
3. **설정** 탭 → 네이버 API 키 입력 → 저장
4. **상품 관리** 탭 → 엑셀 업로드 또는 수기 입력 → 검색 시작

---

## 로컬 개발 (선택)

```bash
npm install
cp .env.example .env.local
# .env.local 에 실제 값 입력
npm run dev
```

http://localhost:3000 접속
