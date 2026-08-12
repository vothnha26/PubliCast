if (!String.prototype.toWellFormed) {
  String.prototype.toWellFormed = function () {
    return this.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD');
  };
}
