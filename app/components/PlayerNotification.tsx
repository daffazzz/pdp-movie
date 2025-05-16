'use client';

import React from 'react';
import { FaInfoCircle, FaExclamationCircle, FaApple, FaMobile } from 'react-icons/fa';

interface PlayerNotificationProps {
  className?: string;
}

const PlayerNotification: React.FC<PlayerNotificationProps> = ({ className = '' }) => {
  return (
    <div className={`bg-gray-800/90 p-3 sm:p-4 rounded-md mb-2 sm:mb-3 shadow-md backdrop-blur-sm border border-gray-700 text-sm sm:text-base ${className}`}>
      <div className="flex items-start gap-2">
        <FaInfoCircle className="text-blue-400 mt-0.5 text-base flex-shrink-0 hidden sm:block" />
        <div>
          <p className="text-white">
            <span className="font-semibold">Info: </span>
            Jika film tidak bisa diputar :  jika proses fetching tidak berjalan maka reload website, 
            jika fetching berjalan namun kode 404 muncul maka film belum ada di database.
            <span className="text-yellow-400"> Coba film lain dulu ya! ✨  @DAF </span>
          </p>
          <p className="text-gray-300 text-xs sm:text-sm mt-1">
            Nonaktifkan AdBlock agar player dapat berjalan. Sans gaada iklan kok. 🙏
          </p>
          
          <div className="mt-1 pt-1 sm:mt-2 sm:pt-2 border-t border-gray-700">
            <p className="text-white flex items-center flex-wrap">
              <FaApple className="mr-1 text-gray-400" /> 
              <span className="font-semibold text-red-400">iPhone: </span>
              <span className="ml-1 text-yellow-300">Jika player tidak dapat di putar di safari, coba gunakan chrome 📱</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerNotification; 