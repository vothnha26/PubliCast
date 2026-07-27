import * as React from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const INTERVAL_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 240, label: "4 hours" },
  { value: 360, label: "6 hours" },
  { value: 720, label: "12 hours" },
  { value: 1440, label: "24 hours" },
];

// Convert 24h to 12h formats
function parse24hTime(timeStr = "09:00") {
  const [hourStr, minStr] = timeStr.split(':');
  let hour = parseInt(hourStr) || 0;
  const minute = minStr || "00";
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12; // 0 should be 12
  return { hour, minute, ampm };
}

// Convert 12h back to 24h format
function to24hTime(hour, minute, ampm) {
  let hr = parseInt(hour);
  if (ampm === 'PM' && hr < 12) hr += 12;
  if (ampm === 'AM' && hr === 12) hr = 0;
  const hrStr = String(hr).padStart(2, '0');
  return `${hrStr}:${minute}`;
}

export function AutoListTimingCard({
  scheduleType,
  setScheduleType,
  intervalMinutes,
  setIntervalMinutes,
  selectedDays = [],
  onToggleIntervalDay,
  specificTimes = [],
  setSpecificTimes
}) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh";

  const [val, setVal] = React.useState(() => {
    const mins = intervalMinutes || 30;
    if (mins % 1440 === 0) return mins / 1440;
    if (mins % 60 === 0) return mins / 60;
    return mins;
  });

  const [unit, setUnit] = React.useState(() => {
    const mins = intervalMinutes || 30;
    if (mins % 1440 === 0) return 'd';
    if (mins % 60 === 0) return 'h';
    return 'm';
  });

  React.useEffect(() => {
    if (intervalMinutes) {
      if (intervalMinutes % 1440 === 0) {
        setVal(intervalMinutes / 1440);
        setUnit('d');
      } else if (intervalMinutes % 60 === 0) {
        setVal(intervalMinutes / 60);
        setUnit('h');
      } else {
        setVal(intervalMinutes);
        setUnit('m');
      }
    }
  }, [intervalMinutes]);

  const handleValChange = (e) => {
    const rawVal = e.target.value;
    const numericVal = parseInt(rawVal) || 0;
    setVal(rawVal);
    
    let multiplier = 1;
    if (unit === 'h') multiplier = 60;
    if (unit === 'd') multiplier = 1440;
    setIntervalMinutes(numericVal * multiplier);
  };

  const handleUnitChange = (e) => {
    const newUnit = e.target.value;
    setUnit(newUnit);
    
    const numericVal = parseInt(val) || 0;
    let multiplier = 1;
    if (newUnit === 'h') multiplier = 60;
    if (newUnit === 'd') multiplier = 1440;
    setIntervalMinutes(numericVal * multiplier);
  };

  const handleTimeChange = (index, part, value) => {
    const slot = specificTimes[index] || { time: "09:00", days: [] };
    const { hour, minute, ampm } = parse24hTime(slot.time);
    
    let newHr = hour;
    let newMin = minute;
    let newAmpm = ampm;

    if (part === 'hour') newHr = value;
    if (part === 'minute') newMin = value;
    if (part === 'ampm') newAmpm = value;

    const updated24h = to24hTime(newHr, newMin, newAmpm);
    
    const nextSpecificTimes = [...specificTimes];
    nextSpecificTimes[index] = { ...slot, time: updated24h };
    setSpecificTimes(nextSpecificTimes);
  };

  const handleToggleSpecificDay = (index, day) => {
    const nextSpecificTimes = [...specificTimes];
    const slot = nextSpecificTimes[index];
    const days = slot.days || [];
    
    if (days.includes(day)) {
      slot.days = days.filter(d => d !== day);
    } else {
      slot.days = [...days, day];
    }
    setSpecificTimes(nextSpecificTimes);
  };

  const handleAddNewTimeSlot = () => {
    setSpecificTimes(prev => [...prev, { time: "09:00", days: ['Mo', 'Tu', 'We', 'Th', 'Fr'] }]);
  };

  const handleRemoveTimeSlot = (index) => {
    setSpecificTimes(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Timing Cadence</h3>
          <p className="text-[11px] font-semibold text-gray-400 mt-0.5">{timezone}</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner text-[10px] font-black uppercase tracking-wider">
          <button 
            type="button"
            onClick={() => setScheduleType('INTERVAL')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${scheduleType === 'INTERVAL' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Interval
          </button>
          <button 
            type="button"
            onClick={() => setScheduleType('SPECIFIC')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${scheduleType === 'SPECIFIC' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Specific Times
          </button>
        </div>
      </div>

      <div className="p-5 border border-gray-100 rounded-2xl bg-gray-50/30 space-y-6">
        {scheduleType === 'INTERVAL' ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Thời gian giãn cách (Publish Interval)</span>
              <div className="flex items-center gap-2 max-w-xs">
                <input
                  type="number"
                  min="1"
                  value={val}
                  onChange={handleValChange}
                  className="w-24 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:border-black outline-none shadow-sm transition-all"
                  placeholder="Giá trị"
                />
                <div className="relative flex-1">
                  <select 
                    value={unit}
                    onChange={handleUnitChange}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:border-black outline-none shadow-sm appearance-none cursor-pointer pr-8"
                  >
                    <option value="m">Phút</option>
                    <option value="h">Giờ</option>
                    <option value="d">Ngày</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <p className="text-[11px] text-gray-400 font-semibold mt-1">
                ⚙️ Bài viết trong hàng đợi sẽ được đăng cách nhau mỗi{" "}
                <span className="text-black font-bold">
                  {val || 0} {unit === 'm' ? 'phút' : unit === 'h' ? 'giờ' : 'ngày'}
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Posting Days</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => onToggleIntervalDay && onToggleIntervalDay(day)}
                    className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all border cursor-pointer ${
                      selectedDays.includes(day) 
                        ? 'bg-black text-white border-transparent shadow-sm' 
                        : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Specific Posting Times</span>
            <div className="space-y-3">
              {specificTimes.length === 0 ? (
                <div className="p-4 text-center border border-dashed border-gray-200 rounded-2xl text-xs text-gray-400 font-medium">
                  No timing slots configured. Click Add to create one.
                </div>
              ) : (
                specificTimes.map((slot, idx) => {
                  const { hour, minute, ampm } = parse24hTime(slot.time);
                  const activeDays = slot.days || [];
                  
                  return (
                    <div key={idx} className="flex flex-wrap items-center gap-3 w-full animate-in slide-in-from-top-1 duration-150">
                      {/* 1. Time selection inputs */}
                      <div className="flex items-center gap-1.5">
                        <select
                          value={hour}
                          onChange={(e) => handleTimeChange(idx, 'hour', parseInt(e.target.value))}
                          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none cursor-pointer appearance-none pr-7 shadow-sm transition-all focus:border-black"
                          style={{ 
                            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, 
                            backgroundRepeat: 'no-repeat', 
                            backgroundPosition: 'right 8px center', 
                            backgroundSize: '12px' 
                          }}
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>

                        <span className="text-gray-400 font-bold text-xs">:</span>

                        <select
                          value={minute}
                          onChange={(e) => handleTimeChange(idx, 'minute', e.target.value)}
                          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none cursor-pointer appearance-none pr-7 shadow-sm transition-all focus:border-black"
                          style={{ 
                            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, 
                            backgroundRepeat: 'no-repeat', 
                            backgroundPosition: 'right 8px center', 
                            backgroundSize: '12px' 
                          }}
                        >
                          {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>

                        {/* AM/PM toggle selector */}
                        <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner text-[10px] font-black uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => handleTimeChange(idx, 'ampm', 'AM')}
                            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                              ampm === 'AM' 
                                ? 'bg-black text-white shadow-sm font-bold' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTimeChange(idx, 'ampm', 'PM')}
                            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                              ampm === 'PM' 
                                ? 'bg-black text-white shadow-sm font-bold' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            PM
                          </button>
                        </div>
                      </div>

                      {/* 2. Days selector for this specific time slot */}
                      <div className="flex gap-1 items-center bg-white p-1 border border-gray-200 rounded-xl shadow-sm">
                        {DAYS.map(day => {
                          const isActive = activeDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleToggleSpecificDay(idx, day)}
                              className={`w-7 h-7 rounded-lg text-[9px] font-black transition-all border cursor-pointer flex items-center justify-center ${
                                isActive 
                                  ? 'bg-[#4F46E5] text-white border-transparent shadow-sm' 
                                  : 'bg-transparent text-gray-400 border-transparent hover:bg-gray-50'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>

                      {/* 3. Delete button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveTimeSlot(idx)}
                        className="w-9 h-9 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded-xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                        title="Remove slot"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}

              {/* Add time slot button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddNewTimeSlot}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-black rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <Plus size={14} /> Add new slot
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
