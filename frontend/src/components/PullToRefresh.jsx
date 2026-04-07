import React, { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

const PullToRefresh = ({ onRefresh, children, className = '' }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const THRESHOLD = 80; // Distance to trigger refresh
  const MAX_PULL = 120; // Maximum pull distance

  const handleTouchStart = useCallback((e) => {
    // Only enable pull-to-refresh when at the top of the page
    if (containerRef.current?.scrollTop === 0 || window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling || isRefreshing) return;

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    // Only pull down, not up
    if (diff > 0) {
      // Apply resistance to the pull
      const resistance = 0.5;
      const distance = Math.min(diff * resistance, MAX_PULL);
      setPullDistance(distance);

      // Prevent default scrolling when pulling
      if (distance > 10) {
        e.preventDefault();
      }
    }
  }, [isPulling, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60); // Keep indicator visible during refresh

      try {
        await onRefresh();
      } catch (error) {
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }

    setIsPulling(false);
  }, [pullDistance, isRefreshing, onRefresh, isPulling]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const rotation = progress * 180;
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: isPulling && pullDistance > 10 ? 'none' : 'auto' }}
    >
      {/* Pull indicator - only show on mobile */}
      <div
        className={`md:hidden fixed left-1/2 -translate-x-1/2 z-[100] transition-all duration-200 ${
          showIndicator ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          top: `${Math.max(pullDistance - 20, 10)}px`,
        }}
      >
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-lg border border-slate-200 ${
            isRefreshing ? 'animate-pulse' : ''
          }`}
        >
          <RefreshCw
            className={`h-5 w-5 text-teal-600 transition-transform ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
            }}
          />
        </div>
        {pullDistance >= THRESHOLD && !isRefreshing && (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-teal-600 font-medium">
            Release to refresh
          </div>
        )}
        {isRefreshing && (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-teal-600 font-medium">
            Refreshing...
          </div>
        )}
      </div>

      {/* Content with pull transform - only on mobile */}
      <div
        className="md:transform-none transition-transform duration-200"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transitionDuration: isPulling ? '0ms' : '200ms',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
