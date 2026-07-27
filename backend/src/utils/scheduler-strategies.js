const { SEPARATORS, DEFAULT_CONFIG, AUTOLIST_TYPES } = require('./constants');
const DAYS_MAP = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };
const DEFAULT_ACTIVE_DAYS = 'Su,Mo,Tu,We,Th,Fr,Sa';

class AutoListScheduleStrategy {
  calculateNextSlots(autoList, count, fromDate) {
    throw new Error('Method calculateNextSlots() must be implemented.');
  }
}

class IntervalScheduleStrategy extends AutoListScheduleStrategy {
  calculateNextSlots(autoList, count, fromDate, minDate) {
    const slots = [];
    const interval = autoList.intervalMinutes || 60;
    const activeDaysList = (autoList.activeDays || DEFAULT_ACTIVE_DAYS).split(SEPARATORS.COMMA).map(d => d.trim());
    const activeDaysNums = activeDaysList.map(d => DAYS_MAP[d]).filter(n => n !== undefined);
    
    let current = new Date(fromDate.getTime());
    const minTime = minDate ? minDate.getTime() : fromDate.getTime();
    
    while (slots.length < count) {
      current.setMinutes(current.getMinutes() + interval);
      const dayOfWeek = current.getDay();
      if (activeDaysNums.includes(dayOfWeek)) {
        if (current.getTime() > minTime) {
          slots.push(new Date(current.getTime()));
        }
      }
      
      // Safety break to prevent infinite loops if active days are invalid
      if (slots.length === 0 && current.getTime() - fromDate.getTime() > 30 * 24 * 60 * 60 * 1000) {
        break; 
      }
    }
    
    return slots;
  }
}

class SpecificTimesScheduleStrategy extends AutoListScheduleStrategy {
  calculateNextSlots(autoList, count, fromDate, minDate) {
    const slots = [];
    let scheduleConfig = [];

    // Check if specificTimes is JSON or legacy comma-separated string
    if (autoList.specificTimes && autoList.specificTimes.startsWith('[')) {
      try {
        scheduleConfig = JSON.parse(autoList.specificTimes);
      } catch (e) {
        console.error('Failed to parse specificTimes JSON:', e);
      }
    } else {
      // Legacy fallback
      const activeDaysList = (autoList.activeDays || DEFAULT_ACTIVE_DAYS).split(SEPARATORS.COMMA).map(d => d.trim());
      const timeStrings = (autoList.specificTimes || DEFAULT_CONFIG.TIME).split(SEPARATORS.COMMA).map(t => t.trim()).filter(Boolean);
      scheduleConfig = timeStrings.map(time => ({
        time,
        days: activeDaysList
      }));
    }

    if (!scheduleConfig || scheduleConfig.length === 0) return slots;
    
    let dayOffset = 0;
    const minTime = minDate ? minDate.getTime() : fromDate.getTime();
    // Search up to 60 days ahead
    while (slots.length < count && dayOffset < 60) {
      const targetDate = new Date(fromDate.getTime());
      targetDate.setDate(targetDate.getDate() + dayOffset);
      const dayName = Object.keys(DAYS_MAP).find(key => DAYS_MAP[key] === targetDate.getDay());
      
      for (const config of scheduleConfig) {
        const days = config.days || [];
        if (days.includes(dayName)) {
          const [hourStr, minStr] = config.time.split(':');
          const hr = parseInt(hourStr) || 0;
          const min = parseInt(minStr) || 0;
          
          const slotDate = new Date(targetDate.getTime());
          slotDate.setHours(hr, min, 0, 0);
          
          if (slotDate.getTime() > fromDate.getTime() && slotDate.getTime() > minTime) {
            slots.push(slotDate);
          }
        }
      }
      dayOffset++;
    }
    
    // Sort all gathered dates chronologically and slice the requested count
    slots.sort((a, b) => a.getTime() - b.getTime());
    return slots.slice(0, count);
  }
}

class ScheduleStrategyFactory {
  static getStrategy(type) {
    switch (type) {
      case AUTOLIST_TYPES.SCHEDULE.INTERVAL:
        return new IntervalScheduleStrategy();
      case AUTOLIST_TYPES.SCHEDULE.SPECIFIC:
        return new SpecificTimesScheduleStrategy();
      default:
        return new IntervalScheduleStrategy();
    }
  }
}

module.exports = {
  ScheduleStrategyFactory,
  IntervalScheduleStrategy,
  SpecificTimesScheduleStrategy
};
