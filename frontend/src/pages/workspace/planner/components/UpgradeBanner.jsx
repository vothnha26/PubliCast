import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { X } from 'lucide-react';

export function UpgradeBanner({ postedCount = 0, limit = 20 }) {
  const { t } = useTranslation("planner");
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem("publicast_upgrade_banner_dismissed") === "true";
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("publicast_upgrade_banner_dismissed", "true");
  };

  if (isDismissed) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-sm relative overflow-hidden group min-h-[72px] no-print transition-all">
      {/* Zebra Lime/Yellow Stripes Graphic on the right */}
      <div className="absolute right-0 top-0 bottom-0 w-[320px] pointer-events-none select-none overflow-hidden hidden md:block">
        <svg className="w-full h-full object-cover" viewBox="0 0 300 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M160 -40 C210 10 240 60 340 100" stroke="#EDFEB1" strokeWidth="28" strokeLinecap="round" />
          <path d="M190 -30 C240 20 270 70 370 110" stroke="#D9F99D" strokeWidth="24" strokeLinecap="round" />
          <path d="M130 -50 C180 0 210 50 310 90" stroke="#F6FCE3" strokeWidth="20" strokeLinecap="round" />
          <path d="M100 -60 C150 -10 180 40 280 80" stroke="#EDFEB1" strokeWidth="16" strokeLinecap="round" />
        </svg>
      </div>

      <div className="flex gap-3.5 items-center relative z-10 pr-4">
        {/* Yellow Diamond Badge */}
        <div className="w-10 h-10 rounded-full bg-[#FCFEEF] border border-[#E9F9C3] flex items-center justify-center shrink-0 shadow-sm">
          {/* Diamond yellow background */}
          <div className="w-7 h-7 rounded-full bg-[#E2F89C] flex items-center justify-center text-xs">💎</div>
        </div>
        <div>
          <h3 className="text-xs font-extrabold text-[#0A0A0A]">{t("upgrade.title", { defaultValue: "Do you need a higher plan?" })}</h3>
          <p className="text-[11px] text-gray-550 font-bold mt-0.5">
            <Trans
              t={t}
              i18nKey="upgrade.desc"
              values={{ posted: postedCount, limit }}
              components={{
                span: <span className="text-gray-900 font-extrabold" />
              }}
            >
              You have posted <span>{{posted: postedCount}} out of your {{limit}}</span> available posts in your plan this month. Upgrade your plan to increase the limit.
            </Trans>
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2.5 relative z-10 shrink-0">
        <button className="px-4 py-2 bg-[#0A0A0A] hover:bg-[#1A1A1A] text-white rounded-full text-[11px] font-bold transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
          {t("upgrade.button", { defaultValue: "Upgrade your plan" })}
        </button>
        <button
          onClick={handleDismiss}
          title={t("upgrade.dismiss", { defaultValue: "Dismiss banner" })}
          className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer border-none bg-transparent"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
