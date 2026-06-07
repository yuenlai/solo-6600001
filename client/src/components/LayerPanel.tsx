import React, { useEffect, useRef } from 'react';
import { useWhiteboardStore } from '../store/whiteboard';

export const LayerPanel: React.FC = () => {
  const { board, activeLayerIndex, newlyCreatedLayerIndex, setActiveLayerIndex, toggleLayerVisibility, toggleLayerLock, addLayer, clearNewlyCreatedLayerIndex } = useWhiteboardStore();
  const newLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (newlyCreatedLayerIndex !== null && newLayerRef.current) {
      newLayerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timer = setTimeout(() => {
        clearNewlyCreatedLayerIndex();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [newlyCreatedLayerIndex, clearNewlyCreatedLayerIndex]);

  if (!board) return null;

  return (
    <div className="layer-panel-container" style={{
      width: '240px', background: '#fff', borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)', padding: '12px',
      display: 'flex', flexDirection: 'column', gap: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>图层</h3>
          <span style={{ fontSize: '11px', color: '#999', background: '#f0f0f0', padding: '2px 6px', borderRadius: '10px' }}>
            {board.layers.length}
          </span>
        </div>
        <button onClick={() => addLayer(`图层 ${board.layers.length + 1}`)}
          style={{ border: 'none', background: 'linear-gradient(135deg, #4472C4 0%, #5B8BD9 100%)', color: '#fff', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 500, boxShadow: '0 2px 4px rgba(68, 114, 196, 0.3)', transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 3px 6px rgba(68, 114, 196, 0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(68, 114, 196, 0.3)'; }}>
          + 新建
        </button>
      </div>
      <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px', paddingLeft: '4px' }}>
        顶部为最上层
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto', paddingRight: '2px' }}>
        {[...board.layers].reverse().map((layer, reversedIndex) => {
          const actualIndex = board.layers.length - 1 - reversedIndex;
          const isActive = actualIndex === activeLayerIndex;
          const isNew = actualIndex === newlyCreatedLayerIndex;
          const isHidden = !layer.visible;
          const isLocked = layer.locked;

          return (
            <div key={actualIndex}
              ref={isNew ? newLayerRef : null}
              onClick={() => setActiveLayerIndex(actualIndex)}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 8px 8px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                background: isActive ? 'linear-gradient(135deg, #E8F0FE 0%, #D6E4FF 100%)' : isNew ? '#FFF9E6' : '#fafafa',
                border: isActive ? '1px solid #4472C4' : isNew ? '1px solid #FFD700' : '1px solid transparent',
                boxShadow: isActive ? '0 2px 4px rgba(68, 114, 196, 0.15)' : 'none',
                opacity: isHidden ? 0.5 : 1,
                transition: 'all 0.2s ease',
                animation: isNew ? 'pulse 2s ease-in-out' : 'none'
              }}
              onMouseEnter={(e) => { if (!isActive && !isNew) e.currentTarget.style.background = '#f0f0f0'; }}
              onMouseLeave={(e) => { if (!isActive && !isNew) e.currentTarget.style.background = '#fafafa'; }}>
              {isActive && (
                <div style={{
                  position: 'absolute', left: 0, top: '6px', bottom: '6px', width: '3px',
                  background: '#4472C4', borderRadius: '0 2px 2px 0'
                }} />
              )}
              <button onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(actualIndex); }}
                title={layer.visible ? '隐藏图层' : '显示图层'}
                style={{
                  border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: '15px', padding: '2px', borderRadius: '4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '24px', height: '24px',
                  transition: 'all 0.15s ease',
                  opacity: isHidden ? 0.5 : 1
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = isHidden ? 'rgba(255, 77, 79, 0.1)' : 'rgba(68, 114, 196, 0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                {layer.visible ? '👁️' : '🙈'}
              </button>
              <span style={{
                flex: 1, fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                color: isHidden ? '#999' : isActive ? '#1a3a6b' : '#333',
                textDecoration: isLocked ? 'line-through' : 'none',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {layer.name}
              </span>
              {isActive && (
                <span style={{ fontSize: '10px', color: '#4472C4', background: 'rgba(68, 114, 196, 0.1)', padding: '2px 5px', borderRadius: '8px', fontWeight: 500 }}>
                  当前
                </span>
              )}
              <button onClick={(e) => { e.stopPropagation(); toggleLayerLock(actualIndex); }}
                title={layer.locked ? '解锁图层' : '锁定图层'}
                style={{
                  border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: '15px', padding: '2px', borderRadius: '4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '24px', height: '24px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = isLocked ? 'rgba(255, 152, 0, 0.1)' : 'rgba(68, 114, 196, 0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                {layer.locked ? '🔒' : '🔓'}
              </button>
              <span style={{
                fontSize: '11px',
                color: isActive ? '#4472C4' : '#bbb',
                minWidth: '24px', textAlign: 'right',
                fontWeight: isActive ? 600 : 400
              }}>
                {layer.elements.length}
              </span>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.4); }
          50% { box-shadow: 0 0 0 6px rgba(255, 215, 0, 0); }
        }
      `}</style>
    </div>
  );
};
