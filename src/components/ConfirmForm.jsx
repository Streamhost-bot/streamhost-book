import React from 'react'
import { ArrowLeft, Calendar, Video, Clock, MapPin, Loader2, User, Mail } from 'lucide-react'

const R2_ADDRESS = 'Mercu Summer Suites, 8, Jalan Cendana, 50250 Kuala Lumpur'

function fmtSlot(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function ConfirmForm({ slot, booking, round, onBack, onSubmit, submitting, error, isReschedule, existingSlot }) {
  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(booking)
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ── Left panel ─────────────────────────────────────────────── */}
      <div className="md:w-72 md:min-h-screen bg-primary-light border-b md:border-b-0 md:border-r border-primary-lighter flex flex-col p-6 md:p-8">
        <div className="flex items-center gap-2 mb-8">
          <img src="/logo.jpg" alt="Streamhost" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
          <span className="text-white font-semibold text-base">Streamhost</span>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Interviewer</p>
            <p className="text-white font-semibold">Alvin Wee</p>
            <p className="text-gray-400 text-sm">CEO, Streamhost</p>
          </div>
          {booking.role && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Role</p>
              <p className="text-gray-200 text-sm">{booking.role}</p>
            </div>
          )}
          <div className="pt-2 space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm text-gray-300">
              <Clock size={14} className="text-accent flex-shrink-0" />
              <span>{round === 2 ? '60 minutes' : '30 minutes'}</span>
            </div>
            {round === 2 ? (
              <>
                <div className="flex items-center gap-2.5 text-sm text-gray-300">
                  <MapPin size={14} className="text-accent flex-shrink-0" /><span>In-Person</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm text-gray-300">
                  <MapPin size={14} className="text-accent flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{R2_ADDRESS}</span>
                </div>
                <p className="text-xs text-gray-500 leading-snug">A contact number will be in your confirmation email — just WhatsApp when you arrive and we'll come down.</p>
              </>
            ) : (
              <div className="flex items-center gap-2.5 text-sm text-gray-300">
                <Video size={14} className="text-accent flex-shrink-0" /><span>Google Meet</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────── */}
      <div className="flex-1 p-6 md:p-10 max-w-lg">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6">
          <ArrowLeft size={14} />Back
        </button>

        <h1 className="text-xl font-semibold text-white mb-1">
          {isReschedule ? 'Confirm reschedule' : 'Confirm your booking'}
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          {isReschedule
            ? (round === 2 ? 'The venue stays the same — only the time changes.' : 'Your Google Meet link stays the same — only the time changes.')
            : 'Review your details and confirm your slot.'}
        </p>

        {/* Slot change summary for reschedule */}
        {isReschedule && existingSlot && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 mb-4 space-y-1">
            <p className="text-xs text-yellow-400 font-medium uppercase tracking-wide">Changing from</p>
            <p className="text-sm text-gray-300 line-through">{fmtSlot(existingSlot.scheduled_at)}</p>
          </div>
        )}

        {/* Selected slot */}
        <div className="flex items-start gap-3 bg-primary-light border border-accent/30 rounded-xl px-4 py-3.5 mb-4">
          <Calendar size={16} className="text-accent flex-shrink-0 mt-0.5" />
          <div>
            {isReschedule && <p className="text-xs text-accent font-medium mb-0.5">New time</p>}
            <p className="text-sm font-semibold text-white">{fmtSlot(slot)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {round === 2 ? 'Malaysia Time (MYT, UTC+8) · 60 min · In-Person' : 'Malaysia Time (MYT, UTC+8) · 30 min · Google Meet'}
            </p>
          </div>
        </div>

        {/* Read-only identity */}
        <div className="bg-primary-light border border-primary-lighter rounded-xl px-4 py-3.5 mb-6 space-y-3">
          <div className="flex items-center gap-3">
            <User size={14} className="text-gray-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Name</p>
              <p className="text-sm text-white">{booking.name || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail size={14} className="text-gray-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Confirmation will be sent to</p>
              <p className="text-sm text-white">{booking.email || '—'}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 rounded-lg px-4 py-3 mb-4">{error}</div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" />{isReschedule ? 'Rescheduling…' : 'Confirming…'}</>
            ) : (
              isReschedule ? 'Confirm New Time' : 'Confirm My Interview Slot'
            )}
          </button>
          <p className="text-xs text-center text-gray-500 mt-3">
            Confirmation and calendar invite will be sent to {booking.email || 'your email'}.
          </p>
        </form>
      </div>
    </div>
  )
}
