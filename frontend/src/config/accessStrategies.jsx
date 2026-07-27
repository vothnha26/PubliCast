import React from 'react';
import { toast } from 'sonner';

export const ACCESS_STRATEGIES_REGISTRY = {
  // 1. Chiến lược ẩn phần tử hoàn toàn
  HIDE: (children, config, fallback) => {
    return fallback; 
  },

  // 2. Chiến lược vô hiệu hóa phần tử
  DISABLE: (children, config) => {
    return React.Children.map(children, child => {
      if (!React.isValidElement(child)) return child;
      return React.cloneElement(child, {
        disabled: true,
        className: `${child.props.className || ''} opacity-50 cursor-not-allowed`,
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          toast.warning(config.fallbackMessage || "Bạn không có quyền thực hiện thao tác này.");
        }
      });
    });
  },

  // 3. Chiến lược yêu cầu nâng cấp gói cước
  UPGRADE: (children, config) => {
    return React.Children.map(children, child => {
      if (!React.isValidElement(child)) return child;
      return React.cloneElement(child, {
        className: `${child.props.className || ''} border-amber-300 relative`,
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          toast.info(config.fallbackMessage || "Tính năng này yêu cầu nâng cấp gói cước.");
          // Trigger chuyển hướng đến trang pricing
          window.location.href = "/pricing";
        }
      });
    });
  },

  // 4. Chiến lược bắt xem quảng cáo hoặc chèn banner
  SHOW_ADS: (children, config) => {
    return (
      <div className="relative group">
        {children}
        <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px] flex items-center justify-center">
          <span className="text-[10px] bg-yellow-400 text-black px-2 py-0.5 rounded font-black">ADS TO UNLOCK</span>
        </div>
      </div>
    );
  }
};

/**
 * Hàm đăng ký thêm Strategy mới tại runtime
 */
export const registerAccessStrategy = (name, handler) => {
  ACCESS_STRATEGIES_REGISTRY[name] = handler;
};
