import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

const SMTP = {
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE !== 'false',
  auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
}

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

function generateICS({ uid, title, start, durationMinutes, description, attendees, meetLink }) {
  const startDt = new Date(start)
  const endDt   = new Date(startDt.getTime() + durationMinutes * 60000)
  const fmt     = d => d.toISOString().replace(/[-:]/g, '').replace('.000Z', 'Z')
  const desc    = (description + (meetLink ? `\nJoin: ${meetLink}` : '')).replace(/\n/g, '\\n')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Streamhost//Book//EN', 'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(startDt)}`,
    `DTEND:${fmt(endDt)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${desc}`,
    ...attendees.map(a => `ATTENDEE;CN=${a.name};RSVP=TRUE:mailto:${a.email}`),
    // 24h reminder
    'BEGIN:VALARM', 'TRIGGER:-PT1440M', 'ACTION:DISPLAY', 'DESCRIPTION:Interview tomorrow — Streamhost', 'END:VALARM',
    // 1h reminder
    'BEGIN:VALARM', 'TRIGGER:-PT60M', 'ACTION:DISPLAY', 'DESCRIPTION:Interview in 1 hour — Streamhost', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
}

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

function fmtMYT(iso) {
  return new Date(iso).toLocaleString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const raw = req.body
  const body = typeof raw === 'string' ? JSON.parse(raw) : (raw || {})
  const { slot, name, email, phone, role, id } = body
  if (!slot || !name || !email) {
    return res.status(400).json({ error: 'Missing required fields: slot, name, email' })
  }
  const roleLabel = role || 'Candidate'

  const token = await getGoogleToken()

  // ── 1. Double-booking guard ────────────────────────────────────────
  const slotDt       = new Date(slot)
  const bufferStart  = new Date(slotDt.getTime() - 30 * 60 * 1000)
  const bufferEnd    = new Date(slotDt.getTime() + 60 * 60 * 1000)
  const fbRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timeMin: bufferStart.toISOString(),
      timeMax: bufferEnd.toISOString(),
      timeZone: 'Asia/Kuala_Lumpur',
      items: [{ id: 'primary' }],
    }),
  })
  const fbData = await fbRes.json()
  const busy = fbData.calendars?.primary?.busy || []
  const overlap = busy.some(b => new Date(b.start) < bufferEnd && new Date(b.end) > bufferStart)
  if (overlap) {
    return res.status(409).json({ error: 'slot_taken', message: 'This slot was just booked. Please pick another time.' })
  }

  // ── 2. Create Google Calendar event + Meet link ────────────────────
  const endDt = new Date(slotDt.getTime() + 30 * 60 * 1000)
  const requestId = `streamhost-book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  let evtRes, evt
  try {
    evtRes = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary:     `Interview — ${name} · ${roleLabel}`,
          description: `Round 1 Interview · Streamhost · Google Meet\nCandidate: ${name}\nRole: ${roleLabel}${phone ? `\nPhone: ${phone}` : ''}`,
          start: { dateTime: slotDt.toISOString(), timeZone: 'Asia/Kuala_Lumpur' },
          end:   { dateTime: endDt.toISOString(),  timeZone: 'Asia/Kuala_Lumpur' },
          attendees: [
            { email, displayName: name },
            { email: process.env.ALVIN_EMAIL || 'alvinwee@streamhost.app' },
          ],
          conferenceData: {
            createRequest: {
              requestId,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 1440 },
              { method: 'email', minutes: 60 },
              { method: 'popup', minutes: 15 },
            ],
          },
        }),
      }
    )
    evt = await evtRes.json()
    if (!evtRes.ok) throw new Error(evt.error?.message || 'Calendar API error')
  } catch (e) {
    return res.status(500).json({ error: `Failed to create calendar event: ${e.message}` })
  }

  const meetLink = evt.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri || null
  const eventId  = evt.id
  const slotFmt  = fmtMYT(slot)

  const icsPayload = {
    uid:             `${eventId}@streamhost`,
    title:           `Interview — ${roleLabel} at Streamhost`,
    start:           slotDt.toISOString(),
    durationMinutes: 30,
    description:     `Interviewer: Alvin Wee (CEO, Streamhost)\nRole: ${roleLabel}`,
    attendees:       [
      { name, email },
      { name: 'Alvin Wee', email: process.env.ALVIN_EMAIL || 'alvinwee@streamhost.app' },
    ],
    meetLink,
  }

  // ── 3 & 4. Send emails (non-fatal) ────────────────────────────────
  try {
    const transporter = nodemailer.createTransport(SMTP)
    const from        = `"${process.env.FROM_NAME || 'Alvin Wee'}" <${process.env.FROM_EMAIL || 'info@streamhost.app'}>`

    // Candidate confirmation
    const candidateBody = `Hi ${name},

