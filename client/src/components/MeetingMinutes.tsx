import React, { useState, useMemo, useCallback } from 'react';
import { useWhiteboardStore } from '../store/whiteboard';
import { extractMeetingContent, generateMarkdownMinutes, generatePlainTextMinutes, downloadFile, copyToClipboard, sanitizeFilename } from '../utils/meetingMinutes';
import { MeetingMinutesContent } from '../types';

type ExportFormat = 'markdown' | 'txt';

export const MeetingMinutes: React.FC = () => {
  const { board, showMeetingMinutes, setShowMeetingMinutes } = useWhiteboardStore();
  const [editedContent, setEditedContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('markdown');
  const [copySuccess, setCopySuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const meetingContent = useMemo<MeetingMinutesContent | null>(() => {
    if (!board) return null;
    return extractMeetingContent(board);
  }, [board, refreshKey]);

  const generatedContent = useMemo(() => {
    if (!meetingContent) return '';
    return exportFormat === 'markdown' 
      ? generateMarkdownMinutes(meetingContent)
      : generatePlainTextMinutes(meetingContent);
  }, [meetingContent, exportFormat]);

  const displayContent = isEditing ? editedContent : generatedContent;

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    setIsEditing(false);
    setEditedContent('');
  }, []);

  const handleEdit = () => {
    setEditedContent(generatedContent);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedContent('');
    setIsEditing(false);
  };

  const handleExport = useCallback(() => {
    if (!board) return;
    
    const content = isEditing ? editedContent : generatedContent;
    const sanitizedName = sanitizeFilename(board.name || '会议纪要');
    const dateStr = new Date().toISOString().slice(0, 10);
    const ext = exportFormat === 'markdown' ? 'md' : 'txt';
    const filename = `${sanitizedName}_会议纪要_${dateStr}.${ext}`;
    const mimeType = exportFormat === 'markdown' ? 'text/markdown' : 'text/plain';
    
    downloadFile(content, filename, mimeType);
    
    setExportSuccess(filename);
    setTimeout(() => setExportSuccess(null), 4000);
  }, [board, isEditing, editedContent, generatedContent, exportFormat]);

  const handleCopy = async () => {
    const content = isEditing ? editedContent : generatedContent;
    const success = await copyToClipboard(content);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const stats = useMemo(() => {
    if (!meetingContent) return { texts: 0, stickyNotes: 0, comments: 0 };
    return {
      texts: meetingContent.texts.length,
      stickyNotes: meetingContent.stickyNotes.length,
      comments: meetingContent.comments.length
    };
  }, [meetingContent]);

  const totalItems = stats.texts + stats.stickyNotes + stats.comments;

  if (!showMeetingMinutes) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '12px',
      right: '12px',
      width: '440px',
      maxHeight: 'calc(100vh - 24px)',
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 1000
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>📋</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>会议纪要</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', opacity: 0.85 }}>
              自动汇总白板内容，共 {totalItems} 项
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={handleRefresh}
            title="刷新内容"
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#fff',
              padding: '6px 8px',
              borderRadius: '6px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
          >
            🔄
          </button>
          <button
            onClick={() => setShowMeetingMinutes(false)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#fff',
              padding: '6px 10px',
              borderRadius: '6px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
          >
            ×
          </button>
        </div>
      </div>

      {exportSuccess && (
        <div style={{
          padding: '10px 16px',
          background: '#e8f5e9',
          borderBottom: '1px solid #c8e6c9',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: '#2e7d32',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <span>✅</span>
          <span>导出成功！文件已保存为 <strong>{exportSuccess}</strong></span>
        </div>
      )}

      <div style={{
        padding: '12px 20px',
        background: '#f8f9fa',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        gap: '20px',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666' }}>
          <span style={{ fontSize: '14px' }}>📝</span>
          <span>文本 <strong style={{ color: '#333' }}>{stats.texts}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666' }}>
          <span style={{ fontSize: '14px' }}>📌</span>
          <span>便签 <strong style={{ color: '#333' }}>{stats.stickyNotes}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666' }}>
          <span style={{ fontSize: '14px' }}>💬</span>
          <span>讨论 <strong style={{ color: '#333' }}>{stats.comments}</strong></span>
        </div>
      </div>

      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span style={{ fontSize: '13px', color: '#666', fontWeight: 500 }}>导出格式:</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => { setExportFormat('markdown'); setIsEditing(false); }}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 500,
              border: '1px solid',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: exportFormat === 'markdown' ? '#667eea' : '#fff',
              color: exportFormat === 'markdown' ? '#fff' : '#666',
              borderColor: exportFormat === 'markdown' ? '#667eea' : '#ddd'
            }}
          >
            Markdown (.md)
          </button>
          <button
            onClick={() => { setExportFormat('txt'); setIsEditing(false); }}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 500,
              border: '1px solid',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: exportFormat === 'txt' ? '#667eea' : '#fff',
              color: exportFormat === 'txt' ? '#fff' : '#666',
              borderColor: exportFormat === 'txt' ? '#667eea' : '#ddd'
            }}
          >
            纯文本 (.txt)
          </button>
        </div>
        <div style={{ flex: 1 }} />
        {!isEditing ? (
          <button
            onClick={handleEdit}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 500,
              border: '1px solid #ddd',
              borderRadius: '6px',
              background: '#fff',
              color: '#666',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { 
              e.currentTarget.style.background = '#f5f5f5';
              e.currentTarget.style.borderColor = '#ccc';
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.borderColor = '#ddd';
            }}
          >
            ✏️ 编辑
          </button>
        ) : (
          <>
            <button
              onClick={handleSaveEdit}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 500,
                border: '1px solid #4caf50',
                borderRadius: '6px',
                background: '#4caf50',
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              ✓ 保存
            </button>
            <button
              onClick={handleCancelEdit}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 500,
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: '#fff',
                color: '#666',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.background = '#f5f5f5';
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.background = '#fff';
              }}
            >
              取消
            </button>
          </>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {totalItems === 0 && !isEditing ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            textAlign: 'center',
            color: '#999'
          }}>
            <span style={{ fontSize: '48px', marginBottom: '12px' }}>📝</span>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 500, color: '#666' }}>
              白板上还没有内容
            </p>
            <p style={{ margin: 0, fontSize: '12px' }}>
              添加文本、便签或评论后，点击 🔄 刷新按钮生成会议纪要
            </p>
          </div>
        ) : isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '320px',
              padding: '14px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '13px',
              lineHeight: '1.7',
              fontFamily: "'SF Mono', 'Monaco', 'Consolas', monospace",
              resize: 'none',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#667eea'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#ddd'; }}
            placeholder="在此编辑会议纪要内容..."
          />
        ) : (
          <pre style={{
            margin: 0,
            padding: '16px',
            background: '#fafafa',
            border: '1px solid #eee',
            borderRadius: '8px',
            fontSize: '13px',
            lineHeight: '1.7',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            color: '#333',
            minHeight: '320px',
            fontFamily: "'SF Mono', 'Monaco', 'Consolas', monospace"
          }}>
            {displayContent}
          </pre>
        )}
      </div>

      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid #e0e0e0',
        background: '#fafafa',
        display: 'flex',
        gap: '10px'
      }}>
        <button
          onClick={handleCopy}
          style={{
            flex: 1,
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 600,
            border: '1px solid #ddd',
            borderRadius: '8px',
            background: copySuccess ? '#4caf50' : '#fff',
            color: copySuccess ? '#fff' : '#333',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => { 
            if (!copySuccess) {
              e.currentTarget.style.background = '#f5f5f5';
            }
          }}
          onMouseLeave={(e) => { 
            if (!copySuccess) {
              e.currentTarget.style.background = '#fff';
            }
          }}
        >
          {copySuccess ? '✓ 已复制到剪贴板' : '📋 复制内容'}
        </button>
        <button
          onClick={handleExport}
          disabled={totalItems === 0 && !isEditing}
          style={{
            flex: 1,
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            borderRadius: '8px',
            background: totalItems === 0 && !isEditing 
              ? '#ccc' 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            cursor: totalItems === 0 && !isEditing ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => { 
            if (!(totalItems === 0 && !isEditing)) {
              e.currentTarget.style.opacity = '0.9';
            }
          }}
          onMouseLeave={(e) => { 
            if (!(totalItems === 0 && !isEditing)) {
              e.currentTarget.style.opacity = '1';
            }
          }}
        >
          ⬇️ 导出文件
        </button>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
