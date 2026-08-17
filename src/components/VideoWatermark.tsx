import React, { useState, useEffect } from 'react';

interface VideoWatermarkProps {
  user: {
    name?: string;
    phone?: string;
    email?: string;
  } | null | undefined;
}

export const VideoWatermark: React.FC<VideoWatermarkProps> = ({ user }) => {
  const [posIndex, setPosIndex] = useState(0);

  const positions = [
    'top-4 left-4',
    'top-4 right-4',
    'bottom-16 right-4',
    'bottom-16 left-4',
    'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    'top-1/3 left-6',
    'bottom-1/3 right-6',
    'top-6 left-1/3',
    'bottom-8 right-1/3',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPosIndex((prev) => (prev + 1) % positions.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [positions.length]);

  if (!user) return null;

  const rawName = user.name ? user.name.trim() : 'طالب الأكاديمية';
  const firstName = rawName.split(' ')[0] || 'طالب';
  const phone = user.phone ? user.phone.trim() : '';

  const watermarkLabel = phone ? `${firstName} • ${phone}` : firstName;

  return (
    <div
      className={`absolute ${positions[posIndex]} z-30 pointer-events-none select-none transition-all duration-1000 ease-in-out opacity-35 hover:opacity-10`}
      aria-hidden="true"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <div className="bg-black/75 text-white/90 border border-white/20 px-3.5 py-1 rounded-full text-xs font-mono font-bold dir-ltr shadow-2xl backdrop-blur-md whitespace-nowrap tracking-wide">
        {watermarkLabel}
      </div>
    </div>
  );
};

