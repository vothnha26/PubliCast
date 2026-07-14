class BaseValidator {
  nextValidator = null;

  setNext(validator) {
    this.nextValidator = validator;
    return validator; // Cho phép liên kết dạng A.setNext(B).setNext(C)
  }

  async validate(context) {
    if (this.nextValidator) {
      return await this.nextValidator.validate(context);
    }
    return context; // Đi hết chuỗi validate thành công
  }
}

module.exports = BaseValidator;
