"use client"

import { useState, useMemo } from "react"
import { Clock, Video, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format, addDays, startOfWeek, isSameDay, isToday, isBefore } from "date-fns"

interface TimeSlot {
  time: string
  available: boolean
}

interface AppointmentSchedulerProps {
  onSchedule: (date: Date, time: string) => Promise<void>
  availableSlots?: Record<string, TimeSlot[]>
  minDate?: Date
  maxDaysAhead?: number
}

const DEFAULT_SLOTS: TimeSlot[] = [
  { time: "09:00", available: true },
  { time: "09:30", available: true },
  { time: "10:00", available: true },
  { time: "10:30", available: true },
  { time: "11:00", available: true },
  { time: "11:30", available: true },
  { time: "12:00", available: false },
  { time: "12:30", available: false },
  { time: "13:00", available: true },
  { time: "13:30", available: true },
  { time: "14:00", available: true },
  { time: "14:30", available: true },
  { time: "15:00", available: true },
  { time: "15:30", available: true },
  { time: "16:00", available: true },
  { time: "16:30", available: true },
  { time: "17:00", available: true },
  { time: "17:30", available: true },
  { time: "18:00", available: true },
  { time: "18:30", available: true },
  { time: "19:00", available: true },
  { time: "19:30", available: true },
  { time: "20:00", available: true },
  { time: "20:30", available: true },
  { time: "21:00", available: true },
]

export function AppointmentScheduler({
  onSchedule,
  availableSlots,
  minDate = new Date(),
  maxDaysAhead = 14,
}: AppointmentSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [isScheduling, setIsScheduling] = useState(false)
  const [scheduled, setScheduled] = useState(false)

  // Generate dates for the current week view
  const weekDates = useMemo(() => {
    const start = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [weekOffset])

  // Get available slots for selected date
  const slotsForDate = useMemo(() => {
    if (!selectedDate) return []
    const dateKey = format(selectedDate, "yyyy-MM-dd")
    return availableSlots?.[dateKey] || DEFAULT_SLOTS
  }, [selectedDate, availableSlots])

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime) return

    setIsScheduling(true)
    try {
      await onSchedule(selectedDate, selectedTime)
      setScheduled(true)
    } catch (_error) {
      // Scheduling errors handled silently
    } finally {
      setIsScheduling(false)
    }
  }

  if (scheduled) {
    return (
      <div className="text-center py-8">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Appointment Scheduled!</h3>
        <p className="text-muted-foreground mb-4">
          {selectedDate && format(selectedDate, "EEEE, MMMM d")} at {selectedTime}
        </p>
        <p className="text-sm text-muted-foreground">
          You&apos;ll receive a confirmation email with the video call link.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekOffset(prev => Math.max(prev - 1, 0))}
          disabled={weekOffset === 0}
          className="rounded-lg"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">
          {format(weekDates[0], "MMM d")} - {format(weekDates[6], "MMM d, yyyy")}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekOffset(prev => prev + 1)}
          disabled={weekOffset >= Math.floor(maxDaysAhead / 7)}
          className="rounded-lg"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Date Selection */}
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date) => {
          const isPast = isBefore(date, minDate) && !isSameDay(date, minDate)
          const isSelected = selectedDate && isSameDay(date, selectedDate)

          return (
            <button
              key={date.toISOString()}
              onClick={() => !isPast && setSelectedDate(date)}
              disabled={isPast}
              className={cn(
                "flex flex-col items-center p-3 rounded-xl transition-all",
                isPast && "opacity-40 cursor-not-allowed",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
                isToday(date) && !isSelected && "ring-2 ring-primary/20"
              )}
            >
              <span className="text-xs font-medium uppercase">
                {format(date, "EEE")}
              </span>
              <span className={cn(
                "text-lg font-semibold",
                isToday(date) && !isSelected && "text-primary"
              )}>
                {format(date, "d")}
              </span>
            </button>
          )
        })}
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Available times for {format(selectedDate, "EEEE, MMMM d")}
          </h4>
          
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {slotsForDate.map((slot) => (
              <button
                key={slot.time}
                onClick={() => slot.available && setSelectedTime(slot.time)}
                disabled={!slot.available}
                className={cn(
                  "py-2 px-3 rounded-lg text-sm font-medium transition-all",
                  !slot.available && "opacity-40 cursor-not-allowed line-through",
                  selectedTime === slot.time
                    ? "bg-primary text-primary-foreground"
                    : slot.available && "bg-muted hover:bg-muted/80"
                )}
              >
                {slot.time}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation */}
      {selectedDate && selectedTime && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Video Consultation</p>
                <p className="text-sm text-muted-foreground">
                  {format(selectedDate, "EEE, MMM d")} at {selectedTime}
                </p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700">15 min</Badge>
          </div>
          
          <Button
            onClick={handleSchedule}
            disabled={isScheduling}
            className="w-full rounded-xl"
          >
            {isScheduling ? "Scheduling..." : "Confirm Appointment"}
          </Button>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground text-center">
        All times shown in AEST. You&apos;ll receive a video link via email.
      </div>
    </div>
  )
}

/**
 * Compact appointment reminder card
 */
interface AppointmentReminderProps {
  date: Date
  time: string
  type: string
  onJoin?: () => void
  onReschedule?: () => void
  onCancel?: () => void
}

export function AppointmentReminder({
  date,
  time,
  type,
  onJoin,
  onReschedule,
  onCancel: _onCancel,
}: AppointmentReminderProps) {
  const isToday = isSameDay(date, new Date())
  const isPast = isBefore(date, new Date())

  return (
    <div className={cn(
      "glass-card rounded-xl p-4",
      isToday && "ring-2 ring-primary/20 bg-primary/5"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center",
            isToday ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            <Video className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{type}</p>
            <p className="text-sm text-muted-foreground">
              {format(date, "EEEE, MMMM d")} at {time}
            </p>
            {isToday && (
              <Badge className="mt-1 bg-primary text-primary-foreground">Today</Badge>
            )}
          </div>
        </div>

        {!isPast && (
          <div className="flex flex-col gap-2">
            {isToday && onJoin && (
              <Button size="sm" onClick={onJoin} className="rounded-lg">
                Join Call
              </Button>
            )}
            {onReschedule && (
              <Button variant="outline" size="sm" onClick={onReschedule} className="rounded-lg">
                Reschedule
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
