import React, { useState, useEffect } from 'react';
import { Board, SharePermission } from '../types';
import { boardApi } from '../services/api';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board | null;
  onBoardUpdate?: (board: Board) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, board, onBoardUpdate }) => {
  const [permission, setPermission] = useState<SharePermission>('view');
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (isOpen && board) {
      setPermission(board.sharePermission || 'view');
      setIsSharing(board.isShared || false);
      if (board.isShared && board.shareToken) {
        setShareUrl(`${window.location.origin}/share/${board.shareToken}`);
      } else {
        setShareUrl('');
      }
      setError(null);
      setCopied(false);
    }
  }, [isOpen, board]);

  if (!isOpen || !board) return null;

  const handleGenerateLink = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setError(null);
      const result = await boardApi.shareBoard(board._id, permission);
      setShareUrl(result.shareUrl);
      setIsSharing(true);
      if (onBoardUpdate) {
        onBoardUpdate(result.board);
      }
    } catch (err) {
      console.error('Failed to generate share link:', err);
      setError('生成分享链接失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = async (newPermission: SharePermission) => {
    setPermission(newPermission);
    if (isSharing && board.shareToken) {
      try {
        setLoading(true);
        setError(null);
        const updatedBoard = await boardApi.updateSharePermission(board._id, newPermission);
        if (onBoardUpdate) {
          onBoardUpdate(updatedBoard);
        }
      } catch (err) {
        console.error('Failed to update permission:', err);
        setError('更新权限失败，请重试');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRevokeShare = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setError(null);
      await boardApi.revokeShare(board._id);
      setIsSharing(false);
      setShareUrl('');
      if (onBoardUpdate) {
        const updatedBoard = { ...board, isShared: false, shareToken: null };
        onBoardUpdate(updatedBoard);
      }
    } catch (err) {
      console.error('Failed to revoke share:', err);
      setError('取消分享失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: '480px',
          maxWidth: '95vw',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '24px 24px 0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ flex: 1 }}>
            <h2
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 600,
                color: '#1a1a1a',
              }}
            >
              分享白板
            </h2>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: '14px',
                color: '#6b7280',
              }}
            >
              生成链接邀请他人协作或查看
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              访问权限
            </label>
            <div
              style={{
                display: 'flex',
                gap: '8px',
              }}
            >
              <button
                type="button"
                onClick={() => handlePermissionChange('view')}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  borderRadius: '8px',
                  border: '2px solid',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  background: permission === 'view' ? '#eff6ff' : '#fff',
                  borderColor: permission === 'view' ? '#667eea' : '#e5e7eb',
                  color: permission === 'view' ? '#667eea' : '#374151',
                  opacity: loading ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading && permission !== 'view') {
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && permission !== 'view') {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  仅查看
                </div>
              </button>
              <button
                type="button"
                onClick={() => handlePermissionChange('edit')}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  borderRadius: '8px',
                  border: '2px solid',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  background: permission === 'edit' ? '#eff6ff' : '#fff',
                  borderColor: permission === 'edit' ? '#667eea' : '#e5e7eb',
                  color: permission === 'edit' ? '#667eea' : '#374151',
                  opacity: loading ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading && permission !== 'edit') {
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && permission !== 'edit') {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  可编辑
                </div>
              </button>
            </div>
          </div>

          {!isSharing ? (
            <button
              onClick={handleGenerateLink}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#fff',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'opacity 0.2s',
                opacity: loading ? 0.8 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.opacity = '1';
              }}
            >
              {loading && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M4 12a8 8 0 018-8" />
                </svg>
              )}
              {loading ? '生成中...' : '生成分享链接'}
            </button>
          ) : (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                分享链接
              </label>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    fontSize: '13px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#374151',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleCopyLink}
                  disabled={loading}
                  style={{
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: copied ? '#059669' : '#667eea',
                    background: copied ? '#ecfdf5' : '#eff6ff',
                    border: '1px solid',
                    borderColor: copied ? '#6ee7b7' : '#bfdbfe',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!copied) e.currentTarget.style.background = '#dbeafe';
                  }}
                  onMouseLeave={(e) => {
                    if (!copied) e.currentTarget.style.background = '#eff6ff';
                  }}
                >
                  {copied ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      已复制
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      复制
                    </>
                  )}
                </button>
              </div>
              <button
                onClick={handleRevokeShare}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#dc2626',
                  background: '#fff',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: loading ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.background = '#fef2f2';
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.background = '#fff';
                }}
              >
                取消分享
              </button>
            </div>
          )}
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};
