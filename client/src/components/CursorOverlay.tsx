import React, { useState, useEffect } from 'react';
import { useWhiteboardStore } from '../store/whiteboard';
import { CursorPosition } from '../types';
import { getContrastColor, darkenColor, isCursorActive, shouldShowCursor } from '../utils/cursorUtils';

interface CursorItemProps {
  cursor: CursorPosition;
  canvasTransform: { scale: number; translateX: number; translateY: number };
}

const CursorItem: React.FC<CursorItemProps> = ({ cursor, canvasTransform }) => {
  const [opacity, setOpacity] = useState(1);
  const color = cursor.color || '#FF6B6B';
  const textColor = getContrastColor(color);
  const shadowColor = darkenColor(color, 0.3);
  const isActive = isCursorActive(cursor.lastActiveAt);
  const showCursor = shouldShowCursor(cursor.lastActiveAt);

  useEffect(() => {
    if (!cursor.lastActiveAt) {
      setOpacity(1);
      return;
    }

    const updateOpacity = () => {
      const now = Date.now();
      const timeSinceActive = now - cursor.lastActiveAt!;
      
      if (timeSinceActive < 5000) {
        setOpacity(1);
      } else if (timeSinceActive < 30000) {
        const fadeStart = 5000;
        const fadeEnd = 30000;
        const progress = (timeSinceActive - fadeStart) / (fadeEnd - fadeStart);
        setOpacity(Math.max(0.3, 1 - progress * 0.7));
      } else {
        setOpacity(0.3);
      }
    };

    updateOpacity();
    const interval = setInterval(updateOpacity, 500);
    return () => clearInterval(interval);
  }, [cursor.lastActiveAt]);

  if (!showCursor) return null;

  const left = cursor.x * canvasTransform.scale + canvasTransform.translateX;
  const top = cursor.y * canvasTransform.scale + canvasTransform.translateY;

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        pointerEvents: 'none',
        zIndex: 1000,
        transform: 'translate(-2px, -2px)',
        opacity,
        transition: 'opacity 0.3s ease',
      }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        style={{
          filter: `drop-shadow(0 2px 4px ${shadowColor}40)`,
        }}
      >
        <path
          d="M2 2 L18 11 L11 11 L8 18 Z"
          fill={color}
          stroke="#ffffff"
          strokeWidth="1.5"
        />
        {cursor.isHost && (
          <circle
            cx="17"
            cy="5"
            r="5"
            fill="#FFD700"
            stroke="#ffffff"
            strokeWidth="1"
          />
        )}
      </svg>

      <div
        style={{
          position: 'absolute',
          left: '18px',
          top: '0px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          fontWeight: 500,
          backgroundColor: color,
          color: textColor,
          padding: '3px 8px',
          borderRadius: '6px',
          whiteSpace: 'nowrap',
          boxShadow: `0 2px 8px ${shadowColor}30, 0 1px 3px ${shadowColor}20`,
          border: '1px solid rgba(255,255,255,0.3)',
          transform: isActive ? 'scale(1)' : 'scale(0.95)',
          transformOrigin: 'left top',
          transition: 'transform 0.2s ease',
        }}
      >
        {cursor.isHost && (
          <span style={{ fontSize: '10px' }}>👑</span>
        )}
        <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {cursor.username}
        </span>
        {!isActive && (
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: textColor,
              opacity: 0.5,
            }}
          />
        )}
      </div>

      {isActive && (
        <div
          style={{
            position: 'absolute',
            left: '-4px',
            top: '-4px',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            backgroundColor: `${color}15`,
            pointerEvents: 'none',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      )}
    </div>
  );
};

export const CursorOverlay: React.FC = () => {
  const { cursors, canvasTransform } = useWhiteboardStore();
  const cursorList = Array.from(cursors.values());

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(0.8);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.3;
          }
        }
      `}</style>
      {cursorList.map(cursor => (
        <CursorItem
          key={cursor.socketId}
          cursor={cursor}
          canvasTransform={canvasTransform}
        />
      ))}
    </>
  );
};
