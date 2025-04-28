'use client';

import React, { useState } from 'react';
import { FaTools, FaTimes, FaSmile } from 'react-icons/fa';
import { useMaintenanceMode } from '../../contexts/MaintenanceContext';

interface MaintenanceNotificationProps {
  className?: string;
}

const MaintenanceNotification: React.FC<MaintenanceNotificationProps> = ({ className = '' }) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const { isMaintenanceMode } = useMaintenanceMode();

  // Jika mode maintenance tidak aktif atau notifikasi telah ditutup, jangan tampilkan apa-apa
  if (!isMaintenanceMode || isDismissed) return null;

  return (
    <div className={`fixed top-20 left-0 right-0 mx-auto max-w-3xl z-50 bg-indigo-800/90 p-4 rounded-md shadow-md backdrop-blur-sm border border-indigo-600 text-white ${className}`}>
      <div className="flex items-start gap-3">
        <FaSmile className="text-yellow-300 mt-1 text-xl flex-shrink-0" />
        <div className="flex-grow">
          <p className="font-semibold text-lg mb-1">
            Hallooo!!! Ini Daffa 👋
          </p>
          <p className="text-gray-100">
            Maaf ganggu nonton filmnya ya rekk!! Server lagi maintenance nih, jadi beberapa film mungkin banyak yang gak bisa diputar dulu. 
            Santai aja, aku lagi kerjain biar cepet normal kok! 😊
            Jangan lupa follow igku @daffaa_ar. ps: adakah yang mau ngerjain skripsiku?? tinggal lampiran doang kok wkwwkkw
          </p>
        </div>
        <button 
          onClick={() => setIsDismissed(true)}
          className="text-gray-300 hover:text-white transition-colors"
          aria-label="Close notification"
        >
          <FaTimes />
        </button>
      </div>
    </div>
  );
};

export default MaintenanceNotification; 