Your interview is confirmed. Here are your details:

Date & Time: ${slotFmt} (Malaysia Time, UTC+8)
Duration: 30 minutes
Format: Online — Google Meet
Meeting Link: ${meetLink || '(link in your calendar invite)'}
Interviewer: Alvin Wee, CEO — Streamhost

A calendar invite has been sent to your email. If you need to reschedule, please reply to this email.

See you soon,
Alvin Wee
Streamhost`

    await transporter.sendMail({
      from,
      to:      email,
      subject: 'Your Interview is Confirmed — Streamhost',
      text:    candidateBody,
      html:    candidateBody.replace(/\n/g, '<br>'),
      attachments: [{
        filename:    'interview-invite.ics',
        content:     generateICS(icsPayload),
        contentType: 'text/calendar; method=REQUEST',
      }],
    })

    // Internal notification
    const notifyEmail = process.env.INTERNAL_NOTIFY_EMAIL || process.env.ALVIN_EMAIL || 'info@streamhost.app'
    const internalBody = `New interview booked via the booking page.

Candidate: ${name}
Role: ${roleLabel}
Email: ${email}
Phone: ${phone || '(not provided)'}
Slot: ${slotFmt}
Meet Link: ${meetLink || 'N/A'}
Event ID: ${eventId}`

    await transporter.sendMail({
      from,
      to:      notifyEmail,
      subject: `New Interview Booked — ${name} · ${role}`,
      text:    internalBody,
    })
  } catch (emailErr) {
    console.error('Email send failed (non-fatal):', emailErr.message)
  }

  // ── 5. Supabase update (non-fatal) ────────────────────────────────
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    if (id && isValidUUID(id)) {
      // Update existing candidate — sync any name/email/phone edits from the form
      const patch = { stage: 'r1_scheduled', updated_at: new Date().toISOString() }
      if (name)  patch.name  = name
      if (email) patch.email = email
      if (phone) patch.phone = phone
      await supabase
        .from('hr_candidates')
        .update(patch)
        .eq('id', id)

      await supabase.from('hr_interview_slots').insert({
        candidate_id:     id,
        round:            1,
        scheduled_at:     slotDt.toISOString(),
        duration_minutes: 30,
        platform:         'Google Meet',
        meeting_link:     meetLink,
      })
    } else if (process.env.BOOK_AUTO_CREATE_CANDIDATE === 'true') {
      // Create new candidate record
      const { data: newCand } = await supabase
        .from('hr_candidates')
        .insert({ name, email, phone: phone || null, role_applied: roleLabel, stage: 'r1_scheduled', applied_at: new Date().toISOString() })
        .select('id')
        .single()

      if (newCand?.id) {
        await supabase.from('hr_interview_slots').insert({
          candidate_id:     newCand.id,
          round:            1,
          scheduled_at:     slotDt.toISOString(),
          duration_minutes: 30,
          platform:         'Google Meet',
          meeting_link:     meetLink,
        })
        await supabase.from('hr_stage_history').insert({
          candidate_id: newCand.id,
          stage:        'r1_scheduled',
          moved_by:     'booking-page',
        })
      }
    }
  } catch (dbErr) {
    console.error('Supabase update failed (non-fatal):', dbErr.message)
  }

  return res.status(200).json({ ok: true, meetLink, eventId, slot })
}
