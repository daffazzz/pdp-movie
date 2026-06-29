'use client';

import React from 'react';

interface PlayerNotificationProps {
  className?: string;
}

const PlayerNotification: React.FC<PlayerNotificationProps> = ({ className = '' }) => {
  return (
    <div className={`bg-gray-800/90 p-3 sm:p-4 rounded-md mb-2 sm:mb-3 shadow-md backdrop-blur-sm border border-gray-700 text-sm sm:text-base ${className}`}>
      <div className="flex items-start gap-2 justify-center text-center">
        <p className="text-white">
          <span className="font-semibold text-yellow-400">ℹ️ Info: </span>
          jika terdapat kode 404, movie/series belum tersedia di database, coba film lain dulu ya
        </p>
      </div>
    </div>
  );
};

export default PlayerNotification;
