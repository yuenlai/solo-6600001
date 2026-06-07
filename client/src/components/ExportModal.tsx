import React from 'react';
import { useWhiteboardStore } from '../store/whiteboard';
import { exportPresets } from '../utils/exportImage';

export const ExportModal: React.FC = () => {
  const {
    showExportModal,
    setShowExportModal,
    exportScale,
    setExportScale,
    exportFormat,
    setExportFormat,
    exportQuality,
    setExportQuality,
    includePollsInExport,
    setIncludePollsInExport,
    exportBoard,
    isExporting,
  } = useWhiteboardStore();

  if (!showExportModal) return null;

  const scaleOptions = [
    { value: exportPresets.standard.scale, label: exportPresets.standard.label },
    { value: exportPresets.high.scale, label: exportPresets.high.label },
    { value: exportPresets.ultra.scale, label: exportPresets.ultra.label },
  ];

  const handleExport = async () => {
    await exportBoard();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowExportModal(false);
        }
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '24px',
          width: '400px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
            📷 导出高清长图
          </h2>
          <button
            onClick={() => setShowExportModal(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>
            分辨率
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {scaleOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setExportScale(option.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `2px solid ${exportScale === option.value ? '#667eea' : '#e5e7eb'}`,
                  background: exportScale === option.value ? '#eef2ff' : '#fff',
                  color: exportScale === option.value ? '#667eea' : '#374151',
                  cursor: 'pointer',
                  fontWeight: exportScale === option.value ? 600 : 400,
                  fontSize: '13px',
                  transition: 'all 0.2s',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>
            图片格式
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setExportFormat('png')}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '8px',
                border: `2px solid ${exportFormat === 'png' ? '#667eea' : '#e5e7eb'}`,
                background: exportFormat === 'png' ? '#eef2ff' : '#fff',
                color: exportFormat === 'png' ? '#667eea' : '#374151',
                cursor: 'pointer',
                fontWeight: exportFormat === 'png' ? 600 : 400,
                fontSize: '13px',
                transition: 'all 0.2s',
              }}
            >
              PNG (无损)
            </button>
            <button
              onClick={() => setExportFormat('jpeg')}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '8px',
                border: `2px solid ${exportFormat === 'jpeg' ? '#667eea' : '#e5e7eb'}`,
                background: exportFormat === 'jpeg' ? '#eef2ff' : '#fff',
                color: exportFormat === 'jpeg' ? '#667eea' : '#374151',
                cursor: 'pointer',
                fontWeight: exportFormat === 'jpeg' ? 600 : 400,
                fontSize: '13px',
                transition: 'all 0.2s',
              }}
            >
              JPEG (小文件)
            </button>
          </div>
        </div>

        {exportFormat === 'jpeg' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>
              图片质量: {Math.round(exportQuality * 100)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={exportQuality}
              onChange={(e) => setExportQuality(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includePollsInExport}
              onChange={(e) => setIncludePollsInExport(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            <span style={{ color: '#374151', fontSize: '14px' }}>包含投票内容</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowExportModal(false)}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              background: '#fff',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: isExporting ? '#a5b4fc' : '#667eea',
              color: '#fff',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'background 0.2s',
            }}
          >
            {isExporting ? '导出中...' : '开始导出'}
          </button>
        </div>

        <div style={{ marginTop: '16px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', lineHeight: '1.5' }}>
            💡 提示：选择更高的分辨率可以获得更清晰的图片，但文件大小也会相应增加。
            超清 (4x) 分辨率适合打印或大型展示。
          </p>
        </div>
      </div>
    </div>
  );
};
