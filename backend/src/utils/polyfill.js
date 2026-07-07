if (!String.prototype.toWellFormed) {
  String.prototype.toWellFormed = function () {
    return this.normalize('D').replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD');
  };
}
