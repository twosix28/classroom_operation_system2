import { ktbizEncrypt } from '../crypto/encrypt.js'

export const runtime = 'nodejs'

const ROOM_MAP = {
  '30386': { room: '237', name: '집현공유실(대회의실)' },
  '30387': { room: '238', name: '공감동행실(중회의실)' },
  '30388': { room: '133', name: '인천공항홀' },
  '30389': { room: '240', name: '소회의실(240호)' },
  '30390': { room: '347', name: '스튜디오실(347-348호)' },
  '30392': { room: '457', name: '소회의실(457호)' },
  '30393': { room: '232', name: '소형강의실(232호)' },
  '30394': { room: '233', name: '소형강의실(233호)' },
  '30395': { room: '234', name: '소형강의실(234호)' },
  '30396': { room: '239', name: '중형강의실(239호)' },
}

function parseXml(xml) {
  const results = []
  const regex = /<appointment>([\s\S]*?)<\/appointment>/g
  let m
  while ((m = regex.exec(xml)) !== null) {
    const c = m[1]
    const get = (tag) => {
      const r = c.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`))
      return r ? r[1].trim() : ''
    }
    const ownerId = get('owner_id')
    if (!ROOM_MAP[ownerId]) continue  // 매핑 없는 항목(zoom 공지 등) 제외
    const roomInfo = ROOM_MAP[ownerId]
    // KT 비즈는 KST를 Z로 잘못 표기 → Z 제거해서 로컬 시간으로 처리
    const toLocal = (s) => s.replace(/\.000Z$/, '').replace(/Z$/, '')
    results.push({
      id: get('number'),
      title: get('subject'),
      start_time: toLocal(get('dtstart')),
      end_time: toLocal(get('dtend')),
      author: get('owner_nm'),
      dept: get('dept_name'),
      room: roomInfo.room,
      room_name: roomInfo.name,
    })
  }
  return results
}

const BASE_URL = 'https://ngwx.ktbizoffice.com'
const COMPID = 'iiaci'
const RES_ID = '30361'

/**
 * 1단계: 로그인 페이지에서 ViewState + RSA 공개키 파싱
 */
async function fetchLoginPage() {
  const res = await fetch(`${BASE_URL}/LoginN.aspx?compid=${COMPID}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  const html = await res.text()
  const rawCookies = res.headers.get('set-cookie') || ''
  const cookies = rawCookies.split(',').map(c => c.trim().split(';')[0].trim()).filter(Boolean).join('; ')

  // ViewState 파싱 (정규식)
  const viewstate = html.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || ''
  const viewstateGen = html.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || ''
  const eventValidation = html.match(/id="__EVENTVALIDATION"\s+value="([^"]+)"/)?.[1] || ''

  // RSA 공개키 파싱
  const modulus = html.match(/publicModulus[^>]*value="([^"]+)"/)?.[1]
    || html.match(/name="publicModulus"\s+value="([^"]+)"/)?.[1]
    || ''
  const exponent = html.match(/publicExponent[^>]*value="([^"]+)"/)?.[1]
    || html.match(/name="publicExponent"\s+value="([^"]+)"/)?.[1]
    || '010001'

  return { viewstate, viewstateGen, eventValidation, modulus, exponent, cookies }
}

/**
 * 3단계: 로그인 POST → LoginCookie 수신
 */
