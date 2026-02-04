import { useRef, useCallback } from 'react';

interface SwipeBackOptions {
  onBack: () => void;
  edgeThreshold?: number; // Distance from left edge to start swipe (default: 30px)
  swipeThreshold?: number; // Minimum swipe distance to trigger back (default: 100px)
  enabled?: boolean;
}

export function useSwipeBack({
  onBack,
  edgeThreshold = 30,
  swipeThreshold = 100,
  enabled = true
}: SwipeBackOptions) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isEdgeSwipe = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    
    // Check if touch started from left edge
    isEdgeSwipe.current = touch.clientX <= edgeThreshold;
  }, [enabled, edgeThreshold]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enabled || !isEdgeSwipe.current) return;
    
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartX.current;
    const diffY = Math.abs(touch.clientY - touchStartY.current);
    
    // Only trigger if:
    // 1. Swipe started from edge
    // 2. Horizontal swipe distance is greater than threshold
    // 3. Horizontal movement is greater than vertical (to avoid conflicts with scrolling)
    if (diffX > swipeThreshold && diffX > diffY * 1.5) {
      onBack();
    }
    
    isEdgeSwipe.current = false;
  }, [enabled, swipeThreshold, onBack]);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd
  };
}
