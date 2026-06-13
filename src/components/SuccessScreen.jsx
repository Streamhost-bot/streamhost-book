import React from 'react'
import { CheckCircle, Video, Calendar, Mail, ExternalLink } from 'lucide-react'

function fmtSlot(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export default function SuccessScreen({ slot, meetLink, name, email, isReschedule }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <img src="/logo.jpg" alt="Streamhost" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
          <span className="text-white font-semibold text-base">Streamhost</span>
        </div>

        {/* Check icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
            <CheckCircle size={36} className="text-green-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">{isReschedule ? 'Interview rescheduled!' : "You're booked!"}</h1>
        <p className="text-gray-400 text-sm mb-8">
          {isReschedule
            ? `Got it, ${name ? name.split(' ')[0] + '!' : ''} Your new time is confirmed. Same Google Meet link.`
            : `${name ? `See you soon, ${name.split(' ')[0]}!` : 'See you soon!'} Your interview is confirmed.`}
        </p>

        {/* Details card */}
        <div className="bg-primary-light border border-primary-lighter rounded-2xl p-5 text-left space-y-4 mb-6">
          <div className="flex items-start gap-3">
            <Calendar size={15} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Date & Time</p>
              <p className="text-sm font-semibold text-white">{fmtSlot(slot)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Malaysia Time (UTC+8) · 30 minutes</p>
            </div>
          </div>

          {meetLink && (
            <div className="flex items-start gap-3">
              <Video size={15} className="text-accent flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 mb-0.5">Google Meet</p>
                <a
                  href={meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-accent hover:underline flex items-center gap-1 truncate"
                >
                  {meetLink} <ExternalLink size={11} className="flex-shrink-0" />
                </a>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Mail size={15} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Confirmation Email</p>
              <p className="text-sm text-gray-300">
                Sent to <span className="text-white">{email || 'your email'}</span> with a calendar invite (.ics)
              </p>
            </div>
          </div>
        </div>

        {meetLink && (
          <a
            href={meetLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white font-semibold px-6 py-3 rounded-xl transition-colors mb-4"
          >
            <Video size={16} />Join Google Meet
          </a>
        )}

        {isReschedule ? (
          <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-sm text-center">
            <p className="text-yellow-300 font-medium mb-0.5">No more reschedules available</p>
            <p className="text-xs text-gray-400">
              You've used your one reschedule. For further changes, contact{' '}
              <a href="mailto:info@streamhost.app" className="text-accent hover:underline">info@streamhost.app</a>.
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-500 mt-4">
            Need to reschedule? Check your confirmation email for the reschedule link. You have <span className="text-gray-300">one reschedule</span> available.
          </p>
        )}
      </div>
    </div>
  )
}
