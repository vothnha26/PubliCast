const BackgroundValidatorStrategy = require('./background-validator.strategy');

class GradientValidator extends BackgroundValidatorStrategy {
  validate(value) {
    if (!value || typeof value !== 'string') {
      return false;
    }
    // Check if it's a CSS gradient (linear-gradient, radial-gradient, conic-gradient)
    // or a Tailwind gradient class string (containing bg-gradient-to)
    const isCssGradient = /gradient\(/i.test(value);
    const isTailwindGradient = value.includes('bg-gradient-to') && value.includes('from-');
    
    return isCssGradient || isTailwindGradient;
  }
}

module.exports = GradientValidator;
