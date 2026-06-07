import React, { useState } from 'react';
import { useWhiteboardStore } from '../store/whiteboard';
import { NoteGroup } from '../types';

export const NoteGroupPanel: React.FC = () => {
  const {
    board,
    noteGroups,
    showNoteGroupPanel,
    setShowNoteGroupPanel,
    autoGroupNotes,
    autoArrangeGroups,
    clearAllGroups,
    deleteNoteGroup,
    updateNoteGroup,
    toggleGroupCollapse,
    groupingSimilarityThreshold,
    setGroupingSimilarityThreshold,
    canEdit
  } = useWhiteboardStore();

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const stickyNoteCount = board?.layers.reduce((count, layer) => {
    return count + layer.elements.filter(el => el.type === 'sticky-note').length;
  }, 0) || 0;

  const groupedCount = noteGroups.reduce((count, group) => count + group.elementIds.length, 0);

  if (!showNoteGroupPanel) return null;

  const handleStartEdit = (group: NoteGroup) => {
    setEditingGroupId(group.id);
    setEditTitle(group.title);
  };

  const handleSaveEdit = (groupId: string) => {
    if (editTitle.trim()) {
      updateNoteGroup(groupId, { title: editTitle.trim() });
    }
    setEditingGroupId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, groupId: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(groupId);
    } else if (e.key === 'Escape') {
      setEditingGroupId(null);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      width: '320px',
      maxHeight: '80vh',
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
          📁 便签分组
        </h3>
        <button
          onClick={() => setShowNoteGroupPanel(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            color: '#6b7280',
            padding: '4px 8px',
            borderRadius: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ marginBottom: '12px', fontSize: '13px', color: '#6b7280' }}>
          共 <strong style={{ color: '#1f2937' }}>{stickyNoteCount}</strong> 个便签，
          已分组 <strong style={{ color: '#10b981' }}>{groupedCount}</strong> 个
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
            相似度阈值: {(groupingSimilarityThreshold * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0"
            max="0.8"
            step="0.05"
            value={groupingSimilarityThreshold}
            onChange={(e) => setGroupingSimilarityThreshold(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={autoGroupNotes}
            disabled={!canEdit || stickyNoteCount < 2}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: canEdit && stickyNoteCount >= 2 ? '#667eea' : '#d1d5db',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: canEdit && stickyNoteCount >= 2 ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              fontWeight: 500,
              minWidth: '100px'
            }}
          >
            🤖 自动分组
          </button>
          <button
            onClick={autoArrangeGroups}
            disabled={!canEdit || noteGroups.length === 0}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: canEdit && noteGroups.length > 0 ? '#10b981' : '#d1d5db',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: canEdit && noteGroups.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              fontWeight: 500,
              minWidth: '100px'
            }}
          >
            📐 整齐排列
          </button>
        </div>

        {noteGroups.length > 0 && (
          <button
            onClick={clearAllGroups}
            disabled={!canEdit}
            style={{
              width: '100%',
              marginTop: '8px',
              padding: '6px 12px',
              background: 'transparent',
              color: '#ef4444',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              cursor: canEdit ? 'pointer' : 'not-allowed',
              fontSize: '12px'
            }}
          >
            清除全部分组
          </button>
        )}
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 20px'
      }}>
        {noteGroups.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#9ca3af',
            fontSize: '13px'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📝</div>
            <div>点击「自动分组」</div>
            <div>智能整理您的便签</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {noteGroups.map((group) => (
              <div
                key={group.id}
                style={{
                  background: group.color,
                  borderRadius: '8px',
                  padding: '12px',
                  border: '1px solid rgba(0,0,0,0.05)'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  {editingGroupId === group.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleSaveEdit(group.id)}
                      onKeyDown={(e) => handleKeyDown(e, group.id)}
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '13px',
                        marginRight: '8px'
                      }}
                    />
                  ) : (
                    <span
                      onClick={() => canEdit && handleStartEdit(group)}
                      style={{
                        fontWeight: 600,
                        fontSize: '14px',
                        color: '#1f2937',
                        cursor: canEdit ? 'pointer' : 'default',
                        flex: 1
                      }}
                    >
                      {group.title}
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => toggleGroupCollapse(group.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        color: '#6b7280'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {group.collapsed ? '📂' : '📁'}
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => deleteNoteGroup(group.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          color: '#ef4444'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {group.elementIds.length} 个便签
                </div>
                {!group.collapsed && board && (
                  <div style={{
                    marginTop: '8px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px'
                  }}>
                    {group.elementIds.map(elementId => {
                      const element = board.layers
                        .flatMap(l => l.elements)
                        .find(el => el.id === elementId);
                      return element ? (
                        <div
                          key={elementId}
                          style={{
                            fontSize: '11px',
                            padding: '4px 8px',
                            background: 'rgba(255,255,255,0.8)',
                            borderRadius: '4px',
                            color: '#374151',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={element.text}
                        >
                          {(element.text || '').substring(0, 20) || '便签'}
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
