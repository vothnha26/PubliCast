import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import billingService from '../../services/billing.service';
import PaymentModal from './PaymentModal';
import './UpsellModal.css';

const UpsellModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [errorDetail, setErrorDetail] = useState(null);
  const [addons, setAddons] = useState([]);
  const [paymentData, setPaymentData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the global limit reached event
    const handleLimitReached = async (event) => {
      setErrorDetail(event.detail);
      setIsOpen(true);

      // Fetch available addons
      try {
        const res = await billingService.getAddons();
        setAddons(res || []);
      } catch (err) {
        console.error('Failed to load addons', err);
      }
    };

    window.addEventListener('LIMIT_REACHED', handleLimitReached);
    return () => window.removeEventListener('LIMIT_REACHED', handleLimitReached);
  }, []);

  const handleUpgradeClick = () => {
    setIsOpen(false);
    navigate('/pricing');
  };

  const handleBuyAddon = async (addon) => {
    try {
      const currentBrand = JSON.parse(localStorage.getItem('currentBrand'));
      
      if (!currentBrand?.id) {
        alert("Vui lòng chọn Brand trước khi mua.");
        return;
      }

      const res = await billingService.initiateAddon({
        addonId: addon.id,
        brandId: currentBrand.id,
        quantity: 1
      });

      setPaymentData(res);
    } catch (err) {
      alert("Không thể khởi tạo thanh toán Addon");
    }
  };

  if (!isOpen) return null;

  // Determine if user can buy addons (must be on a paid plan)
  const canBuyAddons = errorDetail?.currentPlan && errorDetail?.currentPlan !== 'FREE';

  return (
    <>
      <div className="upsell-modal-overlay">
        <div className="upsell-modal">
          <button className="close-btn" onClick={() => setIsOpen(false)}>&times;</button>
          
          <div className="upsell-header">
            <span className="icon">⚠️</span>
            <h2>Đạt giới hạn gói</h2>
          </div>
          
          <p className="upsell-message">{errorDetail?.message}</p>

          <div className="upsell-actions">
            <div className="primary-action">
              <h3>Nâng cấp gói để mở khóa toàn bộ sức mạnh</h3>
              <button className="btn-upgrade" onClick={handleUpgradeClick}>
                Xem bảng giá các gói
              </button>
            </div>

            {canBuyAddons && addons.length > 0 && (
              <div className="secondary-action">
                <h3>Hoặc mua lẻ tính năng (Add-ons)</h3>
                <div className="addon-list">
                  {addons.map(addon => (
                    <div key={addon.id} className="addon-item">
                      <div className="addon-info">
                        <strong>{addon.name}</strong>
                        <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(addon.priceAmount)} /tháng</span>
                      </div>
                      <button className="btn-buy-addon" onClick={() => handleBuyAddon(addon)}>
                        Mua
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!canBuyAddons && (
              <p className="free-plan-notice">Bạn đang dùng gói Free. Vui lòng nâng cấp lên gói trả phí để có thể mua thêm tính năng lẻ.</p>
            )}
          </div>
        </div>
      </div>

      {paymentData && (
        <PaymentModal 
          paymentData={paymentData} 
          onClose={() => setPaymentData(null)}
          onSuccess={() => {
            setPaymentData(null);
            setIsOpen(false);
            window.location.reload(); // Reload to apply new limits
          }}
        />
      )}
    </>
  );
};

export default UpsellModal;
