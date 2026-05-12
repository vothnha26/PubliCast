import React from 'react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function FormInput({ label, ...rest }: Props) {
  return (
    <div>
      {label && <label className="block text-sm text-slate-400 mb-2">{label}</label>}
      <input
        {...rest}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
      />
    </div>
  );
}
