import React, { useState, useEffect } from 'react'
import SlotPicker from './components/SlotPicker'
import ConfirmForm from './components/ConfirmForm'
import SuccessScreen from './components/SuccessScreen'
import AlreadyScheduled from './components/AlreadyScheduled'

export default function App() {
  const p = new URLSearchParams(window.location.search)
  const round = parseInt(p.get('round')) || 1
  const [booking, setBooking] = useState({
    name:  p.get('name')  || '',
    email: p.get('email') || '',
    phone: '',
    role:  p.get('role')  || '',
    id:    p.get('id')    || null,
  })

  // step: 'checking' | 'booked' | 1 | 2 | 3
  const [step,           setStep]           = useState(booking.id ? 'checking' : 1)
  const [existingSlot,   setExistingSlot]   = useState(null)
  const [selectedSlot,   setSelectedSlot]   = useState(null)
  const [meetLink,       setMeetLink]       = useState(null)
  const [submitting,     setSubmitting]     = useState(false)
  const [submitError,    setSubmitError]    = useState(null)
  const [slotConflict,   setSlotConflict]   = useState(false)
  const [isReschedule,   setIsReschedule]   = useState(false)

  // On mount: if id param present, check if already booked
  useEffect(() => {
    if (!booking.id) return
    fetch(`/api/booking?id=${booking.id}&round=${round}`)
      .then(r => r.json())
      .then(data => {
        if (data.slot) {
          // Pre-fill name/email from DB record if URL params were empty
          setBooking(prev => ({
            ...prev,
            name:  prev.name  || data.candidate?.name  || '',
            email: prev.email || data.candidate?.email || '',
            role:  prev.role  || data.candidate?.role_applied || '',
          }))
          setExistingSlot(data.slot)
          setStep('booked')
        } else {
          setStep(1)
        }
      })
      .catch(() => setStep(1))
  }, [])

  function handleReschedule(currentSlot) {
    setExistingSlot(currentSlot)
    setIsReschedule(true)
    setStep(1)
  }

  function handleSlotSelect(isoSlot) {
    setSelectedSlot(isoSlot)
    setSlotConflict(false)
    setSubmitError(null)
    setStep(2)
  }

  function handleBack() {
    setStep(isReschedule ? 1 : 1)
    setSelectedSlot(null)
    setSubmitError(null)
  }

  async function handleSubmit(updatedBooking) {
    setBooking(updatedBooking)
    setSubmitting(true)
    setSubmitError(null)
    try {
      const body = {
        slot:  selectedSlot,
        name:  updatedBooking.name,
        email: updatedBooking.email,
        phone: updatedBooking.phone,
        role:  updatedBooking.role,
        id:    updatedBooking.id,
        round,
      }
      if (isReschedule) {
        body.action = 'reschedule'
        body.existingSlotId = existingSlot?.id
      }

      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.status === 409) {
        if (data.error === 'already_rescheduled') {
          setSubmitError('You have already rescheduled once. Contact info@streamhost.app for further changes.')
          return
        }
        setSlotConflict(true)
        setStep(1)
        setSelectedSlot(null)
        return
      }
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
      setMeetLink(data.meetLink)
      setStep(3)
    } catch (e) {
      setSubmitError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'checking') {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      {step === 'booked' && (
        <AlreadyScheduled
          candidate={{ name: booking.name, email: booking.email }}
          slot={existingSlot}
          round={round}
          onReschedule={handleReschedule}
        />
      )}
      {step === 1 && (
        <SlotPicker
          booking={booking}
          round={round}
          onSlotSelect={handleSlotSelect}
          conflictBanner={slotConflict}
          onDismissConflict={() => setSlotConflict(false)}
          isReschedule={isReschedule}
        />
      )}
      {step === 2 && (
        <ConfirmForm
          slot={selectedSlot}
          booking={booking}
          round={round}
          onBack={handleBack}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={submitError}
          isReschedule={isReschedule}
          existingSlot={existingSlot}
        />
      )}
      {step === 3 && (
        <SuccessScreen
          slot={selectedSlot}
          meetLink={meetLink}
          round={round}
          name={booking.name}
          email={booking.email}
          isReschedule={isReschedule}
        />
      )}
    </div>
  )
}
