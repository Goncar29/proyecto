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
  const [viewYear, setViewYear] = React.useState(today.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(today.getMonth());
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);

  // Build a set of available dates (YYYY-MM-DD)
  const availableDates = new Set(
    slots.map(s => s.date.split('T')[0])
  );

  const { firstDay, daysInMonth } = buildCalendar(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
  };

  const monthName = new Date(viewYear, viewMonth).toLocaleString('es-AR', { month: 'long', year: 'numeric' });

  const slotsForSelected = selectedDate
    ? slots.filter(s => s.date.split('T')[0] === selectedDate)
    : [];

  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div>
      {/* Calendar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg text-gray-600">
            ‹
          </button>
          <span className="font-medium text-gray-900 capitalize">{monthName}</span>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg text-gray-600">
            ›
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 mb-1">
          {days.map(d => (
            <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isAvailable = availableDates.has(dateStr);
            const isSelected = selectedDate === dateStr;
            const isPast = new Date(dateStr + 'T00:00:00') < new Date(today.getFullYear(), today.getMonth(), today.getDate());

            return (
              <button
                key={day}
                onClick={() => isAvailable && !isPast && setSelectedDate(isSelected ? null : dateStr)}
                disabled={!isAvailable || isPast}
                className={`
                  h-8 w-8 mx-auto rounded-full text-sm transition-colors
                  ${isSelected ? 'bg-blue-600 text-white font-semibold' : ''}
                  ${isAvailable && !isPast && !isSelected ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium' : ''}
                  ${!isAvailable || isPast ? 'text-gray-300 cursor-default' : ''}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-blue-100 inline-block" /> Disponible
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-blue-600 inline-block" /> Seleccionado
        </span>
      </div>

      {/* Slots for selected day */}
      {selectedDate && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            Horarios para el {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {slotsForSelected.map(slot => {
              const start = new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const end = new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={slot.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-gray-900 font-medium">{start} – {end}</span>
                  {isPatient ? (
                    <button
                      onClick={() => onBook(slot.id)}
                      disabled={booking === slot.id}
                      className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {booking === slot.id ? 'Reservando...' : 'Reservar'}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">Iniciá sesión como paciente</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!selectedDate && availableDates.size === 0 && (
        <p className="text-gray-500">No hay turnos disponibles en los próximos 30 días.</p>
      )}

      {!selectedDate && availableDates.size > 0 && (
        <p className="text-gray-400 text-sm">Seleccioná un día resaltado para ver los horarios.</p>
      )}
    </div>
  );
}
