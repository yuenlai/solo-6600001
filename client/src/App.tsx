import React, { useState, useEffect } from 'react';
import { WhiteboardCanvas } from './components/WhiteboardCanvas';
import { Toolbar } from './components/Toolbar';
import { LayerPanel } from './components/LayerPanel';
import { CursorOverlay } from './components/CursorOverlay';
import { Dashboard } from './components/Dashboard';
import { ShareModal } from './components/ShareModal';
import { PresentationPanel } from './components/PresentationPanel';
import { MeetingMinutes } from './components/MeetingMinutes';
import { SnapshotHistoryPanel } from './components/SnapshotHistoryPanel';
import { SearchPanel } from './components/SearchPanel';
import { NotificationPanel } from './components/NotificationPanel';
import { useWhiteboardStore } from './store/whiteboard';
import { socketService } from './services/socket';
import { boardApi } from './services/api';
import { Board, BoardElement, CursorPosition, Layer, CanvasTransform, ViewType, Comment, CommentReply, Notification } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [loadingSharedBoard, setLoadingSharedBoard] = useState(false);
  const {
    board, setBoard, updateCursor, removeCursor, setCursors, username,
    canEdit, setCanEdit, setIsShareAccess, showCommentPanel, setShowCommentPanel,
    loadComments, setHostInfo, applyHostView, stopFollowingHost,
    isHost, followState, loadNotifications, loadUnreadCount,
    addNotification, unreadNotificationCount, showNotificationPanel,
    setShowNotificationPanel
  } = useWhiteboardStore();

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
      const token = path.replace('/share/', '');
      loadSharedBoard(token);
    }
  }, []);

  useEffect(() => {
    const userId = 'user-1';
    loadNotifications(userId);
    loadUnreadCount(userId);
  }, [currentView]);

  const loadSharedBoard = async (token: string) => {
    try {
      setLoadingSharedBoard(true);
      const board = await boardApi.getSharedBoard(token);
      if (board) {
        setActiveBoard(board);
        setCurrentView('board');
        setIsShareAccess(true);
        setCanEdit(board.sharePermission === 'edit');
        window.history.replaceState({}, '', '/');
      } else {
        alert('该分享链接不存在或已失效');
      }
    } catch (error) {
      console.error('Failed to load shared board:', error);
      alert('加载分享白板失败');
    } finally {
      setLoadingSharedBoard(false);
    }
  };

  useEffect(() => {
    if (currentView === 'board' && activeBoard) {
      setBoard(activeBoard);
      loadComments(activeBoard._id);

      socketService.connect();
      
      const userId = useWhiteboardStore.getState().isShareAccess
        ? `guest_${Math.random().toString(36).substr(2, 6)}`
        : 'user-1';
      
      socketService.joinBoard(
        activeBoard._id, 
        username, 
        userId,
        useWhiteboardStore.getState().isShareAccess
      );

      socketService.onUserJoined((data) => {
        console.log(`${data.username} 加入了白板`);
      });
      socketService.onUserLeft((data) => {
        removeCursor(data.socketId);
      });
      socketService.onActiveUsers((users) => {
        setCursors(users);
      });
      socketService.onCursorUpdate((data: CursorPosition) => {
        updateCursor(data);
      });
      socketService.onElementAdded((data: { element: BoardElement; layerIndex: number }) => {
        const { board: currentBoard } = useWhiteboardStore.getState();
        if (currentBoard) {
          const layers = [...currentBoard.layers];
          layers[data.layerIndex] = {
            ...layers[data.layerIndex],
            elements: [...layers[data.layerIndex].elements, data.element]
          };
          setBoard({ ...currentBoard, layers });
        }
      });
      socketService.onElementUpdated((data: { elementId: string; updates: Partial<BoardElement>; layerIndex: number }) => {
        const { board: currentBoard } = useWhiteboardStore.getState();
        if (currentBoard) {
          const layers = [...currentBoard.layers];
          let targetLayerIndex = data.layerIndex;
          if (targetLayerIndex < 0 || targetLayerIndex >= layers.length || !layers[targetLayerIndex].elements.find(el => el.id === data.elementId)) {
            for (let i = 0; i < layers.length; i++) {
              if (layers[i].elements.find(el => el.id === data.elementId)) {
                targetLayerIndex = i;
                break;
              }
            }
          }
          if (targetLayerIndex >= 0 && targetLayerIndex < layers.length) {
            const elements = layers[targetLayerIndex].elements.map(el =>
              el.id === data.elementId ? { ...el, ...data.updates } : el
            );
            layers[targetLayerIndex] = { ...layers[targetLayerIndex], elements };
            setBoard({ ...currentBoard, layers });
          }
        }
      });
      socketService.onElementDeleted((data: { elementId: string; layerIndex: number }) => {
        const { board: currentBoard } = useWhiteboardStore.getState();
        if (currentBoard) {
          const layers = [...currentBoard.layers];
          let targetLayerIndex = data.layerIndex;
          if (targetLayerIndex < 0 || targetLayerIndex >= layers.length || !layers[targetLayerIndex].elements.find(el => el.id === data.elementId)) {
            for (let i = 0; i < layers.length; i++) {
              if (layers[i].elements.find(el => el.id === data.elementId)) {
                targetLayerIndex = i;
                break;
              }
            }
          }
          if (targetLayerIndex >= 0 && targetLayerIndex < layers.length) {
            const elements = layers[targetLayerIndex].elements.filter(el => el.id !== data.elementId);
            layers[targetLayerIndex] = { ...layers[targetLayerIndex], elements };
            setBoard({ ...currentBoard, layers });
          }
        }
      });
      socketService.onTaskCardUpdated((data: { elementId: string; taskData: any; layerIndex: number }) => {
        const { board: currentBoard } = useWhiteboardStore.getState();
        if (currentBoard) {
          const layers = [...currentBoard.layers];
          let targetLayerIndex = data.layerIndex;
          if (targetLayerIndex < 0 || targetLayerIndex >= layers.length || !layers[targetLayerIndex].elements.find(el => el.id === data.elementId)) {
            for (let i = 0; i < layers.length; i++) {
              if (layers[i].elements.find(el => el.id === data.elementId)) {
                targetLayerIndex = i;
                break;
              }
            }
          }
          if (targetLayerIndex >= 0 && targetLayerIndex < layers.length) {
            const elements = layers[targetLayerIndex].elements.map(el =>
              el.id === data.elementId ? { ...el, taskData: { ...el.taskData, ...data.taskData } } : el
            );
            layers[targetLayerIndex] = { ...layers[targetLayerIndex], elements };
            setBoard({ ...currentBoard, layers });
          }
        }
      });
      socketService.onLayersUpdated((data: { layers: Layer[] }) => {
        const { board: currentBoard } = useWhiteboardStore.getState();
        if (currentBoard) {
          setBoard({ ...currentBoard, layers: data.layers });
        }
      });
      socketService.onCanvasTransformed((data: { transform: CanvasTransform }) => {
        useWhiteboardStore.getState().setCanvasTransform(data.transform);
      });
      socketService.onPermissionUpdate((data) => {
        setCanEdit(data.canEdit);
      });
      socketService.onCommentAdded((data: { comment: Comment }) => {
        const { board: currentBoard } = useWhiteboardStore.getState();
        if (currentBoard) {
          const comments = [...(currentBoard.comments || []), data.comment];
          setBoard({ ...currentBoard, comments });
        }
      });
      socketService.onCommentUpdated((data: { commentId: string; updates: Partial<Comment> }) => {
        const { board: currentBoard } = useWhiteboardStore.getState();
        if (currentBoard) {
          const comments = (currentBoard.comments || []).map(c =>
            c.id === data.commentId ? { ...c, ...data.updates } : c
          );
          setBoard({ ...currentBoard, comments });
        }
      });
      socketService.onReplyAdded((data: { commentId: string; reply: CommentReply }) => {
        const { board: currentBoard } = useWhiteboardStore.getState();
        if (currentBoard) {
          const comments = (currentBoard.comments || []).map(c => {
            if (c.id === data.commentId) {
              return { ...c, replies: [...c.replies, data.reply] };
            }
            return c;
          });
          setBoard({ ...currentBoard, comments });
        }
      });
      socketService.onCommentResolved((data: { commentId: string; resolved: boolean }) => {
        const { board: currentBoard } = useWhiteboardStore.getState();
        if (currentBoard) {
          const comments = (currentBoard.comments || []).map(c =>
            c.id === data.commentId ? { ...c, resolved: data.resolved } : c
          );
          setBoard({ ...currentBoard, comments });
        }
      });
      socketService.onCommentDeleted((data: { commentId: string }) => {
        const { board: currentBoard } = useWhiteboardStore.getState();
        if (currentBoard) {
          const comments = (currentBoard.comments || []).filter(c => c.id !== data.commentId);
          setBoard({ ...currentBoard, comments });
        }
      });
      socketService.onSnapshotRestored((data: { layers: Layer[] }) => {
        const { board: currentBoard } = useWhiteboardStore.getState();
        if (currentBoard) {
          setBoard({ ...currentBoard, layers: data.layers });
        }
      });
      socketService.onHostUpdated((hostInfo) => {
        setHostInfo(hostInfo);
        if (!hostInfo) {
          const { followState } = useWhiteboardStore.getState();
          if (followState.isFollowing) {
            stopFollowingHost();
          }
        }
      });
      socketService.onHostViewUpdated((data: { hostSocketId: string; transform: CanvasTransform }) => {
        applyHostView(data.transform);
      });
      socketService.onError((data) => {
        console.warn('Socket error:', data.message);
      });

      socketService.onNotification((notification: Notification) => {
        addNotification(notification);
      });

      return () => {
        socketService.disconnect();
      };
    }
  }, [currentView, activeBoard]);

  const handleBoardSelect = (boardItem: Board) => {
    setActiveBoard(boardItem);
    setCurrentView('board');
    setCanEdit(true);
    setIsShareAccess(false);
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setActiveBoard(null);
    setCanEdit(true);
    setIsShareAccess(false);
  };

  const handleBoardUpdate = (updatedBoard: Board) => {
    setActiveBoard(updatedBoard);
    setBoard(updatedBoard);
  };

  if (loadingSharedBoard) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f9fafb',
      }}>
        <div style={{ textAlign: 'center' }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#667eea"
            strokeWidth="2"
            style={{ animation: 'spin 1s linear infinite' }}
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M4 12a8 8 0 018-8" />
          </svg>
          <p style={{ marginTop: '16px', color: '#6b7280', fontSize: '14px' }}>正在加载分享白板...</p>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (currentView === 'dashboard') {
    return (
      <>
        <Dashboard onBoardSelect={handleBoardSelect} />
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          board={activeBoard}
          onBoardUpdate={handleBoardUpdate}
        />
        <NotificationPanel />
      </>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <div style={{
        height: '48px',
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '12px',
      }}>
        <button
          onClick={handleBackToDashboard}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#374151',
            background: '#f3f4f6',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          返回工作台
        </button>
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#1a1a1a',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          {activeBoard?.name}
          {!canEdit && (
            <span style={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#6b7280',
              background: '#f3f4f6',
              padding: '2px 8px',
              borderRadius: '10px',
            }}>
              只读模式
            </span>
          )}
          {isHost && (
            <span style={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#fff',
              background: '#4caf50',
              padding: '2px 8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              🎤 主持人模式
            </span>
          )}
          {followState.isFollowing && (
            <span style={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#fff',
              background: '#2196f3',
              padding: '2px 8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
            onClick={stopFollowingHost}
            title="点击取消跟随"
            >
              👁️ 跟随 {followState.hostUsername}
            </span>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowCommentPanel(!showCommentPanel)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: 500,
            color: showCommentPanel ? '#fff' : '#374151',
            background: showCommentPanel ? '#2196f3' : '#f3f4f6',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!showCommentPanel) {
              e.currentTarget.style.background = '#e5e7eb';
            }
          }}
          onMouseLeave={(e) => {
            if (!showCommentPanel) {
              e.currentTarget.style.background = '#f3f4f6';
            }
          }}
        >
          💬
          评论
          {(() => {
            const unresolvedCount = board?.comments?.filter((c) => !c.resolved).length || 0;
            return unresolvedCount > 0 ? (
              <span style={{
                background: '#f44336',
                color: '#fff',
                borderRadius: '10px',
                padding: '0 6px',
                fontSize: '11px',
                minWidth: '18px',
                textAlign: 'center'
              }}>
                {unresolvedCount}
              </span>
            ) : null;
          })()}
        </button>
        <button
          onClick={() => setShowNotificationPanel(!showNotificationPanel)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: 500,
            color: showNotificationPanel ? '#fff' : '#374151',
            background: showNotificationPanel ? '#f59e0b' : '#f3f4f6',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            if (!showNotificationPanel) {
              e.currentTarget.style.background = '#e5e7eb';
            }
          }}
          onMouseLeave={(e) => {
            if (!showNotificationPanel) {
              e.currentTarget.style.background = '#f3f4f6';
            }
          }}
        >
          🔔
          通知
          {unreadNotificationCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#f44336',
              color: '#fff',
              borderRadius: '10px',
              padding: '0 6px',
              fontSize: '10px',
              fontWeight: 600,
              minWidth: '18px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}>
              {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
            </span>
          )}
        </button>
        {!useWhiteboardStore.getState().isShareAccess && (
          <button
            onClick={() => setIsShareModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#fff',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            分享
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {canEdit && <Toolbar />}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <WhiteboardCanvas />
          <CursorOverlay />
          <PresentationPanel />
          <MeetingMinutes />
          <SnapshotHistoryPanel />
          <SearchPanel />
        </div>
        {canEdit && <LayerPanel />}
      </div>
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        board={activeBoard}
        onBoardUpdate={handleBoardUpdate}
      />
      <NotificationPanel />
    </div>
  );
};

export default App;
