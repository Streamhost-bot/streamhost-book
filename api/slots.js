async function getGoogleToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CALENDAR_CLIENT_ID,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Google token error: ${JSON.stringify(data)}`)
  return data.access_token
}

function pad(n) { return String(n).padStart(2, '0') }

// Extract YYYY-MM-DD in MYT from a Date object constructed at midnight MYT
function mytDateKey(date) {
  // Add 8h to get MYT midnight in UTC epoch, then read UTC fields
  const mytMs = date.getTime() + 8 * 60 * 60 * 1000
  const d = new Date(mytMs)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

function generateSlots(busyIntervals, from, to, startHour = 10) {
  const result = {}
  const now = new Date()
  const cutoff = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000)

  // Iterate day by day (cursor = midnight MYT each day)
  let cursor = new Date(`${from}T00:00:00+08:00`)
  const end  = new Date(`${to}T23:59:59+08:00`)

  while (cursor <= end) {
    // MYT day-of-week: add 8h to get UTC-equivalent of MYT midnight
    const mytMs  = cursor.getTime() + 8 * 60 * 60 * 1000
    const mytDay = new Date(mytMs)
    const dow    = mytDay.getUTCDay() // 0=Sun, 6=Sat

    if (dow !== 0 && dow !== 6) {
      const dateKey  = mytDateKey(cursor)
      const daySlots = []

      for (let h = startHour; h <= 16; h++) {
        for (let m = 0; m < 60; m += 30) {
          if (h === 16 && m > 30) continue  // last valid slot: 16:30

          const slotISO   = `${dateKey}T${pad(h)}:${pad(m)}:00+08:00`
          const slotStart = new Date(slotISO)

          if (slotStart <= now)    continue  // past
          if (slotStart > cutoff) continue   // beyond 3-week window

          // Buffer window: [slot - 30min, slot + 60min]
          const bufferStart = new Date(slotStart.getTime() - 30 * 60 * 1000)
          const bufferEnd   = new Date(slotStart.getTime() + 60 * 60 * 1000)

          const isFree = !busyIntervals.some(b => {
            const bStart = new Date(b.start)
            const bEnd   = new Date(b.end)
            return bStart < bufferEnd && bEnd > bufferStart
          })

          if (isFree) daySlots.push(`${pad(h)}:${pad(m)}`)
        }
      }

      if (daySlots.length > 0) result[dateKey] = daySlots
    }

    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  }

  return result
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { from, to, round } = req.query
  if (!from || !to) return res.status(400).json({ error: 'from and to params required (YYYY-MM-DD)' })
  const startHour = 11

  const fromDate = new Date(`${from}T00:00:00+08:00`)
  const toDate   = new Date(`${to}T23:59:59+08:00`)
  const spanDays = (toDate - fromDate) / (24 * 60 * 60 * 1000)
  if (isNaN(spanDays) || spanDays > 22) {
    return res.status(400).json({ error: 'Invalid date range (max 21 days)' })
  }

  try {
    const token = await getGoogleToken()
    const fbRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeMin:  fromDate.toISOString(),
        timeMax:  toDate.toISOString(),
        timeZone: 'Asia/Kuala_Lumpur',
        items:    [{ id: 'primary' }],
      }),
    })
    const fbData = await fbRes.json()
    const busy   = fbData.calendars?.primary?.busy || []
    const slots  = generateSlots(busy, from, to, startHour)
    return res.status(200).json({ slots })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
