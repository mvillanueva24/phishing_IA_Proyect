import { useState } from 'react';

interface AvatarProps {
  src: string;
  name: string;
  initials: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export function Avatar({ src, name, initials, size = 'md' }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        aria-label={name}
        className={`${SIZE_CLASSES[size]} shrink-0 rounded-full bg-slate-200 text-slate-700 font-display font-semibold flex items-center justify-center border border-slate-300`}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Retrato de ${name}`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${SIZE_CLASSES[size]} shrink-0 rounded-full object-cover border border-slate-200 bg-slate-100`}
    />
  );
}
