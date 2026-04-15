import { useState } from 'react';

interface DoctorAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-16 h-16 text-xl',
  lg: 'w-24 h-24 text-3xl',
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

export default function DoctorAvatar({ name, photoUrl, size = 'md', className = '' }: DoctorAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = sizes[size];
  const base = `${sizeClass} rounded-full flex-shrink-0 ${className}`;

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${base} object-cover`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`${base} bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold flex items-center justify-center`}>
      {initials(name)}
    </div>
  );
}
