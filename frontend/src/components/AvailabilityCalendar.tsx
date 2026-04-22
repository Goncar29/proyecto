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

  // Derive initial month: jump to the first month that has available slots
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

  // Sync initial month when slots load (avoids stale closure on first render)
  React.useEffect(() => {
    setViewYear(initialMonth.year);
    setViewMonth(initialMonth.month);
  }, [initialMonth.year, initialMonth.month]);

  // Build a set of available dates (YYYY-MM-DD).
  const availableDates = slotsByDate;

  const { firstDay, daysInMonth } = buildCalendar(viewYear, viewMonth);

  const isCurrentOrFutureMonth = viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth >= today.getMonth());

  const prevMonth = () => {
    if (!isCurrentOrFutureMonth) return;
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
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4 max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevMonth}
            disabled={!canGoPrev}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 disabled:opacity-30 disabled:cursor-default"
          >
            ‹
          </button>
          <span className="font-medium text-gray-900 dark:text-white capitalize">{monthName}</span>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400">
            ›
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 mb-1">
          {days.map(d => (
            <div key={d} className="text-center text-xs text-gray-400 dark:text-gray-500 py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-2">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const slotCount = availableDates.get(dateStr) ?? 0;
            const isAvailable = slotCount > 0;
            const isSelected = selectedDate === dateStr;
            // Append local midnight to compare calendar day (not UTC offset).
            const isPast = new Date(dateStr + 'T00:00:00') < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const active = isAvailable && !isPast;

            return (
              <div key={day} className="flex flex-col items-center">
                <button
                  onClick={() => active && setSelectedDate(isSelected ? null : dateStr)}
                  disabled={!active}
                  className={`
                    h-8 w-8 rounded-full text-sm transition-colors leading-none
                    ${isSelected ? 'bg-blue-600 text-white font-semibold' : ''}
                    ${active && !isSelected ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-800/50 font-medium' : ''}
                    ${!active ? 'text-gray-300 dark:text-gray-600 cursor-default' : ''}
                  `}
                >
                  {day}
                </button>
                {active && (
                  <span className={`text-[9px] leading-none mt-0.5 font-medium ${isSelected ? 'text-blue-300' : 'text-blue-500 dark:text-blue-400'}`}>
                    {slotCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-sm text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/40 inline-block" /> Disponible
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-blue-600 inline-block" /> Seleccionado
        </span>
      </div>

      {/* Slots for selected day */}
      {selectedDate && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
            Horarios para el {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {slotsForSelected.map(slot => {
              const start = new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const end = new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={slot.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-gray-900 dark:text-white font-medium">{start} – {end}</span>
                  {isPatient ? (
                    <button
                      onClick={() => onBook(slot.id)}
                      disabled={booking === slot.id}
                      className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {booking === slot.id ? 'Reservando...' : 'Reservar'}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500">Iniciá sesión como paciente</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!selectedDate && availableDates.size === 0 && (
        <p className="text-gray-500 dark:text-gray-400">No hay turnos disponibles en los próximos 30 días.</p>
      )}

      {!selectedDate && availableDates.size > 0 && (
        <p className="text-gray-400 dark:text-gray-500 text-sm">Seleccioná un día resaltado para ver los horarios disponibles.</p>
      )}
    </div>
  );
}
