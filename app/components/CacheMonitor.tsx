'use client';

import { useState, useEffect } from 'react';
import { cache } from '@/lib/cache';

interface CacheMonitorProps {
  showDetails?: boolean;
}

const CacheMonitor: React.FC<CacheMonitorProps> = ({ showDetails = false }) => {
  const [stats, setStats] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      setStats(cache.getStats());
    };

    // Update stats every 5 seconds
    const interval = setInterval(updateStats, 5000);
    updateStats(); // Initial update

    return () => clearInterval(interval);
  }, []);

  // Only show in development or when explicitly requested
  useEffect(() => {
    setIsVisible(process.env.NODE_ENV === 'development' || showDetails);
  }, [showDetails]);

  if (!isVisible || !stats) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/80 text-white p-4 rounded-lg text-xs font-mono max-w-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-green-400">Cache Stats</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Hit Rate:</span>
          <span className={`${stats.hitRate > 70 ? 'text-green-400' : stats.hitRate > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
            {stats.hitRate.toFixed(1)}%
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Hits:</span>
          <span className="text-green-400">{stats.hits}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Misses:</span>
          <span className="text-red-400">{stats.misses}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Memory:</span>
          <span className="text-blue-400">{stats.memorySize} items</span>
        </div>
        
        <div className="flex justify-between">
          <span>Sets:</span>
          <span className="text-cyan-400">{stats.sets}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Evictions:</span>
          <span className="text-orange-400">{stats.evictions}</span>
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-600">
        <button 
          onClick={() => {
            cache.clear();
            setStats(cache.getStats());
          }}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded text-xs"
        >
          Clear Cache
        </button>
      </div>
    </div>
  );
};

export default CacheMonitor;
