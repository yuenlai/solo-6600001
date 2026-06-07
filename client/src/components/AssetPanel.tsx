import React, { useRef, useState } from 'react';
import { useWhiteboardStore } from '../store/whiteboard';

export const AssetPanel: React.FC = () => {
  const { assets, addAsset, deleteAsset, insertAssetToCanvas, showAssetPanel, setShowAssetPanel } = useWhiteboardStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'usage'>('recent');

  if (!showAssetPanel) return null;

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          addAsset({
            name: file.name,
            type: 'image',
            dataUrl,
            width: img.width,
            height: img.height
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleInsert = (assetId: string) => {
    insertAssetToCanvas(assetId, 100, 100);
  };

  const sortedAssets = [...assets].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return b.usageCount - a.usageCount;
  });

  return (
    <div style={{
      position: 'absolute',
      left: '80px',
      top: '12px',
      width: '280px',
      maxHeight: 'calc(100% - 24px)',
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 100
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
          🎨 素材库
        </h3>
        <button
          onClick={() => setShowAssetPanel(false)}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            color: '#6b7280',
            padding: '4px',
            borderRadius: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          ×
        </button>
      </div>

      <div style={{ padding: '12px' }}>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? '#4472C4' : '#d1d5db'}`,
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? '#eff6ff' : '#f9fafb',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📁</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            点击或拖拽上传图片
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
            支持 JPG、PNG、GIF 格式
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {assets.length > 0 && (
        <div style={{
          padding: '0 12px 8px',
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <button
            onClick={() => setSortBy('recent')}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              background: sortBy === 'recent' ? '#4472C4' : '#f3f4f6',
              color: sortBy === 'recent' ? '#fff' : '#6b7280'
            }}
          >
            最近上传
          </button>
          <button
            onClick={() => setSortBy('usage')}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              background: sortBy === 'usage' ? '#4472C4' : '#f3f4f6',
              color: sortBy === 'usage' ? '#fff' : '#6b7280'
            }}
          >
            常用
          </button>
        </div>
      )}

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px'
      }}>
        {sortedAssets.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#9ca3af',
            fontSize: '13px'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🖼️</div>
            暂无素材，上传第一张图片吧
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px'
          }}>
            {sortedAssets.map(asset => (
              <div
                key={asset.id}
                style={{
                  position: 'relative',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid #e5e7eb',
                  background: '#f9fafb',
                  aspectRatio: '1',
                  cursor: 'pointer'
                }}
                onClick={() => handleInsert(asset.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4472C4';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(68, 114, 196, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <img
                  src={asset.dataUrl}
                  alt={asset.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  display: 'flex',
                  gap: '4px',
                  opacity: 0,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget.parentElement as HTMLElement).style.opacity = '1';
                }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAsset(asset.id);
                    }}
                    style={{
                      width: '24px',
                      height: '24px',
                      border: 'none',
                      borderRadius: '4px',
                      background: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    🗑️
                  </button>
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '6px 8px',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                  color: '#fff',
                  fontSize: '11px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {asset.name}
                </div>
                {asset.usageCount > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    left: '4px',
                    padding: '2px 6px',
                    background: '#4472C4',
                    color: '#fff',
                    fontSize: '10px',
                    borderRadius: '8px'
                  }}>
                    ×{asset.usageCount}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid #e5e7eb',
        fontSize: '11px',
        color: '#9ca3af',
        textAlign: 'center'
      }}>
        共 {assets.length} 个素材 · 点击素材插入画布
      </div>
    </div>
  );
};
