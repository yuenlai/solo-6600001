import React, { useState, useEffect } from 'react';
import { BoardElement, TaskCardData, TaskStatus } from '../types';
import { useWhiteboardStore } from '../store/whiteboard';

interface TaskCardProps {
  element: BoardElement;
  scale: number;
  translateX: number;
  translateY: number;
}

const statusColors: Record<TaskStatus, string> = {
  'todo': '#9ca3af',
  'in-progress': '#3b82f6',
  'done': '#22c55e',
};

const statusLabels: Record<TaskStatus, string> = {
  'todo': '待办',
  'in-progress': '进行中',
  'done': '已完成',
};

const priorityColors = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};

const priorityLabels = {
  low: '低',
  medium: '中',
  high: '高',
};

export const TaskCard: React.FC<TaskCardProps> = ({ element, scale, translateX, translateY }) => {
  const { updateTaskCard, setSelectedTaskCardId, setShowTaskCardEditor, canEdit } = useWhiteboardStore();

  const taskData = element.taskData || { title: '新任务', status: 'todo' as TaskStatus };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    setSelectedTaskCardId(element.id);
    setShowTaskCardEditor(true);
  };

  const handleStatusChange = (e: React.MouseEvent, status: TaskStatus) => {
    e.stopPropagation();
    if (!canEdit) return;
    updateTaskCard(element.id, { status });
  };

  const cardWidth = (element.width || 240) * scale;
  const cardHeight = (element.height || 140) * scale;

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: element.x * scale + translateX,
        top: element.y * scale + translateY,
        width: cardWidth,
        minHeight: cardHeight,
        background: '#ffffff',
        borderRadius: 8 * scale,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        border: `2px solid ${statusColors[taskData.status]}`,
        cursor: canEdit ? 'pointer' : 'default',
        zIndex: 10,
        overflow: 'hidden',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        if (canEdit) {
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      }}
    >
      <div
        style={{
          padding: `${8 * scale}px ${12 * scale}px`,
          background: statusColors[taskData.status],
          color: '#fff',
          fontSize: 12 * scale,
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{statusLabels[taskData.status]}</span>
        {taskData.priority && (
          <span
            style={{
              background: priorityColors[taskData.priority as keyof typeof priorityColors],
              padding: `${2 * scale}px ${6 * scale}px`,
              borderRadius: 10 * scale,
              fontSize: 10 * scale,
            }}
          >
            {priorityLabels[taskData.priority as keyof typeof priorityLabels]}优先级
          </span>
        )}
      </div>

      <div style={{ padding: `${10 * scale}px ${12 * scale}px` }}>
        <div
          style={{
            fontSize: 14 * scale,
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: 6 * scale,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {taskData.title || '未命名任务'}
        </div>

        {taskData.description && (
          <div
            style={{
              fontSize: 12 * scale,
              color: '#6b7280',
              marginBottom: 8 * scale,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {taskData.description}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11 * scale,
            color: '#9ca3af',
          }}
        >
          {taskData.assignee && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 * scale }}>
              <div
                style={{
                  width: 16 * scale,
                  height: 16 * scale,
                  borderRadius: '50%',
                  background: '#667eea',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9 * scale,
                  fontWeight: 600,
                }}
              >
                {taskData.assignee.charAt(0).toUpperCase()}
              </div>
              <span>{taskData.assignee}</span>
            </div>
          )}
          {taskData.dueDate && (
            <span>📅 {taskData.dueDate}</span>
          )}
        </div>
      </div>

      {canEdit && (
        <div
          style={{
            display: 'flex',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          {(['todo', 'in-progress', 'done'] as TaskStatus[]).map((status) => (
            <button
              key={status}
              onClick={(e) => handleStatusChange(e, status)}
              style={{
                flex: 1,
                padding: `${6 * scale}px`,
                border: 'none',
                background: taskData.status === status ? statusColors[status] + '20' : 'transparent',
                color: statusColors[status],
                fontSize: 10 * scale,
                cursor: 'pointer',
                transition: 'background 0.15s',
                borderRight: status !== 'done' ? '1px solid #e5e7eb' : 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = statusColors[status] + '30';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = taskData.status === status ? statusColors[status] + '20' : 'transparent';
              }}
            >
              {statusLabels[status]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface TaskCardEditorProps {
  onClose: () => void;
}

export const TaskCardEditor: React.FC<TaskCardEditorProps> = ({ onClose }) => {
  const { board, selectedTaskCardId, updateTaskCard } = useWhiteboardStore();
  const [editData, setEditData] = useState<TaskCardData>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignee: '',
    dueDate: '',
  });

  useEffect(() => {
    if (board && selectedTaskCardId) {
      for (const layer of board.layers) {
        const element = layer.elements.find(el => el.id === selectedTaskCardId);
        if (element && element.taskData) {
          setEditData(element.taskData);
          break;
        }
      }
    }
  }, [board, selectedTaskCardId]);

  const handleSave = () => {
    if (selectedTaskCardId) {
      updateTaskCard(selectedTaskCardId, editData);
    }
    onClose();
  };

  if (!selectedTaskCardId) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          width: 400,
          maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 600, color: '#1f2937' }}>
          编辑任务卡片
        </h3>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
            任务标题
          </label>
          <input
            type="text"
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            placeholder="输入任务标题"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
            任务描述
          </label>
          <textarea
            value={editData.description || ''}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            placeholder="输入任务描述"
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 14,
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              状态
            </label>
            <select
              value={editData.status}
              onChange={(e) => setEditData({ ...editData, status: e.target.value as TaskStatus })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            >
              <option value="todo">待办</option>
              <option value="in-progress">进行中</option>
              <option value="done">已完成</option>
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              优先级
            </label>
            <select
              value={editData.priority || 'medium'}
              onChange={(e) => setEditData({ ...editData, priority: e.target.value as 'low' | 'medium' | 'high' })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              负责人
            </label>
            <input
              type="text"
              value={editData.assignee || ''}
              onChange={(e) => setEditData({ ...editData, assignee: e.target.value })}
              placeholder="输入负责人名称"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              截止日期
            </label>
            <input
              type="date"
              value={editData.dueDate || ''}
              onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              background: '#fff',
              borderRadius: 6,
              fontSize: 14,
              cursor: 'pointer',
              color: '#374151',
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              borderRadius: 6,
              fontSize: 14,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
