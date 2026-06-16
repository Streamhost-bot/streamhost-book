import React, { useState, useEffect } from 'react'
import { Clock, Video, MapPin, ChevronLeft, ChevronRight, AlertTriangle, Loader2, Calendar } from 'lucide-react'

const R2_ADDRESS = 'Mercu Summer Suites, 8, Jalan Cendana, 50250 Kuala Lumpur'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

function pad(n) { return String(n).padStart(2, '0') }

function getMondayOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function fmtSlotTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${pad(m)} ${ampm}`
}

export default function SlotPicker({ booking, round, onSlotSelect, conflictBanner, onDismissConflict }) {
  const [slots,        setSlots]        = useState({})
  const [loading,      setLoading]      = useState(true)
  const [fetchError,   setFetchError]   = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [weekOffset,   setWeekOffset]   = useState(0) // 0, 1, 2

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const baseMonday = getMondayOf(today)
  const maxWeekOffset = 2

  useEffect(() => {
    const from = formatDateKey(today)
    const toDate = new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000)
    const to = formatDateKey(toDate)
    fetch(`/api/slots?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setSlots(d.slots || {})
      })
      .catch(e => setFetchError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function getWeekDays(offset) {
    return [0, 1, 2, 3, 4].map(i => {
      const d = new Date(baseMonday.getTime() + (offset * 7 + i) * 24 * 60 * 60 * 1000)
      return d
    })
  }

  function handleDateClick(dateKey, date) {
    if (date <= today) return
    if (!slots[dateKey] || slots[dateKey].length === 0) return
    setSelectedDate(dateKey)
    onDismissConflict()
  }

  function handleSlotClick(dateKey, time) {
    const iso = `${dateKey}T${time}:00+08:00`
    onSlotSelect(iso)
  }

  const weekDays = getWeekDays(weekOffset)
  const selectedSlots = selectedDate ? (slots[selectedDate] || []) : []

  const fmtHeader = (d) => d.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ── Left panel ─────────────────────────────────────────────── */}
      <div className="md:w-72 md:min-h-screen bg-primary-light border-b md:border-b-0 md:border-r border-primary-lighter flex flex-col p-6 md:p-8">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <img src="/logo.jpg" alt="Streamhost" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
          <span className="text-white font-semibold text-base">Streamhost</span>
        </div>

        <div className="space-y-4 flex-1">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Interviewer</p>
            <p className="text-white font-semibold text-base">Alvin Wee</p>
            <p className="text-gray-400 text-sm">CEO, Streamhost</p>
          </div>

          {booking.role && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Role</p>
              <p className="text-gray-200 text-sm">{booking.role}</p>
            </div>
          )}

          {booking.name && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Candidate</p>
              <p className="text-gray-200 text-sm">{booking.name}</p>
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
                  <MapPin size={14} className="text-accent flex-shrink-0" />
                  <span>In-Person</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm text-gray-300">
                  <MapPin size={14} className="text-accent flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{R2_ADDRESS}</span>
                </div>
                <p className="text-xs text-gray-500 leading-snug">A contact number will be in your confirmation email — just WhatsApp when you arrive and we'll come down.</p>
              </>
            ) : (
              <div className="flex items-center gap-2.5 text-sm text-gray-300">
                <Video size={14} className="text-accent flex-shrink-0" />
                <span>Google Meet</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-sm text-gray-300">
              <Calendar size={14} className="text-accent flex-shrink-0" />
              <span>Asia/KL (MYT, UTC+8)</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-600 mt-8">
          You'll receive a confirmation email with the meeting link right after booking.
        </p>
      </div>

      {/* ── Right panel ────────────────────────────────────────────── */}
      <div className="flex-1 p-6 md:p-10">
        <h1 className="text-xl font-semibold text-white mb-1">Select a date & time</h1>
        <p className="text-sm text-gray-400 mb-6">Available slots are shown in Malaysia Time (MYT)</p>

        {/* Conflict banner */}
        {conflictBanner && (
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 mb-4">
            <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0" />
            <p className="text-sm text-yellow-400">That slot was just taken — please pick another time.</p>
          </div>
        )}

        {/* Week navigation */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => { setWeekOffset(o => Math.max(0, o - 1)); setSelectedDate(null) }}
            disabled={weekOffset === 0}
            className="p-1.5 rounded-lg hover:bg-primary-lighter text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-gray-300 font-medium min-w-[120px] text-center">
            {weekDays[0].toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
            {' – '}
            {weekDays[4].toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <button
            onClick={() => { setWeekOffset(o => Math.min(maxWeekOffset, o + 1)); setSelectedDate(null) }}
            disabled={weekOffset === maxWeekOffset}
            className="p-1.5 rounded-lg hover:bg-primary-lighter text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 py-12 justify-center">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading available times…</span>
          </div>
        ) : fetchError ? (
          <div className="text-sm text-red-400 bg-red-400/10 rounded-lg px-4 py-3">
            Failed to load slots: {fetchError}
          </div>
        ) : (
          <>
            {/* Day cards */}
            <div className="grid grid-cols-5 gap-2 mb-6">
              {weekDays.map((date, i) => {
                const key = formatDateKey(date)
                const isPast = date <= today
                const hasSlots = !isPast && slots[key] && slots[key].length > 0
                const isSelected = key === selectedDate
                return (
                  <button
                    key={key}
                    onClick={() => handleDateClick(key, date)}
                    disabled={isPast || !hasSlots}
                    className={`flex flex-col items-center py-3 px-1 rounded-xl border text-center transition-all
                      ${isSelected
                        ? 'border-accent bg-accent/10 text-accent'
                        : hasSlots
                          ? 'border-primary-lighter hover:border-accent/50 hover:bg-primary-lighter text-gray-200 cursor-pointer'
                          : 'border-primary-lighter text-gray-600 cursor-not-allowed opacity-40'
                      }`}
                  >
                    <span className="text-xs font-medium uppercase tracking-wide mb-1">{DAYS[i]}</span>
                    <span className="text-xl font-bold leading-none">{date.getDate()}</span>
                    <span className="text-xs mt-1">{date.toLocaleDateString('en-MY', { month: 'short' })}</span>
                    {hasSlots && !isSelected && (
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent/60" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div>
                <p className="text-sm text-gray-400 mb-3">
                  {fmtHeader(new Date(selectedDate + 'T12:00:00+08:00'))}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {selectedSlots.map(time => (
                    <button
                      key={time}
                      onClick={() => handleSlotClick(selectedDate, time)}
                      className="py-2.5 px-3 rounded-lg border border-primary-lighter hover:border-accent hover:bg-accent/10 text-gray-200 hover:text-accent text-sm font-medium transition-all"
                    >
                      {fmtSlotTime(time)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!selectedDate && (
              <p className="text-sm text-gray-500 py-4">← Select a date to see available times</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
