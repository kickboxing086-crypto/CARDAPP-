import React from 'react';

interface ForkKnifeIconProps {
  className?: string;
  size?: number;
}

export const ForkKnifeIcon: React.FC<ForkKnifeIconProps> = ({
  className = 'w-6 h-6 text-amber-500',
  size,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Fork */}
      <path d="M5 2v7c0 1.66 1.34 3 3 3v10" />
      <path d="M5 2c0 2 1.5 3 3 3s3-1 3-3" />
      <path d="M8 2v6" />
      {/* Knife */}
      <path d="M16 2v20" />
      <path d="M16 2c2.5 0 3.5 2 3.5 6s-1.5 6-3.5 6" />
    </svg>
  );
};

export const ForkKnifePlaceholder: React.FC<{ productName: string }> = ({ productName }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-white to-amber-100/60 p-4 text-center select-none border-b border-amber-200/50">
      <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-300/80 flex items-center justify-center text-amber-600 mb-2.5 shadow-xs">
        <ForkKnifeIcon className="w-8 h-8 text-amber-600 stroke-[2.2]" />
      </div>
      <span className="text-xs font-black text-slate-800 line-clamp-2 max-w-[85%] leading-tight">
        {productName}
      </span>
      <span className="text-[10px] font-semibold text-amber-700/80 uppercase tracking-widest mt-1">
        Prato do Dia
      </span>
    </div>
  );
};
