const { eventEmitter, EVENTS } = require('../event-emitter');
const autoListService = require('../../services/workspace/auto-list.service');
const logger = require('../../utils/logger');

/**
 * Initialize AutoList Event Subscribers
 */
const initAutoListSubscribers = () => {
  const handleRecalculate = async ({ autoListId }) => {
    try {
      logger.debug(`[Event] Recalculating queue for AutoList ${autoListId}`);
      await autoListService.recalculateQueueSchedules(autoListId);
    } catch (err) {
      console.error(`[Event Error] AutoList recalculation failed for ${autoListId}:`, err.message);
    }
  };

  eventEmitter.on(EVENTS.AUTOLIST.CREATED, handleRecalculate);
  eventEmitter.on(EVENTS.AUTOLIST.UPDATED, handleRecalculate);
  eventEmitter.on(EVENTS.AUTOLIST.TOGGLED, handleRecalculate);
};

module.exports = initAutoListSubscribers;
