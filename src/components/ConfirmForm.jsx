import React, { useState } from 'react'
import { ArrowLeft, Calendar, Video, Clock, Loader2 } from 'lucide-react'

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

export default function ConfirmForm({ slot, booking, onBack, onSubmit, submitting, error, isReschedule, existingSlot }) {
  const [form, setForm] = useState({
    name:  booking.name  || '',
    email: booking.email || '',
    phone: booking.phone || '',
  })

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) return
    onSubmit({ ...booking, ...form })
  }

  const input = 'w-full bg-primary border border-primary-lighter rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent [color-scheme:dark] placeholder:text-gray-600'

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
              <Clock size={14} className="text-accent flex-shrink-0" /><span>30 minutes</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-gray-300">
              <Video size={14} className="text-accent flex-shrink-0" /><span>Google Meet</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────── */}
      <div className="flex-1 p-6 md:p-10 max-w-lg">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={14} />Back
        </button>

        <h1 className="text-xl font-semibold text-white mb-1">
          {isReschedule ? 'Confirm reschedule' : 'Confirm your details'}
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          {isReschedule ? 'Your Google Meet link stays the same — only the time changes.' : 'Double-check everything before confirming.'}
        </p>

        {/* Slot change summary for reschedule */}
        {isReschedule && existingSlot && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 mb-4 space-y-1">
            <p className="text-xs text-yellow-400 font-medium uppercase tracking-wide">Changing from</p>
            <p className="text-sm text-gray-300 line-through">{fmtSlot(existingSlot.scheduled_at)}</p>
          </div>
        )}

        {/* Selected slot card */}
        <div className="flex items-start gap-3 bg-primary-light border border-accent/30 rounded-xl px-4 py-3.5 mb-6">
          <Calendar size={16} className="text-accent flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-accent font-medium mb-0.5">{isReschedule ? 'New time' : ''}</p>
            <p className="text-sm font-semibold text-white">{fmtSlot(slot)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Malaysia Time (MYT, UTC+8) · 30 min · Google Meet</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Full Name <span className="text-red-400">*</span></label>
            <input
              className={input}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Email Address <span className="text-red-400">*</span></label>
            <input
              type="email"
              className={input}
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Phone Number <span className="text-gray-600">(optional)</span></label>
            <input
              type="tel"
              className={input}
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="+60 12-345 6789"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 rounded-lg px-4 py-3">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting || !form.name.trim() || !form.email.trim()}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" />{isReschedule ? 'Rescheduling…' : 'Creating your interview…'}</>
            ) : (
              isReschedule ? 'Confirm New Time' : 'Confirm My Interview Slot'
            )}
          </button>

          <p className="text-xs text-center text-gray-500 mt-2">
            By confirming, you'll receive a calendar invite and confirmation email.
          </p>
        </form>
      </div>
    </div>
  )
}
