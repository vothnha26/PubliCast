const BasePresetStrategy = require('./base-preset.strategy');

class ThreadsPresetStrategy extends BasePresetStrategy {
  mapToOptions(meta) {
    const options = {};
    if (meta.threadsWhoCanReply) options.threadsWhoCanReply = meta.threadsWhoCanReply;
    return options;
  }
}

module.exports = new ThreadsPresetStrategy();
