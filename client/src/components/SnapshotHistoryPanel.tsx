import React, { useState, useEffect } from 'react';
import { useWhiteboardStore } from '../store/whiteboard';
import { Snapshot } from '../types';

export const SnapshotHistoryPanel: React.FC = () => {
  const {
    showSnapshotHistory,
    snapshots,
    canEdit,
    board,
    setShowSnapshotHistory,
    loadSnapshots,
    createSnapshot,
    restoreSnapshot,
    updateSnapshot,
    deleteSnapshot
  } = useWhiteboardStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [newSnapshotDesc, setNewSnapshotDesc] = useState('');
  const [editingSnapshotId, setEditingSnapshotId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (showSnapshotHistory && board) {
      loadSnapshots();
    }
  }, [showSnapshotHistory, board]);

  const handleCreateSnapshot = async () => {
    if (!canEdit) return;
    const snapshot = await createSnapshot(newSnapshotName || undefined, newSnapshotDesc || undefined);
    if (snapshot) {
      setShowCreateModal(false);
      setNewSnapshotName('');
      setNewSnapshotDesc('');
    }
  };

  const handleRestore = async (snapshotId: string) => {
    if (!canEdit) return;
    if (restoringId) return;
    if (!window.confirm('确定要恢复到此快照版本吗？当前未保存的更改将会丢失。')) {
      return;
    }
    setRestoringId(snapshotId);
    try {
      await restoreSnapshot(snapshotId);
    } finally {
      setRestoringId(null);
    }
  };

  const handleStartEdit = (snapshot: Snapshot) => {
    setEditingSnapshotId(snapshot.id);
    setEditName(snapshot.name);
    setEditDescription(snapshot.description || '');
  };

  const handleSaveEdit = async () => {
    if (editingSnapshotId) {
      await updateSnapshot(editingSnapshotId, {
        name: editName,
        description: editDescription
      });
    }
    setEditingSnapshotId(null);
  };

  const handleDelete = async (snapshotId: string) => {
    if (!canEdit) return;
    if (!window.confirm('确定要删除此快照吗？此操作不可撤销。')) {
      return;
    }
    await deleteSnapshot(snapshotId);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!showSnapshotHistory) {
    return null;
  }

  return (
    <div style={{
      position: 'absolute',
      right: '12px',
      top: '12px',
      width: '340px',
      maxHeight: 'calc(100vh - 24px)',
      background: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>📸 快照历史</h3>
        <button
          onClick={() => setShowSnapshotHistory(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px 8px',
            borderRadius: '4px'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        gap: '8px'
      }}>
        {canEdit && (
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              flex: 1,
              padding: '10px',
              background: '#667eea',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            + 创建快照
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {snapshots.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#999',
            fontSize: '14px'
          }}>
            暂无快照记录<br />
            点击"创建快照"保存当前版本
          </div>
        ) : (
          [...snapshots].reverse().map((snapshot, index) => (
            <div
              key={snapshot.id}
              style={{
                padding: '12px',
                marginBottom: '8px',
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '6px'
              }}
            >
              {editingSnapshotId === snapshot.id ? (
                <div>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="快照名称"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      marginBottom: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                  <textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    placeholder="快照描述（可选）"
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      marginBottom: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleSaveEdit}
                      style={{
                        flex: 1,
                        padding: '6px',
                        background: '#667eea',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingSnapshotId(null)}
                      style={{
                        flex: 1,
                        padding: '6px',
                        background: '#9ca3af',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px'
                  }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                      {snapshots.length - index}. {snapshot.name}
                    </span>
                  </div>
                  {snapshot.description && (
                    <div style={{
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '8px',
                      lineHeight: 1.4
                    }}>
                      {snapshot.description}
                    </div>
                  )}
                  <div style={{
                    fontSize: '11px',
                    color: '#999',
                    marginBottom: '10px'
                  }}>
                    🕐 {formatDate(snapshot.createdAt)} · 👤 {snapshot.createdBy}
                  </div>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleRestore(snapshot.id)}
                        disabled={restoringId === snapshot.id}
                        style={{
                          flex: 1,
                          padding: '5px',
                          background: restoringId === snapshot.id ? '#d1d5db' : '#dcfce7',
                          color: '#166534',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: restoringId === snapshot.id ? 'wait' : 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        {restoringId === snapshot.id ? '恢复中...' : '↩️ 恢复'}
                      </button>
                      <button
                        onClick={() => handleStartEdit(snapshot)}
                        style={{
                          flex: 1,
                          padding: '5px',
                          background: '#e0e7ff',
                          color: '#4338ca',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        ✏️ 编辑
                      </button>
                      <button
                        onClick={() => handleDelete(snapshot.id)}
                        style={{
                          flex: 1,
                          padding: '5px',
                          background: '#fee2e2',
                          color: '#991b1b',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        🗑️ 删除
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      {snapshots.length > 0 && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #eee',
          fontSize: '12px',
          color: '#666',
          textAlign: 'center'
        }}>
          共 {snapshots.length} 个快照
        </div>
      )}

      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowCreateModal(false)}>
          <div style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '400px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>创建快照</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#333' }}>
                快照名称
              </label>
              <input
                type="text"
                value={newSnapshotName}
                onChange={e => setNewSnapshotName(e.target.value)}
                placeholder={`快照 ${snapshots.length + 1}`}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#333' }}>
                描述（可选）
              </label>
              <textarea
                value={newSnapshotDesc}
                onChange={e => setNewSnapshotDesc(e.target.value)}
                placeholder="记录此快照的关键变更..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#f3f4f6',
                  color: '#333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                取消
              </button>
              <button
                onClick={handleCreateSnapshot}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#667eea',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
