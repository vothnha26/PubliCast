import React from 'react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export default function Button({ children, className = '', ...rest }: Props) {
  return (
    <button
      {...rest}
      className={"px-4 py-2 rounded-xl bg-purple-600 text-white hover:opacity-95 transition-all " + className}
    >
      {children}
    </button>
  );
}
