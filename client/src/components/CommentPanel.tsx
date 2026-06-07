import React, { useState } from 'react';
import { useWhiteboardStore } from '../store/whiteboard';

export const CommentPanel: React.FC = () => {
  const {
    board,
    selectedCommentId,
    setSelectedCommentId,
    setShowCommentPanel,
    addReplyToComment,
    resolveComment,
    deleteComment,
    username,
    canEdit
  } = useWhiteboardStore();

  const [replyContent, setReplyContent] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [resolveLoading, setResolveLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const comments = board?.comments || [];
  const activeComments = comments.filter(c => !c.resolved || showResolved);
  const selectedComment = comments.find(c => c.id === selectedCommentId);

  const handleAddReply = async () => {
    if (!selectedComment || !replyContent.trim() || !canEdit || replyLoading) return;
    
    setReplyLoading(true);
    
    const replyData = {
      content: replyContent.trim(),
      author: username,
      authorId: username,
    };
    
    await addReplyToComment(selectedComment.id, replyData);
    
    setReplyContent('');
    setReplyLoading(false);
  };

  const handleResolve = async (commentId: string, resolved: boolean) => {
    if (resolveLoading) return;
    
    setResolveLoading(commentId);
    await resolveComment(commentId, resolved);
    setResolveLoading(null);
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('确定删除这条评论吗？') || deleteLoading) return;
    
    setDeleteLoading(commentId);
    await deleteComment(commentId);
    setDeleteLoading(null);
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
      top: '12px',
      right: '12px',
      width: '320px',
      maxHeight: 'calc(100vh - 24px)',
      background: '#fff',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 1000
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>评论</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '12px', color: '#666', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              style={{ marginRight: '4px' }}
            />
            显示已解决
          </label>
          <button
            onClick={() => setShowCommentPanel(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#999'
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeComments.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#999' }}>
            暂无评论，选择评论工具在画布上点击添加评论
          </div>
        ) : (
            <div style={{ padding: '8px' }}>
              {activeComments.map((comment) => (
                <div
                  key={comment.id}
                  onClick={() => setSelectedCommentId(comment.id)}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    border: selectedCommentId === comment.id 
                      ? '2px solid #2196f3' 
                      : '1px solid #e0e0e0',
                    background: comment.resolved ? '#f5f5f5' : '#fff',
                    opacity: deleteLoading === comment.id ? 0.5 : 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>{comment.author}</span>
                        {comment.isGuest && (
                          <span style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            background: '#9e9e9e',
                            color: '#fff',
                            borderRadius: '8px'
                          }}>
                            访客
                          </span>
                        )}
                        <span style={{ fontSize: '12px', color: '#999' }}>{formatDate(comment.createdAt)}</span>
                        {comment.resolved && (
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            background: '#4caf50',
                            color: '#fff',
                            borderRadius: '10px'
                          }}>
                            已解决
                          </span>
                        )}
                        {deleteLoading === comment.id && (
                          <span style={{ fontSize: '11px', color: '#999' }}>删除中...</span>
                        )}
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#333' }}>{comment.content}</p>
                      {comment.replies.length > 0 && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                          {comment.replies.length} 条回复
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
        )}
      </div>

      {selectedComment && (
        <div style={{
          borderTop: '1px solid #e0e0e0',
          maxHeight: '40%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>评论详情</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {canEdit && (
                <>
                  <button
                    onClick={() => handleResolve(selectedComment.id, !selectedComment.resolved)}
                    disabled={resolveLoading === selectedComment.id}
                    style={{
                      padding: '4px 10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      background: resolveLoading === selectedComment.id 
                        ? '#e0e0e0' 
                        : selectedComment.resolved ? '#fff' : '#4caf50',
                      color: resolveLoading === selectedComment.id 
                        ? '#999' 
                        : selectedComment.resolved ? '#666' : '#fff',
                      cursor: resolveLoading === selectedComment.id ? 'not-allowed' : 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {resolveLoading === selectedComment.id 
                      ? '处理中...' 
                      : selectedComment.resolved ? '重新打开' : '标记解决'}
                  </button>
                  <button
                    onClick={() => handleDelete(selectedComment.id)}
                    disabled={deleteLoading === selectedComment.id}
                    style={{
                      padding: '4px 10px',
                      border: '1px solid #ffcdd2',
                      borderRadius: '4px',
                      background: deleteLoading === selectedComment.id ? '#f5f5f5' : '#fff',
                      color: deleteLoading === selectedComment.id ? '#999' : '#f44336',
                      cursor: deleteLoading === selectedComment.id ? 'not-allowed' : 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {deleteLoading === selectedComment.id ? '删除中...' : '删除'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '13px' }}>{selectedComment.author}</span>
                {selectedComment.isGuest && (
                  <span style={{
                    fontSize: '10px',
                    padding: '1px 5px',
                    background: '#9e9e9e',
                    color: '#fff',
                    borderRadius: '8px'
                  }}>
                    访客
                  </span>
                )}
                <span style={{ fontSize: '11px', color: '#999' }}>{formatDate(selectedComment.createdAt)}</span>
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>{selectedComment.content}</p>
            </div>

            {selectedComment.replies.length > 0 && (
              <div style={{ borderLeft: '2px solid #e0e0e0', paddingLeft: '12px' }}>
                {selectedComment.replies.map((reply) => (
                <div key={reply.id} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600, fontSize: '12px' }}>{reply.author}</span>
                    {reply.isGuest && (
                      <span style={{
                        fontSize: '9px',
                        padding: '0px 4px',
                        background: '#9e9e9e',
                        color: '#fff',
                        borderRadius: '6px'
                      }}>
                        访客
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: '#999' }}>{formatDate(reply.createdAt)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#555' }}>{reply.content}</p>
                </div>
              ))}
              </div>
            )}
          </div>

          {canEdit && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="输入回复内容..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddReply()}
                  disabled={replyLoading}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '13px',
                    outline: 'none',
                    opacity: replyLoading ? 0.6 : 1
                  }}
                />
                <button
                  onClick={handleAddReply}
                  disabled={!replyContent.trim() || replyLoading}
                  style={{
                    padding: '8px 16px',
                    background: replyContent.trim() && !replyLoading ? '#2196f3' : '#e0e0e0',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: replyContent.trim() && !replyLoading ? 'pointer' : 'not-allowed',
                    fontSize: '13px'
                  }}
                >
                  {replyLoading ? '发送中...' : '回复'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
