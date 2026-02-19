'use client';

import React from 'react';
import { FaInfoCircle, FaApple } from 'react-icons/fa';

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
            <span className="font-semibold">ℹ️ Info: </span>
            Jika film tidak bisa diputar — coba reload halaman terlebih dahulu 🔄.
            Apabila proses fetching berjalan tapi muncul kode <span className="text-red-400 font-semibold">404</span>, berarti film belum tersedia di database.
            <span className="text-yellow-400"> Coba film lain dulu ya! ✨ @DAF</span>
          </p>

          <div className="mt-2 pt-2 border-t border-gray-700">
            <p className="text-white">
              <span className="font-semibold">🛡️ Terganggu iklan?</span>
              <span className="text-gray-300"> Gunakan </span>
              <span className="text-green-400 font-semibold">AdBlock</span>
              <span className="text-gray-300"> untuk pengalaman menonton yang lebih nyaman tanpa gangguan iklan! 😌✨</span>
            </p>
          </div>

          <div className="mt-2 pt-2 border-t border-gray-700">
            <p className="text-white">
              <span className="font-semibold">🎬 Subtitle tidak muncul?</span>
              <span className="text-gray-300"> Gunakan opsi </span>
              <span className="text-cyan-400 font-semibold">OpenSubtitles</span>
              <span className="text-gray-300"> di dalam player, atau coba ganti server melalui tombol </span>
              <span className="text-yellow-300 font-semibold">🔄 Server</span>
              <span className="text-gray-300"> di pojok kanan atas player 👆</span>
            </p>
          </div>

          <div className="mt-2 pt-2 border-t border-gray-700">
            <p className="text-white flex items-center flex-wrap">
              <FaApple className="mr-1 text-gray-400" />
              <span className="font-semibold text-red-400">iPhone: </span>
              <span className="ml-1 text-yellow-300">Jika player tidak dapat diputar di Safari, coba gunakan Chrome 📱</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerNotification; 