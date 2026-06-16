import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

const SMTP = {
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE !== 'false',
  auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  tls:    { rejectUnauthorized: false },
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

function buildEmailHtml(body) {
  const lines = body.split('\n').map(l => `<p style="margin:0 0 10px 0;color:#374151;font-size:15px;line-height:1.6">${l || '&nbsp;'}</p>`).join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px"><tr><td align="center">
<table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
<tr><td style="background:#111827;padding:24px 32px">
  <table cellpadding="0" cellspacing="0"><tr>
    <td><img src="https://streamhost-book.vercel.app/logo.jpg" width="36" height="36" alt="Streamhost" style="border-radius:8px;display:block"></td>
    <td style="padding-left:10px"><span style="color:#ffffff;font-size:16px;font-weight:600">Streamhost</span></td>
  </tr></table>
</td></tr>
<tr><td style="padding:32px 32px 24px 32px">${lines}</td></tr>
<tr><td style="padding:16px 32px 28px 32px;border-top:1px solid #e5e7eb">
  <p style="margin:0;color:#9ca3af;font-size:12px">© Streamhost · <a href="mailto:info@streamhost.app" style="color:#9ca3af">info@streamhost.app</a></p>
</td></tr>
</table></td></tr></table></body></html>`
}

function buildInternalNotifHtml({ name, role, email, phone, slotFmt, meetLink, eventId }) {
  const row = (label, value, isLink) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;font-weight:500;white-space:nowrap;width:1%">${label}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px">${isLink ? `<a href="${value}" style="color:#4f46e5">${value}</a>` : value}</td>
    </tr>`
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px"><tr><td align="center">
<table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
  <tr><td style="background:#111827;padding:24px 32px">
    <table cellpadding="0" cellspacing="0"><tr>
      <td><img src="https://streamhost-book.vercel.app/logo.jpg" width="36" height="36" alt="Streamhost" style="border-radius:8px;display:block"></td>
      <td style="padding-left:10px"><span style="color:#ffffff;font-size:16px;font-weight:600">Streamhost</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:28px 32px 8px 32px">
    <p style="margin:0 0 4px 0;font-size:20px;font-weight:700;color:#111827">New Interview Booked</p>
    <p style="margin:0;font-size:14px;color:#6b7280">A candidate has self-scheduled via the booking page.</p>
  </td></tr>
  <tr><td style="padding:20px 32px">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
      ${row('Candidate', name)}
      ${row('Role', role)}
      ${row('Email', email)}
      ${row('Phone', phone || '—')}
      ${row('Date & Time', slotFmt + ' (MYT)')}
      ${meetLink ? row('Meet Link', meetLink, true) : ''}
    </table>
  </td></tr>
  ${meetLink ? `<tr><td style="padding:0 32px 28px 32px">
    <a href="${meetLink}" style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">Join Google Meet</a>
  </td></tr>` : ''}
  <tr><td style="padding:16px 32px 28px 32px;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#9ca3af;font-size:12px">© Streamhost · <a href="mailto:info@streamhost.app" style="color:#9ca3af">info@streamhost.app</a></p>
  </td></tr>
</table></td></tr></table></body></html>`
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
  const { slot, name, email, phone, role, id, action, existingSlotId, round: rawRound } = body
  const round = parseInt(rawRound) || 1
  const isR2 = round === 2
  const duration = isR2 ? 60 : 30
  const R2_ADDRESS = 'Mercu Summer Suites, 8, Jalan Cendana, 50250 Kuala Lumpur'

  // ── RESCHEDULE ────────────────────────────────────────────────────────
  if (action === 'reschedule') {
    if (!slot || !id || !isValidUUID(id)) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Find existing slot
    const { data: existingSlot } = await supabase
      .from('hr_interview_slots')
      .select('*')
      .eq('candidate_id', id)
      .order('scheduled_at', { ascending: false })
      .limit(1)
      .single()

    if (!existingSlot) return res.status(404).json({ error: 'No existing booking found' })
    if (existingSlot.rescheduled_at) {
      return res.status(409).json({ error: 'already_rescheduled', message: 'You have already rescheduled once.' })
    }

    const oldSlotFmt = fmtMYT(existingSlot.scheduled_at)
    const slotRound = existingSlot.round || 1
    const slotDuration = existingSlot.duration_minutes || (slotRound === 2 ? 60 : 30)
    const slotIsR2 = slotRound === 2
    const newSlotDt = new Date(slot)
    const newEndDt = new Date(newSlotDt.getTime() + slotDuration * 60 * 1000)
    const newSlotFmt = fmtMYT(slot)
    const now = new Date().toISOString()

    // Patch Google Calendar event
    const token = await getGoogleToken()
    const meetLink = existingSlot.meeting_link
    if (existingSlot.google_event_id) {
      try {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingSlot.google_event_id}?sendUpdates=all`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              start: { dateTime: newSlotDt.toISOString(), timeZone: 'Asia/Kuala_Lumpur' },
              end:   { dateTime: newEndDt.toISOString(),  timeZone: 'Asia/Kuala_Lumpur' },
              summary: `Interview — ${name || 'Candidate'} · ${role || 'Candidate'}`,
            }),
          }
        )
      } catch (e) {
        console.error('Calendar patch failed (non-fatal):', e.message)
      }
    }

    // Update slot in Supabase
    await supabase.from('hr_interview_slots')
      .update({ scheduled_at: newSlotDt.toISOString(), rescheduled_at: now })
      .eq('id', existingSlot.id)

    // Sync any name/email/phone changes
    const patch = { updated_at: now }
    if (name)  patch.name  = name
    if (email) patch.email = email
    if (phone) patch.phone = phone
    await supabase.from('hr_candidates').update(patch).eq('id', id)

    // Send reschedule emails (non-fatal)
    try {
      const transporter = nodemailer.createTransport(SMTP)
      const from = `"${process.env.FROM_NAME || 'Alvin Wee'}" <${process.env.FROM_EMAIL || 'info@streamhost.app'}>`
      const candidateName = name || 'Candidate'
      const roleLabel = role || 'Candidate'

      const rescheduleBody = slotIsR2
        ? `Hi ${candidateName},

Your Round 2 interview has been rescheduled successfully.

New Date & Time: ${newSlotFmt} (Malaysia Time, UTC+8)
Duration: 60 minutes
Format: In-Person
Venue: Mercu Summer Suites, 8, Jalan Cendana, 50250 Kuala Lumpur
Interviewer: Alvin Wee, CEO — Streamhost

Please arrive 5–10 minutes early. Reply to this email if you need directions.

Please note: this was your one allowed reschedule. If you need any further changes, please reply to this email or contact info@streamhost.app directly.

See you soon,
Alvin Wee
Streamhost`
        : `Hi ${candidateName},

Your interview has been rescheduled successfully.

New Date & Time: ${newSlotFmt} (Malaysia Time, UTC+8)
Duration: 30 minutes
Format: Online — Google Meet
Meeting Link: ${meetLink || '(same as before)'}
Interviewer: Alvin Wee, CEO — Streamhost

Your Google Meet link has not changed — use the same link as before.

Please note: this was your one allowed reschedule. If you need any further changes, please reply to this email or contact info@streamhost.app directly.

See you soon,
Alvin Wee
Streamhost`

      await transporter.sendMail({
        from, to: email,
        subject: 'Your Interview Has Been Rescheduled — Streamhost',
        text: rescheduleBody,
        html: rescheduleBody.replace(/\n/g, '<br>'),
      })

      const notifyEmail = process.env.INTERNAL_NOTIFY_EMAIL || process.env.ALVIN_EMAIL || 'info@streamhost.app'
      await transporter.sendMail({
        from, to: notifyEmail,
        subject: `Interview Rescheduled — ${candidateName} · ${roleLabel}`,
        text: `Interview rescheduled.\n\nCandidate: ${candidateName}\nRole: ${roleLabel}\nEmail: ${email}\nOld Time: ${oldSlotFmt}\nNew Time: ${newSlotFmt}\nMeet Link: ${meetLink || 'N/A'}`,
      })
    } catch (emailErr) {
      console.error('Reschedule email failed (non-fatal):', emailErr.message)
    }

    return res.status(200).json({ ok: true, meetLink, slot })
  }
  if (!slot || !name || !email) {
    return res.status(400).json({ error: 'Missing required fields: slot, name, email' })
  }
  const roleLabel = role || 'Candidate'

  const token = await getGoogleToken()

  // ── 1. Double-booking guard ────────────────────────────────────────
  const slotDt       = new Date(slot)
  const bufferStart  = new Date(slotDt.getTime() - 30 * 60 * 1000)
  const bufferEnd    = new Date(slotDt.getTime() + (duration + 30) * 60 * 1000)
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

  // ── 2. Create Google Calendar event ────────────────────────────────
  const endDt = new Date(slotDt.getTime() + duration * 60 * 1000)
  const calUrl = isR2
    ? 'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all'
    : `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`
  const requestId = `streamhost-book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const calBody = {
    summary:     `Round ${round} Interview — ${name} · ${roleLabel}`,
    description: isR2
      ? `Round 2 In-Person Interview · Streamhost\nVenue: ${R2_ADDRESS}\nCandidate: ${name}\nRole: ${roleLabel}${phone ? `\nPhone: ${phone}` : ''}`
      : `Round 1 Interview · Streamhost · Google Meet\nCandidate: ${name}\nRole: ${roleLabel}${phone ? `\nPhone: ${phone}` : ''}`,
    start: { dateTime: slotDt.toISOString(), timeZone: 'Asia/Kuala_Lumpur' },
    end:   { dateTime: endDt.toISOString(),  timeZone: 'Asia/Kuala_Lumpur' },
    attendees: [
      { email, displayName: name },
      { email: process.env.ALVIN_EMAIL || 'alvinwee@streamhost.app' },
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 1440 },
        { method: 'email', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
  }
  if (isR2) {
    calBody.location = R2_ADDRESS
  } else {
    calBody.conferenceData = { createRequest: { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } } }
  }
  let evtRes, evt
  try {
    evtRes = await fetch(calUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(calBody),
    })
    evt = await evtRes.json()
    if (!evtRes.ok) throw new Error(evt.error?.message || 'Calendar API error')
  } catch (e) {
    return res.status(500).json({ error: `Failed to create calendar event: ${e.message}` })
  }

  const meetLink = isR2 ? null : (evt.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri || null)
  const eventId  = evt.id
  const slotFmt  = fmtMYT(slot)

  const icsPayload = {
    uid:             `${eventId}@streamhost`,
    title:           `Round ${round} Interview — ${roleLabel} at Streamhost`,
    start:           slotDt.toISOString(),
    durationMinutes: duration,
    description:     isR2
      ? `Round 2 In-Person Interview\nVenue: ${R2_ADDRESS}\nInterviewer: Alvin Wee (CEO, Streamhost)\nRole: ${roleLabel}`
      : `Interviewer: Alvin Wee (CEO, Streamhost)\nRole: ${roleLabel}`,
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
    const rescheduleLink = id ? `https://streamhost-book.vercel.app?name=${encodeURIComponent(name)}&role=${encodeURIComponent(roleLabel)}&email=${encodeURIComponent(email)}&id=${id}` : null
    const candidateBody = isR2
      ? `Hi ${name},

Your Round 2 interview is confirmed. Here are your details:

Date & Time: ${slotFmt} (Malaysia Time, UTC+8)
Duration: 60 minutes
Format: In-Person
Venue: ${R2_ADDRESS}
Interviewer: Alvin Wee, CEO — Streamhost

When you arrive at the lobby, WhatsApp Alvin at +60 19-774 6396 and he will come down to bring you up.

Please arrive 5–10 minutes early.

A calendar invite has been sent to your email.

Need to reschedule? You have one reschedule available. Use your booking link:
${rescheduleLink || 'Reply to this email to reschedule.'}

See you soon,
Alvin Wee
+60 19-774 6396
Streamhost`
      : `Hi ${name},

Your interview is confirmed. Here are your details:

Date & Time: ${slotFmt} (Malaysia Time, UTC+8)
Duration: 30 minutes
Format: Online — Google Meet
Meeting Link: ${meetLink || '(link in your calendar invite)'}
Interviewer: Alvin Wee, CEO — Streamhost

A calendar invite has been sent to your email.

Need to reschedule? You have one reschedule available. Use your booking link:
${rescheduleLink || 'Reply to this email to reschedule.'}

See you soon,
Alvin Wee
Streamhost`

    await transporter.sendMail({
      from,
      to:      email,
      subject: 'Your Interview is Confirmed — Streamhost',
      text:    candidateBody,
      html:    buildEmailHtml(candidateBody),
      attachments: [{
        filename:    'interview-invite.ics',
        content:     generateICS(icsPayload),
        contentType: 'text/calendar; method=REQUEST',
      }],
    })

    // Internal notification
    const notifyEmail = process.env.INTERNAL_NOTIFY_EMAIL || process.env.ALVIN_EMAIL || 'info@streamhost.app'
    const internalPlain = `New interview booked.\n\nCandidate: ${name}\nRole: ${roleLabel}\nEmail: ${email}\nPhone: ${phone || '(not provided)'}\nSlot: ${slotFmt}\nMeet Link: ${meetLink || 'N/A'}`

    await transporter.sendMail({
      from,
      to:      notifyEmail,
      subject: `New Interview Booked — ${name} · ${roleLabel}`,
      text:    internalPlain,
      html:    buildInternalNotifHtml({ name, role: roleLabel, email, phone, slotFmt, meetLink, eventId }),
    })
  } catch (emailErr) {
    console.error('Email send failed (non-fatal):', emailErr.message)
  }

  // ── 5. Supabase update (non-fatal) ────────────────────────────────
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    if (id && isValidUUID(id)) {
      const nextStage = round === 2 ? 'r2_scheduled' : 'r1_scheduled'
      const patch = { stage: nextStage, updated_at: new Date().toISOString() }
      if (name)  patch.name  = name
      if (email) patch.email = email
      if (phone) patch.phone = phone
      await supabase.from('hr_candidates').update(patch).eq('id', id)

      await supabase.from('hr_interview_slots').insert({
        candidate_id:     id,
        round,
        scheduled_at:     slotDt.toISOString(),
        duration_minutes: duration,
        platform:         isR2 ? 'In-Person' : 'Google Meet',
        meeting_link:     meetLink,
        google_event_id:  eventId,
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
          round,
          scheduled_at:     slotDt.toISOString(),
          duration_minutes: duration,
          platform:         isR2 ? 'In-Person' : 'Google Meet',
          meeting_link:     meetLink,
          google_event_id:  eventId,
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
