const VietQRGateway = require('./vietqr-gateway');

/**
 * PaymentGatewayFactory
 * OCP + DIP: High-level services depend on this factory, not on concrete gateways.
 * Adding a new gateway = add a new case here + new class file. Zero changes elsewhere.
 */
class PaymentGatewayFactory {
  static getGateway(type = process.env.PAYMENT_GATEWAY || 'vietqr') {
    switch (type.toLowerCase()) {
      case 'vietqr':
        return new VietQRGateway();
      // case 'momo':
      //   return new MoMoGateway();  // Add later without touching anything above
      default:
        throw new Error(`Unknown payment gateway: "${type}". Check PAYMENT_GATEWAY in .env`);
    }
  }
}

module.exports = PaymentGatewayFactory;
