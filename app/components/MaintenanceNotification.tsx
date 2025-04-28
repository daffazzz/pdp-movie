'use client';

import React, { useState } from 'react';
import { FaTools, FaTimes } from 'react-icons/fa';
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
    <div className={`fixed top-20 left-0 right-0 mx-auto max-w-3xl z-50 bg-red-900/90 p-4 rounded-md shadow-md backdrop-blur-sm border border-red-700 text-white ${className}`}>
      <div className="flex items-start gap-3">
        <FaTools className="text-yellow-300 mt-1 text-xl flex-shrink-0" />
        <div className="flex-grow">
          <p className="font-semibold text-lg mb-1">
            Perhatian: Server Sedang Dalam Maintenance
          </p>
          <p className="text-gray-100">
            Mohon maaf atas ketidaknyamanannya. Saat ini sedang dilakukan maintenance pada server dan banyak film tidak dapat diputar. 
            Kami sedang bekerja untuk memperbaikinya secepatnya.
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