import React, { useState, useEffect, useCallback } from 'react';
import billingService from '../../services/billing.service';
import './PaymentModal.css';

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const PaymentModal = ({ paymentData, onClose, onSuccess }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [paid, setPaid] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const handleSuccess = useCallback(() => {
    setPaid(true);
  }, []);

  useEffect(() => {
    if (!paymentData) return;

    const expiryDate = new Date(paymentData.expiredAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const distance = expiryDate - now;
      setTimeLeft(distance < 0 ? 0 : Math.floor(distance / 1000));
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);

    const pollInterval = setInterval(async () => {
      try {
        const res = await billingService.getSubscriptionStatus(paymentData.transactionCode);
        const status = res?.status || res?.data?.status;
        if (status === 'PAID') {
          clearInterval(pollInterval);
          clearInterval(timerInterval);
          handleSuccess();
        } else if (status === 'EXPIRED') {
          clearInterval(pollInterval);
          clearInterval(timerInterval);
          onClose();
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 3000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(pollInterval);
    };
  }, [paymentData, onClose, handleSuccess]);

  if (!paymentData) return null;

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');
  const isExpired = timeLeft === 0;
  const amount = paymentData.plan ? paymentData.plan.amount : paymentData.addon?.amount;
  const planName = paymentData.plan ? paymentData.plan.name : paymentData.addon?.name;
  const formattedAmount = new Intl.NumberFormat('vi-VN').format(amount);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleClose = () => {
    if (paid) onSuccess();
    else onClose();
  };

  return (
    <div className="pm-overlay" onClick={(e) => e.target === e.currentTarget && !paid && handleClose()}>
      <div className="pm-modal">

        {/* ── SUCCESS SCREEN ── */}
        {paid && (
          <div className="pm-success">
            <div className="pm-success-ring">
              <div className="pm-success-icon"><CheckIcon /></div>
            </div>
            <h2 className="pm-success-title">Thanh toán thành công!</h2>
            <p className="pm-success-sub">
              Gói <strong>{planName}</strong> đã được kích hoạt cho Brand của bạn.
            </p>
            <div className="pm-success-amount">{formattedAmount} VND</div>
            <p className="pm-success-txn">{paymentData.transactionCode}</p>
            <button className="pm-done-btn" onClick={handleClose}>
              Hoàn tất
            </button>
          </div>
        )}

        {/* ── PAYMENT SCREEN ── */}
        {!paid && (
          <>
            <button className="pm-close" onClick={handleClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            {/* Header */}
            <div className="pm-header">
              <div className="pm-badge"><ShieldIcon /> Thanh toán an toàn</div>
              <h2 className="pm-title">Quét mã để thanh toán</h2>
              <div className="pm-plan-chip">
                Gói <span>{planName}</span>
                {paymentData.billingCycle === 'ANNUAL'
                  ? <> · <span className="pm-price">{formattedAmount} ₫/năm</span> <span className="pm-cycle-badge">Hằng năm</span></>
                  : <> · <span className="pm-price">{formattedAmount} ₫/tháng</span></>
                }
              </div>
            </div>

            {/* Body: QR + Info */}
            <div className="pm-body">
              {/* QR */}
              <div className="pm-qr-wrap">
                <div className="pm-qr-frame">
                  {isExpired ? (
                    <div className="pm-qr-expired">
                      <span>⏰</span>
                      <p>Mã QR đã hết hạn</p>
                    </div>
                  ) : (
                    <img src={paymentData.qrDataUrl} alt="VietQR" className="pm-qr-img" />
                  )}
                </div>
                <div className={`pm-timer ${isExpired ? 'expired' : timeLeft < 60 ? 'urgent' : ''}`}>
                  {isExpired ? 'Hết hạn' : `Hết hạn sau ${minutes}:${seconds}`}
                </div>
                <p className="pm-scan-hint">Mở App ngân hàng bất kỳ và quét mã</p>
              </div>

              {/* Transfer info */}
              <div className="pm-info">
                <div className="pm-info-header">Chuyển khoản thủ công</div>

                <div className="pm-info-row">
                  <span className="pm-info-label">Ngân hàng</span>
                  <span className="pm-info-value">{paymentData.bankInfo.bankName}</span>
                </div>

                <div className="pm-info-row">
                  <span className="pm-info-label">Số tài khoản</span>
                  <div className="pm-info-copy-row">
                    <span className="pm-info-value mono">{paymentData.bankInfo.accountNo}</span>
                    <button className={`pm-copy-btn ${copiedKey === 'acct' ? 'copied' : ''}`}
                      onClick={() => copyToClipboard(paymentData.bankInfo.accountNo, 'acct')}>
                      {copiedKey === 'acct' ? '✓' : <CopyIcon />}
                    </button>
                  </div>
                </div>

                <div className="pm-info-row">
                  <span className="pm-info-label">Số tiền</span>
                  <div className="pm-info-copy-row">
                    <span className="pm-info-value mono amount-highlight">{formattedAmount} VND</span>
                    <button className={`pm-copy-btn ${copiedKey === 'amt' ? 'copied' : ''}`}
                      onClick={() => copyToClipboard(amount, 'amt')}>
                      {copiedKey === 'amt' ? '✓' : <CopyIcon />}
                    </button>
                  </div>
                </div>

                <div className="pm-info-row txn-row">
                  <span className="pm-info-label">Nội dung CK</span>
                  <div className="pm-info-copy-row">
                    <span className="pm-info-value mono txn-code">{paymentData.transactionCode}</span>
                    <button className={`pm-copy-btn ${copiedKey === 'txn' ? 'copied' : ''}`}
                      onClick={() => copyToClipboard(paymentData.transactionCode, 'txn')}>
                      {copiedKey === 'txn' ? '✓' : <CopyIcon />}
                    </button>
                  </div>
                </div>

                <div className="pm-warning">
                  ⚠️ Điền chính xác nội dung để xác nhận tự động
                </div>
              </div>
            </div>

            {/* Footer polling indicator */}
            <div className="pm-footer">
              <div className="pm-pulse-dot" />
              <span>Đang chờ xác nhận thanh toán...</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
