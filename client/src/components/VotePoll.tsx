import React, { useState } from 'react';
import { Poll } from '../types';
import { useWhiteboardStore } from '../store/whiteboard';

interface VotePollProps {
  poll: Poll;
  onClose?: () => void;
}

export const VotePoll: React.FC<VotePollProps> = ({ poll, onClose }) => {
  const { votePoll, closePoll, deletePoll, canEdit } = useWhiteboardStore();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
  const currentUserId = 'user-id';
  const hasVoted = poll.options.some(opt => opt.votes.includes(currentUserId));

  const handleOptionClick = (optionId: string) => {
    if (poll.closed || loading) return;

    if (poll.isMultipleChoice) {
      setSelectedOptions(prev =>
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const handleVote = async () => {
    if (selectedOptions.length === 0 || loading) return;
    setLoading(true);
    await votePoll(poll.id, poll.isMultipleChoice ? selectedOptions : selectedOptions[0]);
    setLoading(false);
  };

  const handleClosePoll = async (closed: boolean) => {
    if (actionLoading) return;
    setActionLoading('close');
    await closePoll(poll.id, closed);
    setActionLoading(null);
  };

  const handleDelete = async () => {
    if (!confirm('确定删除这个投票吗？') || actionLoading) return;
    setActionLoading('delete');
    await deletePoll(poll.id);
    setActionLoading(null);
    if (onClose) onClose();
  };

  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{
      position: 'absolute',
      left: poll.x,
      top: poll.y,
      width: '320px',
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      overflow: 'hidden',
      zIndex: 100,
      userSelect: 'none'
    }}>
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
              {poll.question}
            </h4>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>
              {poll.author} · {formatDate(poll.createdAt)}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: 1
              }}
            >
              ×
            </button>
          )}
        </div>
        {poll.closed && (
          <div style={{
            marginTop: '8px',
            display: 'inline-block',
            padding: '2px 8px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '12px',
            fontSize: '12px'
          }}>
            已结束
          </div>
        )}
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '12px' }}>
          {poll.options.map((option) => {
            const percentage = getPercentage(option.votes.length);
            const isSelected = selectedOptions.includes(option.id);
            const userVoted = option.votes.includes(currentUserId);

            return (
              <div
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
                style={{
                  position: 'relative',
                  padding: '12px',
                  marginBottom: '8px',
                  border: `2px solid ${isSelected || userVoted ? '#667eea' : '#e0e0e0'}`,
                  borderRadius: '8px',
                  cursor: poll.closed ? 'default' : 'pointer',
                  background: isSelected || userVoted ? '#f0f0ff' : '#fff',
                  transition: 'all 0.2s'
                }}
              >
                {(hasVoted || poll.closed) && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${percentage}%`,
                    background: 'rgba(102, 126, 234, 0.1)',
                    borderRadius: '6px',
                    transition: 'width 0.3s ease'
                  }} />
                )}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: poll.isMultipleChoice ? '4px' : '50%',
                      border: `2px solid ${isSelected || userVoted ? '#667eea' : '#ccc'}`,
                      background: isSelected || userVoted ? '#667eea' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '12px'
                    }}>
                      {(isSelected || userVoted) && '✓'}
                    </div>
                    <span style={{ fontSize: '14px', color: '#333' }}>{option.text}</span>
                  </div>
                  {(hasVoted || poll.closed) && (
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#667eea' }}>
                      {percentage}% ({option.votes.length})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
          共 {totalVotes} 票 · {poll.isMultipleChoice ? '多选' : '单选'}
        </div>

        {!hasVoted && !poll.closed && selectedOptions.length > 0 && (
          <button
            onClick={handleVote}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? '提交中...' : '投票'}
          </button>
        )}

        {canEdit && (
          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #f0f0f0'
          }}>
            <button
              onClick={() => handleClosePoll(!poll.closed)}
              disabled={actionLoading === 'close'}
              style={{
                flex: 1,
                padding: '8px',
                background: poll.closed ? '#4CAF50' : '#ff9800',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: actionLoading === 'close' ? 'not-allowed' : 'pointer'
              }}
            >
              {poll.closed ? '重新开启' : '结束投票'}
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading === 'delete'}
              style={{
                padding: '8px 16px',
                background: '#f44336',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: actionLoading === 'delete' ? 'not-allowed' : 'pointer'
              }}
            >
              删除
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
