import React, { useState, useEffect, useRef } from 'react';
import { useWhiteboardStore } from '../store/whiteboard';

interface AddCommentModalProps {
  position: { x: number; y: number };
  targetType: 'element' | 'canvas';
  targetId: string | null;
  onClose: () => void;
}

export const AddCommentModal: React.FC<AddCommentModalProps> = ({
  position,
  targetType,
  targetId,
  onClose
}) => {
  const { addComment, username, canvasTransform, setSelectedCommentId, setShowCommentPanel } = useWhiteboardStore();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    
    setSubmitting(true);
    
    const commentData = {
      targetType,
      targetId,
      x: position.x,
      y: position.y,
      content: content.trim(),
      author: username,
      authorId: username,
    };

    const savedComment = await addComment(commentData);
    
    if (savedComment) {
      setSelectedCommentId(savedComment.id);
      setShowCommentPanel(true);
    }
    
    setSubmitting(false);
    onClose();
  };

  const modalX = position.x * canvasTransform.scale + canvasTransform.translateX;
  const modalY = position.y * canvasTransform.scale + canvasTransform.translateY;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.1)',
        zIndex: 2000,
        cursor: 'default'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: Math.min(modalX, window.innerWidth - 300),
          top: Math.min(modalY, window.innerHeight - 200),
          width: '280px',
          background: '#fff',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          padding: '16px'
        }}
      >
        <div style={{ marginBottom: '12px', fontWeight: 600, fontSize: '14px' }}>
          {targetType === 'element' ? '对元素添加评论' : '对画布添加评论'}
        </div>
        <textarea
          ref={inputRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="输入评论内容..."
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmit();
            }
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '6px 14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: '#fff',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              opacity: submitting ? 0.6 : 1
            }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRadius: '4px',
              background: content.trim() && !submitting ? '#2196f3' : '#e0e0e0',
              color: '#fff',
              cursor: content.trim() && !submitting ? 'pointer' : 'not-allowed',
              fontSize: '13px'
            }}
          >
            {submitting ? '发送中...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
};
