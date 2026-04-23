import React from 'react';

interface Slot {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
}

interface Props {
  slots: Slot[];
  booking: number | null;
  isPatient: boolean;
  onBook: (slotId: number) => void;
}

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

export default function AvailabilityCalendar({ slots, booking, isPatient, onBook }: Props) {
  const today = new Date();

  // Filter out slots whose startTime has already passed
  const futureSlots = React.useMemo(
    () => slots.filter(s => new Date(s.startTime) > new Date()),
    [slots],
  );

  // Build map: YYYY-MM-DD → count of future slots
  const slotsByDate = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const s of futureSlots) {
      const d = s.date.split('T')[0];
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    return map;
  }, [futureSlots]);

  const initialMonth = React.useMemo(() => {
    if (slotsByDate.size === 0) return { year: today.getFullYear(), month: today.getMonth() };
    const dates = [...slotsByDate.keys()].sort();
    const first = new Date(dates[0] + 'T12:00:00');
    const firstFuture = dates.find(d => new Date(d + 'T12:00:00') >= new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    const target = firstFuture ? new Date(firstFuture + 'T12:00:00') : first;
    return { year: target.getFullYear(), month: target.getMonth() };
  }, [slotsByDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const [viewYear, setViewYear] = React.useState(initialMonth.year);
  const [viewMonth, setViewMonth] = React.useState(initialMonth.month);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);

  React.useEffect(() => {
    setViewYear(initialMonth.year);
    setViewMonth(initialMonth.month);
  }, [initialMonth.year, initialMonth.month]);

  const availableDates = slotsByDate;
  const { firstDay, daysInMonth } = buildCalendar(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewYear === today.getFullYear() && viewMonth === today.getMonth()) return;
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
  };

  const canGoPrev = !(viewYear === today.getFullYear() && viewMonth === today.getMonth());
  const monthName = new Date(viewYear, viewMonth).toLocaleString('es-AR', { month: 'long', year: 'numeric' });

  const slotsForSelected = selectedDate
    ? futureSlots.filter(s => s.date.split('T')[0] === selectedDate)
    : [];

  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div>
      {/* Calendar */}
      <div
        className="rounded-[var(--radius-xl)] bg-[var(--color-card)] p-5 mb-5 max-w-sm"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            disabled={!canGoPrev}
            className="p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-card-hover)] text-[var(--color-text-secondary)] disabled:opacity-30 disabled:cursor-default transition-colors"
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <span className="font-semibold text-[var(--color-text)] capitalize" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-card-hover)] text-[var(--color-text-secondary)] transition-colors"
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {days.map(d => (
            <div key={d} className="text-center text-xs font-medium text-[var(--color-text-muted)] py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1" role="grid" aria-label="Calendario de disponibilidad">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} role="gridcell" />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const slotCount = availableDates.get(dateStr) ?? 0;
            const isAvailable = slotCount > 0;
            const isSelected = selectedDate === dateStr;
            const isPast = new Date(dateStr + 'T00:00:00') < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const active = isAvailable && !isPast;
            const slotHintId = active ? `slot-hint-${dateStr}` : undefined;

            return (
              <div key={day} className="flex flex-col items-center py-0.5" role="gridcell">
                <button
                  onClick={() => active && setSelectedDate(isSelected ? null : dateStr)}
                  disabled={!active}
                  aria-label={active ? `${day}, ${slotCount} turnos disponibles` : `${day}`}
                  aria-describedby={slotHintId}
                  className={`
                    h-9 w-9 rounded-full text-sm transition-all duration-150 leading-none font-medium
                    ${isSelected ? 'bg-[var(--color-primary)] text-white shadow-md' : ''}
                    ${active && !isSelected ? 'text-[var(--color-text)] hover:bg-[var(--color-primary-light)]' : ''}
                    ${!active ? 'text-[var(--color-text-muted)]/40 cursor-default' : ''}
                  `}
                >
                  {day}
                </button>
                {active && (
                  <>
                    <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white/60' : 'bg-[var(--color-accent)]'}`} aria-hidden="true" />
                    <span id={slotHintId} className="sr-only">{slotCount} {slotCount === 1 ? 'turno disponible' : 'turnos disponibles'}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Slots for selected day */}
      {selectedDate && (
        <div>
          <h3
            className="text-base font-semibold text-[var(--color-text)] mb-3"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Horarios para el {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {slotsForSelected.map(slot => {
              const start = new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const end = new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div
                  key={slot.id}
                  className="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-3 flex items-center justify-between"
                  style={{ boxShadow: 'var(--shadow-card)' }}
                >
                  <span className="text-[var(--color-text)] font-medium">{start} – {end}</span>
                  {isPatient ? (
                    <button
                      onClick={() => onBook(slot.id)}
                      disabled={booking === slot.id}
                      className="px-4 py-1.5 rounded-[var(--radius-md)] text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
                    >
                      {booking === slot.id ? 'Reservando...' : 'Reservar'}
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)]">Iniciá sesión como paciente</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!selectedDate && availableDates.size === 0 && (
        <p className="text-[var(--color-text-muted)]">No hay turnos disponibles en los próximos 30 días.</p>
      )}

      {!selectedDate && availableDates.size > 0 && (
        <p className="text-[var(--color-text-muted)] text-sm">Seleccioná un día con punto de color para ver los horarios.</p>
      )}
    </div>
  );
}
