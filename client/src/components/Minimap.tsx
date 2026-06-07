import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useWhiteboardStore } from '../store/whiteboard';
import { BoardElement, NoteGroup } from '../types';

const MINIMAP_WIDTH = 240;
const MINIMAP_HEIGHT = 180;
const PADDING = 8;

const getElementBounds = (el: BoardElement) => {
  switch (el.type) {
    case 'path':
    case 'line':
      if (el.points && el.points.length >= 4) {
        let pxMin = Infinity, pyMin = Infinity, pxMax = -Infinity, pyMax = -Infinity;
        for (let i = 0; i < el.points.length; i += 2) {
          pxMin = Math.min(pxMin, el.points[i]);
          pyMin = Math.min(pyMin, el.points[i + 1]);
          pxMax = Math.max(pxMax, el.points[i]);
          pyMax = Math.max(pyMax, el.points[i + 1]);
        }
        return { minX: pxMin, minY: pyMin, maxX: pxMax, maxY: pyMax };
      }
      return { minX: el.x, minY: el.y, maxX: el.x + 50, maxY: el.y + 50 };
    case 'circle':
      const rx = (el.width || 0) / 2;
      const ry = (el.height || 0) / 2;
      return {
        minX: el.x - rx,
        minY: el.y - ry,
        maxX: el.x + rx,
        maxY: el.y + ry,
      };
    case 'text':
      return {
        minX: el.x,
        minY: el.y - 20,
        maxX: el.x + 100,
        maxY: el.y,
      };
    default:
      return {
        minX: el.x,
        minY: el.y,
        maxX: el.x + (el.width || 100),
        maxY: el.y + (el.height || 100),
      };
  }
};

