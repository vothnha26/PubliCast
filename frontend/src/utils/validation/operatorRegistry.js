/**
 * Validation Operator Strategies
 * Quy ước: Các toán tử trả về `true` nếu VI PHẠM quy tắc (báo lỗi) và `false` nếu hợp lệ.
 */
class EqualsOperator {
  evaluate(rawValue, ruleValue) {
    return rawValue !== ruleValue;
  }
}

class IsEmptyOperator {
  evaluate(rawValue) {
    return !rawValue || String(rawValue).trim() === '';
  }
}

class IsNullOperator {
  evaluate(rawValue) {
    return rawValue === null || rawValue === undefined;
  }
}

class LengthGtOperator {
  evaluate(rawValue, ruleValue) {
    if (!rawValue) return false;
    return rawValue.length > Number(ruleValue);
  }
}

class ContainsAnyOperator {
  evaluate(rawValue, ruleValue) {
    if (!rawValue || !Array.isArray(ruleValue)) return false;
    const strVal = String(rawValue);
    return ruleValue.some(val => strVal.includes(val));
  }
}

class GtOperator {
  evaluate(rawValue, ruleValue) {
    if (rawValue === undefined || rawValue === null) return false;
    return Number(rawValue) > Number(ruleValue);
  }
}

class LtOperator {
  evaluate(rawValue, ruleValue) {
    if (rawValue === undefined || rawValue === null) return false;
    return Number(rawValue) < Number(ruleValue);
  }
}

class RangeOperator {
  evaluate(rawValue, ruleValue) {
    if (rawValue === undefined || rawValue === null || !Array.isArray(ruleValue)) return false;
    const val = Number(rawValue);
    return val < Number(ruleValue[0]) || val > Number(ruleValue[1]);
  }
}

class FormatAllowedOperator {
  evaluate(rawValue, ruleValue) {
    if (!rawValue || !ruleValue) return false;
    const allowed = String(ruleValue).split(',').map(f => f.trim().toLowerCase());
    const format = String(rawValue).split('.').pop().split('?')[0].toLowerCase();
    return !!(format && !allowed.includes(format));
  }
}

class AspectRatioOperator {
  evaluate(rawValue, ruleValue, context) {
    const width = Number(context.videoWidth);
    const height = Number(context.videoHeight);
    if (!width || !height || isNaN(width) || isNaN(height)) {
      return false; // Không đủ thông tin kích thước thì không check được
    }
    const ratio = width / height;

    if (ruleValue === 'vertical') {
      // Reels, Shorts dọc chuẩn: chiều rộng phải nhỏ hơn chiều cao. Vi phạm nếu ratio >= 1 (ngang/vuông)
      return ratio >= 1;
    }
    if (ruleValue === 'vertical_or_square') {
      // Dọc hoặc vuông. Vi phạm nếu ratio > 1 (ngang)
      return ratio > 1;
    }
    if (ruleValue === 'square') {
      // Vuông. Vi phạm nếu tỷ số lệch khỏi 1 quá nhiều
      return Math.abs(ratio - 1) > 0.05;
    }
    if (ruleValue === 'horizontal') {
      // Ngang. Vi phạm nếu ratio <= 1 (dọc/vuông)
      return ratio <= 1;
    }
    return false;
  }
}

/**
 * Registry quản lý các toán tử validation
 */
class OperatorRegistry {
  constructor() {
    this.operators = new Map();
    this.registerDefaultOperators();
  }

  register(name, operatorInstance) {
    this.operators.set(name, operatorInstance);
  }

  get(name) {
    return this.operators.get(name);
  }

  registerDefaultOperators() {
    this.register('equals', new EqualsOperator());
    this.register('is_empty', new IsEmptyOperator());
    this.register('is_null', new IsNullOperator());
    this.register('length_gt', new LengthGtOperator());
    this.register('contains_any', new ContainsAnyOperator());
    this.register('gt', new GtOperator());
    this.register('lt', new LtOperator());
    this.register('range', new RangeOperator());
    this.register('aspect_ratio', new AspectRatioOperator());
    this.register('format_allowed', new FormatAllowedOperator());
  }
}

export const ValidationOperatorRegistry = new OperatorRegistry();
