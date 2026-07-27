import React from 'react';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import { FEATURE_GATE_REGISTRY } from '../../constants/products';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function UpgradeOverlay({ productId }) {
  const navigate = useNavigate();
  const config = FEATURE_GATE_REGISTRY[productId] || {
    title: "Unlock Premium Feature",
    description: "This advanced tool requires a higher subscription plan. Upgrade your workplace to enjoy limit-free automation and analytics."
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/40 backdrop-blur-[3px] rounded-3xl transition-all duration-300">
      <div className="bg-white/95 border border-purple-100 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center flex flex-col items-center justify-center mx-4 relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Glow effects */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-200/40 rounded-full filter blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-200/30 rounded-full filter blur-2xl pointer-events-none"></div>
        
        <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-orange-500 rounded-2xl flex items-center justify-center text-white mb-5 shadow-lg shadow-purple-200">
          <Sparkles size={26} className="animate-pulse" />
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">{config.title}</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          {config.description}
        </p>
        
        <button 
          onClick={() => navigate('/pricing')}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-white transition-all bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 shadow-md hover:shadow-lg active:scale-95"
        >
          Upgrade Plan
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function FeatureGate({ productId, children }) {
  const { hasAccess } = useFeatureGate();
  
  if (hasAccess(productId)) {
    return <>{children}</>;
  }
  
  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div className="opacity-25 pointer-events-none filter select-none">
        {children}
      </div>
      <UpgradeOverlay productId={productId} />
    </div>
  );
}
