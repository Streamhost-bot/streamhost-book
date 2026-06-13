import React, { useState } from 'react'
import { Calendar, Video, AlertTriangle, RefreshCw } from 'lucide-react'

function fmtMYT(iso) {
  return new Date(iso).toLocaleString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function AlreadyScheduled({ candidate, slot, onReschedule }) {
  const [confirmReschedule, setConfirmReschedule] = useState(false)
  const alreadyRescheduled = !!slot?.rescheduled_at

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">

        {/* Logo */}
        <div className="flex items-center gap-3 justify-center">
          <img src="/logo.jpg" alt="Streamhost" className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-white font-semibold text-lg">Streamhost</span>
        </div>

        {/* Confirmed card */}
        <div className="bg-primary-light border border-primary-lighter rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold">Interview Scheduled</p>
              <p className="text-sm text-gray-400">Hi {candidate.name}, you're all set.</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-3">
              <Calendar size={16} className="text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Date & Time</p>
                <p className="text-sm font-medium text-white">{fmtMYT(slot.scheduled_at)}</p>
                <p className="text-xs text-gray-500">Malaysia Time (UTC+8) · 30 minutes</p>
              </div>
            </div>

            {slot.meeting_link && (
              <div className="flex items-start gap-3">
                <Video size={16} className="text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Google Meet</p>
                  <a href={slot.meeting_link} target="_blank" rel="noreferrer"
                    className="text-sm text-accent hover:underline break-all">
                    {slot.meeting_link}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reschedule section */}
        {alreadyRescheduled ? (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-300">No more reschedules</p>
              <p className="text-xs text-gray-400 mt-1">
                You've already rescheduled once. To request another change, reply to your confirmation email or contact{' '}
                <a href="mailto:info@streamhost.app" className="text-accent hover:underline">info@streamhost.app</a>.
              </p>
            </div>
          </div>
        ) : !confirmReschedule ? (
          <div className="text-center">
            <button
              onClick={() => setConfirmReschedule(true)}
              className="text-sm text-gray-400 hover:text-white underline underline-offset-2 transition-colors flex items-center gap-1.5 mx-auto"
            >
              <RefreshCw size={13} />
              Need to reschedule?
            </button>
          </div>
        ) : (
          <div className="bg-primary-light border border-yellow-500/40 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">One reschedule allowed</p>
                <p className="text-xs text-gray-400 mt-1">
                  You can change your slot once. After that, contact us directly to make any further changes.
                  Your current Google Meet link will remain the same.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onReschedule(slot)}
                className="flex-1 bg-accent hover:bg-accent-dark text-white text-sm py-2 rounded-lg font-medium transition-colors"
              >
                Choose a new time
              </button>
              <button
                onClick={() => setConfirmReschedule(false)}
                className="px-4 text-sm text-gray-400 hover:text-white bg-primary-lighter rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