export const Minimap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const [, forceUpdate] = useState({});

  const {
    board,
    canvasTransform,
    setCanvasTransform,
    showMinimap,
    setShowMinimap,
    noteGroups,
  } = useWhiteboardStore();

  const calculateContentBounds = useCallback(() => {
    if (!board) return { minX: 0, minY: 0, maxX: 1000, maxY: 800 };

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    noteGroups.forEach((group) => {
      minX = Math.min(minX, group.x);
      minY = Math.min(minY, group.y);
      maxX = Math.max(maxX, group.x + group.width);
      maxY = Math.max(maxY, group.y + group.height);
    });

    board.layers.forEach((layer) => {
      if (!layer.visible) return;
      layer.elements.forEach((el) => {
        const bounds = getElementBounds(el);
        minX = Math.min(minX, bounds.minX);
        minY = Math.min(minY, bounds.minY);
        maxX = Math.max(maxX, bounds.maxX);
        maxY = Math.max(maxY, bounds.maxY);
      });
    });

    if (minX === Infinity) {
      minX = -500;
      minY = -500;
      maxX = 1500;
      maxY = 1000;
    }

    const padding = 200;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    };
  }, [board, noteGroups]);

  const renderMinimap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !board) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bounds = calculateContentBounds();
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;

    const scaleX = (MINIMAP_WIDTH - PADDING * 2) / contentWidth;
    const scaleY = (MINIMAP_HEIGHT - PADDING * 2) / contentHeight;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = PADDING + (MINIMAP_WIDTH - PADDING * 2 - contentWidth * scale) / 2;
    const offsetY = PADDING + (MINIMAP_HEIGHT - PADDING * 2 - contentHeight * scale) / 2;

    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    ctx.fillStyle = board.backgroundColor || '#f5f5f5';
    ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    noteGroups.forEach((group: NoteGroup) => {
      const x = offsetX + (group.x - bounds.minX) * scale;
      const y = offsetY + (group.y - bounds.minY) * scale;
      const w = group.width * scale;
      const h = (group.collapsed ? 50 : group.height) * scale;

      ctx.fillStyle = group.color;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, 4);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    board.layers.forEach((layer) => {
      if (!layer.visible) return;

      layer.elements.forEach((el) => {
        const elBounds = getElementBounds(el);
        const x = offsetX + (elBounds.minX - bounds.minX) * scale;
        const y = offsetY + (elBounds.minY - bounds.minY) * scale;
        const w = Math.max((elBounds.maxX - elBounds.minX) * scale, 2);
        const h = Math.max((elBounds.maxY - elBounds.minY) * scale, 2);

        ctx.fillStyle = el.fill || '#3b82f6';
        ctx.globalAlpha = 0.7;

        if (el.type === 'path' || el.type === 'line') {
          ctx.strokeStyle = el.stroke || '#000';
          ctx.lineWidth = Math.max(1, (el.strokeWidth || 2) * scale);
          ctx.beginPath();
          if (el.points && el.points.length >= 4) {
            ctx.moveTo(
              offsetX + (el.points[0] - bounds.minX) * scale,
              offsetY + (el.points[1] - bounds.minY) * scale
            );
            for (let i = 2; i < el.points.length; i += 2) {
              ctx.lineTo(
                offsetX + (el.points[i] - bounds.minX) * scale,
                offsetY + (el.points[i + 1] - bounds.minY) * scale
              );
            }
            ctx.stroke();
          }
        } else if (el.type === 'circle') {
          ctx.beginPath();
          ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, w, h);
        }
        ctx.globalAlpha = 1;
      });
    });

    const mainCanvas = document.querySelector('canvas');
    if (mainCanvas) {
      const rect = mainCanvas.getBoundingClientRect();
      const viewportWidth = rect.width / canvasTransform.scale;
      const viewportHeight = rect.height / canvasTransform.scale;
      const viewportX = -canvasTransform.translateX / canvasTransform.scale;
      const viewportY = -canvasTransform.translateY / canvasTransform.scale;

      const vpX = offsetX + (viewportX - bounds.minX) * scale;
      const vpY = offsetY + (viewportY - bounds.minY) * scale;
      const vpW = viewportWidth * scale;
      const vpH = viewportHeight * scale;

      ctx.strokeStyle = '#2196f3';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(33, 150, 243, 0.15)';
      ctx.beginPath();
      ctx.rect(vpX, vpY, vpW, vpH);
      ctx.fill();
      ctx.stroke();
    }
  }, [board, canvasTransform, calculateContentBounds, noteGroups]);

  useEffect(() => {
    if (showMinimap) {
      renderMinimap();
    }
  }, [showMinimap, renderMinimap]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (showMinimap) {
        forceUpdate({});
      }
    }, 500);
    return () => clearInterval(interval);
  }, [showMinimap]);

  const handleMinimapInteraction = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !board) return;

      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const bounds = calculateContentBounds();
      const contentWidth = bounds.maxX - bounds.minX;
      const contentHeight = bounds.maxY - bounds.minY;

      const scaleX = (MINIMAP_WIDTH - PADDING * 2) / contentWidth;
      const scaleY = (MINIMAP_HEIGHT - PADDING * 2) / contentHeight;
      const scale = Math.min(scaleX, scaleY);

      const offsetX = PADDING + (MINIMAP_WIDTH - PADDING * 2 - contentWidth * scale) / 2;
      const offsetY = PADDING + (MINIMAP_HEIGHT - PADDING * 2 - contentHeight * scale) / 2;

      const worldX = (x - offsetX) / scale + bounds.minX;
      const worldY = (y - offsetY) / scale + bounds.minY;

      const mainCanvas = document.querySelector('canvas');
      if (!mainCanvas) return;

      const mainRect = mainCanvas.getBoundingClientRect();

      const translateX = mainRect.width / 2 - worldX * canvasTransform.scale;
      const translateY = mainRect.height / 2 - worldY * canvasTransform.scale;

      setCanvasTransform({
        ...canvasTransform,
        translateX,
        translateY,
      });
    },
    [board, canvasTransform, calculateContentBounds, setCanvasTransform]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      isDraggingRef.current = true;
      handleMinimapInteraction(e.clientX, e.clientY);
    },
    [handleMinimapInteraction]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current) return;
      handleMinimapInteraction(e.clientX, e.clientY);
    },
    [handleMinimapInteraction]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  if (!showMinimap) {
    return (
      <button
        onClick={() => setShowMinimap(true)}
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: '#fff',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          zIndex: 1000,
        }}
        title="显示小地图"
      >
        🗺️
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        background: '#fff',
        borderRadius: '10px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          background: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          fontWeight: 500,
          color: '#374151',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          🗺️ 小地图
        </span>
        <button
          onClick={() => setShowMinimap(false)}
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '4px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
            fontSize: '14px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          title="隐藏小地图"
        >
          ✕
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        style={{
          display: 'block',
          cursor: 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};