async function login(userId, userPw) {
  const { viewstate, viewstateGen, eventValidation, modulus, exponent, cookies: initCookies } =
    await fetchLoginPage()

  const encryptedId = ktbizEncrypt(userId, modulus, exponent)
  const encryptedPw = ktbizEncrypt(userPw, modulus, exponent)

  const body = new URLSearchParams({
    compid: COMPID,
    __VIEWSTATE: viewstate,
    __VIEWSTATEGENERATOR: viewstateGen,
    __EVENTVALIDATION: eventValidation,
    seq: '',
    pageNum: '',
    sel_part: '',
    TextUserID: '',
    TextPassword: '',
    EncryptUserID: encryptedId,
    EncryptPassword: encryptedPw,
    Encryptcid: COMPID,
    publicModulus: modulus,
    publicExponent: exponent,
    'LoginButton.x': '50',
    'LoginButton.y': '20',
    TextBox1: '',
  })

  const res = await fetch(`${BASE_URL}/LoginN.aspx?compid=${COMPID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': initCookies,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': `${BASE_URL}/LoginN.aspx?compid=${COMPID}`,
    },
    body: body.toString(),
    redirect: 'manual',
  })

  const setCookieHeader = res.headers.get('set-cookie') || ''
  const loginCookieMatch = setCookieHeader.match(/LoginCookie=([^;]+)/)
  if (!loginCookieMatch) {
    throw new Error('로그인 실패: LoginCookie를 받지 못했습니다')
  }

  return setCookieHeader
}

/**
 * 4단계: 회의실 예약 조회
 */
async function fetchSchedule(loginCookieStr, startDate, endDate) {
  const xmlBody = `<PARAMETER><STARTDATETIME>${startDate}</STARTDATETIME><ENDDATETIME>${endDate}</ENDDATETIME><APP>1</APP></PARAMETER>`

  const res = await fetch(
    `${BASE_URL}/Myoffice/ezResource/ResSch/Schedule_Get.aspx?cmd=get&ResID=${RES_ID}&p_Type=MAIN`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'Cookie': loginCookieStr,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': `${BASE_URL}/Myoffice/ezResource/ViewResList2.aspx?brd_id=${RES_ID}&AccessCode=`,
        'Origin': BASE_URL,
      },
      body: xmlBody,
    }
  )

  return await res.text()
}

// ─── LoginCookie 인메모리 캐시 ──────────────────────────────────────────────
// 매 요청마다 로그인(3 HTTP 왕복)하는 비용을 줄임
// Vercel Serverless: 동일 인스턴스 재사용 시 캐시 히트, cold start 시 재로그인
let _cachedCookie = null
let _cookieExpiry = 0
const COOKIE_TTL_MS = 25 * 60 * 1000 // 25분 (KT 세션 30분 기준)

async function getLoginCookie(userId, userPw) {
  if (_cachedCookie && Date.now() < _cookieExpiry) return _cachedCookie
  const cookieStr = await login(userId, userPw)
  _cachedCookie = cookieStr
  _cookieExpiry = Date.now() + COOKIE_TTL_MS
  return cookieStr
}

function invalidateLoginCookie() {
  _cachedCookie = null
  _cookieExpiry = 0
}

/**
 * GET /api/ktbiz/schedule?start=2026-03-16&end=2026-03-22
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('start') || new Date().toISOString().split('T')[0]
  const endDate = searchParams.get('end') || startDate

  const userId = process.env.KTBIZ_USER_ID
  const userPw = process.env.KTBIZ_USER_PW

  if (!userId || !userPw) {
    return Response.json({ error: 'KTBIZ_USER_ID / KTBIZ_USER_PW 환경변수가 없습니다' }, { status: 500 })
  }

  try {
    const cookieStr = await getLoginCookie(userId, userPw)
    const xmlData = await fetchSchedule(cookieStr, startDate, endDate)

    // 세션 만료 감지(로그인 페이지로 리다이렉트된 HTML) → 캐시 무효화 후 1회 재시도
    if (xmlData.includes('LoginN.aspx')) {
      invalidateLoginCookie()
      const freshCookie = await getLoginCookie(userId, userPw)
      const retryData = await fetchSchedule(freshCookie, startDate, endDate)
      return Response.json({ schedules: parseXml(retryData) })
    }

    return Response.json({ schedules: parseXml(xmlData) })
  } catch (err) {
    console.error('[ktbiz] 오류:', err)
    if (err.message.includes('LoginCookie') || err.message.includes('로그인')) {
      invalidateLoginCookie()
    }
    return Response.json({ error: err.message }, { status: 500 })
  }
}
