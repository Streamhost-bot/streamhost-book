import React, { useState } from 'react'
import SlotPicker from './components/SlotPicker'
import ConfirmForm from './components/ConfirmForm'
import SuccessScreen from './components/SuccessScreen'

export default function App() {
  const p = new URLSearchParams(window.location.search)
  const [booking, setBooking] = useState({
    name:  p.get('name')  || '',
    email: p.get('email') || '',
    phone: '',
    role:  p.get('role')  || '',
    id:    p.get('id')    || null,
  })

  const [step,         setStep]         = useState(1)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [meetLink,     setMeetLink]     = useState(null)
  const [submitting,   setSubmitting]   = useState(false)
  const [submitError,  setSubmitError]  = useState(null)
  const [slotConflict, setSlotConflict] = useState(false)

  function handleSlotSelect(isoSlot) {
    setSelectedSlot(isoSlot)
    setSlotConflict(false)
    setSubmitError(null)
    setStep(2)
  }

  function handleBack() {
    setStep(1)
    setSelectedSlot(null)
    setSubmitError(null)
  }

  async function handleSubmit(updatedBooking) {
    setBooking(updatedBooking)
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot:  selectedSlot,
          name:  updatedBooking.name,
          email: updatedBooking.email,
          phone: updatedBooking.phone,
          role:  updatedBooking.role,
          id:    updatedBooking.id,
        }),
      })
      const data = await res.json()
      if (res.status === 409) {
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

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      {step === 1 && (
        <SlotPicker
          booking={booking}
          onSlotSelect={handleSlotSelect}
          conflictBanner={slotConflict}
          onDismissConflict={() => setSlotConflict(false)}
        />
      )}
      {step === 2 && (
        <ConfirmForm
          slot={selectedSlot}
          booking={booking}
          onBack={handleBack}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={submitError}
        />
      )}
      {step === 3 && (
        <SuccessScreen
          slot={selectedSlot}
          meetLink={meetLink}
          name={booking.name}
          email={booking.email}
        />
      )}
    </div>
  )
}
