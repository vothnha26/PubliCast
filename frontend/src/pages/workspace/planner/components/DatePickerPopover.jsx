import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function DatePickerPopover({ isOpen, onClose, selectedDate, onSelectDate }) {
  // Local view month and year
  const [viewDate, setViewDate] = useState(new Date(selectedDate));

  // The component never unmounts when closed (it just returns null below),
  // so viewDate — initialized once at mount — would keep whatever month the
  // user last navigated to on a previous open instead of resetting to
  // selectedDate's month (#88 M7).
  useEffect(() => {
    if (isOpen) {
      setViewDate(new Date(selectedDate));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Get first day of month (0 = Sunday, 1 = Monday...)
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Get number of days in month
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Days grid array
  const daysGrid = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysGrid.push(null); // empty slots for padding
  }
  for (let d = 1; d <= totalDays; d++) {
    daysGrid.push(new Date(year, month, d));
  }

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const isSameDay = (d1, d2) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  return (
    <div 
      className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white border border-gray-100 rounded-3xl p-5 shadow-2xl z-50 w-[280px] animate-in fade-in duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={handlePrevMonth}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-gray-500"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-bold text-[#0A0A0A]">{monthNames[month]} {year}</span>
        <button 
          onClick={handleNextMonth}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-gray-500"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Week Days Label */}
      <div className="grid grid-cols-7 text-center text-[10px] font-bold text-gray-400 mb-2">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
          <div key={idx} className="h-6 flex items-center justify-center">{day}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {daysGrid.map((dateObj, idx) => {
          if (!dateObj) {
            return <div key={`empty-${idx}`} className="h-7" />;
          }

          const active = isSameDay(dateObj, selectedDate);
          
          return (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                onSelectDate(dateObj);
                onClose();
              }}
              className={`h-7 w-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                active 
                  ? "bg-[#1C1917] text-white" 
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {dateObj.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
