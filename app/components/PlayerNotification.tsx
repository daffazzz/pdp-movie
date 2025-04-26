'use client';

import React from 'react';
import { FaInfoCircle, FaExclamationCircle } from 'react-icons/fa';

interface PlayerNotificationProps {
  className?: string;
}

const PlayerNotification: React.FC<PlayerNotificationProps> = ({ className = '' }) => {
  return (
    <div className={`bg-gray-800/90 p-4 rounded-md mb-3 shadow-md backdrop-blur-sm border border-gray-700 ${className}`}>
      <div className="flex items-start gap-3">
        <FaInfoCircle className="text-blue-400 mt-0.5 text-lg flex-shrink-0" />
        <div>
          <p className="text-white">
            <span className="font-semibold">Info: </span>
            Jika film/series tidak dapat diputar, kemungkinan belum tersedia di database kami. 
            <span className="text-yellow-400"> Silahkan coba film lain dulu ya! @daffa ✨</span>
          </p>
          <p className="text-gray-300 text-sm mt-1">
            Untuk pengalaman menonton yang lebih lancar, harap nonaktifkan AdBlock. 🙏
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlayerNotification; 