import { useState } from 'react';
import { getAvatarColorClass, getInitials } from '@/src/utils/locationTime';

interface AvatarProps {
  name: string;
  photoUrl?: string;
  sizeClass?: string;
  textClass?: string;
  ringClass?: string;
}

export function Avatar({
  name,
  photoUrl,
  sizeClass = 'w-14 h-14',
  textClass = 'text-base',
  ringClass = 'ring-2 ring-white/90',
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(photoUrl) && !imgError;

  if (showImage) {
    return (
      <img
        src={photoUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover shrink-0 shadow-sm ${ringClass}`}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={`${sizeClass} ${getAvatarColorClass(name)} ${textClass} ${ringClass} rounded-full flex items-center justify-center font-semibold tracking-tight shrink-0 shadow-sm select-none`}
    >
      {getInitials(name)}
    </div>
  );
}
