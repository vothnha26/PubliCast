const BasePresetStrategy = require('./base-preset.strategy');

class GlobalPresetStrategy extends BasePresetStrategy {
  mapToOptions(meta) {
    const options = {};
    if (meta.globalFirstComment || meta.firstComment) {
      options.firstComment = meta.globalFirstComment || meta.firstComment;
    }
    if (meta.useUrlShortener !== undefined) {
      options.useUrlShortener = meta.useUrlShortener;
    }
    return options;
  }
}

module.exports = new GlobalPresetStrategy();
