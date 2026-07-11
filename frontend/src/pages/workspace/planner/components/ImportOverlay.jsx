import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Reusable modal loading backdrop to show import progress.
 * Conforms to Single Responsibility Principle (SRP).
 */
export function ImportOverlay({ isOpen, titleKey, messageKey }) {
  const { t } = useTranslation('planner');
  const title = titleKey ? t(titleKey) : t('importOverlay.title');
  const message = messageKey ? t(messageKey) : t('importOverlay.message');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl flex flex-col items-center space-y-4 animate-in zoom-in-95 duration-200">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-red-100 border-t-red-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.43 12.98L12 21.36L4.57 12.98L6.87 9.17H17.13L19.43 12.98Z" fill="#4CAF50" />
              <path d="M15.43 2H8.57L5.13 7.82H18.87L15.43 2Z" fill="#FFC107" />
              <path d="M2.14 7.82L5.57 13.64L2.14 19.45L2.14 7.82Z" fill="#2196F3" />
            </svg>
          </div>
        </div>
        <h4 className="text-sm font-black text-gray-800 uppercase tracking-wide">{title}</h4>
        <p className="text-xs text-gray-400 font-bold leading-normal">
          {message}
        </p>
      </div>
    </div>
  );
}
