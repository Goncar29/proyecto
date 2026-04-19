/**
 * Generic user avatar — shows photo if available, otherwise initials fallback.
 * Used in Navbar, Settings, and any place needing a user avatar.
 */
interface Props {
  name: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-16 h-16 text-xl',
};

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

export default function UserAvatar({ name, photoUrl, size = 'md' }: Props) {
  const cls = sizeClasses[size];

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${cls} rounded-full object-cover ring-2 ring-white dark:ring-gray-700 flex-shrink-0`}
      />
    );
  }

  return (
    <span
      className={`${cls} rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center flex-shrink-0 select-none`}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}
