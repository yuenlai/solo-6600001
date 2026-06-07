import React from 'react';
import { useWhiteboardStore } from '../store/whiteboard';
import { Notification } from '../types';

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'invite':
      return '📩';
    case 'comment':
      return '💬';
    case 'task-assign':
      return '📋';
    case 'reply':
      return '↩️';
    default:
      return '🔔';
  }
};

const getNotificationTypeLabel = (type: Notification['type']) => {
  switch (type) {
    case 'invite':
      return '邀请';
    case 'comment':
      return '评论';
    case 'task-assign':
      return '任务';
    case 'reply':
      return '回复';
    default:
      return '通知';
  }
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
};

export const NotificationPanel: React.FC = () => {
  const {
    showNotificationPanel,
    setShowNotificationPanel,
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
  } = useWhiteboardStore();

  const userId = 'user-1';

  if (!showNotificationPanel) return null;

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }
    if (notification.linkData && notification.boardId) {
      console.log('Navigate to:', notification.boardId, notification.linkData);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead(userId);
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 998,
        }}
        onClick={() => setShowNotificationPanel(false)}
      />
      <div
        style={{
          position: 'fixed',
          top: '60px',
          right: '16px',
          width: '380px',
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 100px)',
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🔔</span>
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                color: '#1a1a1a',
              }}
            >
              消息通知
            </h3>
            {unreadNotificationCount > 0 && (
              <span
                style={{
                  background: '#f44336',
                  color: '#fff',
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: 500,
                }}
              >
                {unreadNotificationCount} 条未读
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {unreadNotificationCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: '#667eea',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#eff6ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                全部已读
              </button>
            )}
            <button
              onClick={() => setShowNotificationPanel(false)}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            maxHeight: '500px',
          }}
        >
          {notifications.length === 0 ? (
            <div
              style={{
                padding: '60px 20px',
                textAlign: 'center',
                color: '#6b7280',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
              <p style={{ margin: 0, fontSize: '14px' }}>暂无消息通知</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    background: notification.read ? '#fff' : '#f9fafb',
                    transition: 'background 0.2s',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = notification.read ? '#f9fafb' : '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = notification.read ? '#fff' : '#f9fafb';
                  }}
                >
                  {!notification.read && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#3b82f6',
                      }}
                    />
                  )}
                  <div style={{ display: 'flex', gap: '12px', paddingLeft: notification.read ? '0' : '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        flexShrink: 0,
                      }}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#eff6ff',
                            color: '#667eea',
                          }}
                        >
                          {getNotificationTypeLabel(notification.type)}
                        </span>
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>
                      <h4
                        style={{
                          margin: '0 0 4px 0',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#1a1a1a',
                          lineHeight: 1.4,
                        }}
                      >
                        {notification.title}
                      </h4>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          color: '#4b5563',
                          lineHeight: 1.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {notification.content}
                      </p>
                      <div
                        style={{
                          marginTop: '6px',
                          fontSize: '12px',
                          color: '#6b7280',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>来自</span>
                        <span style={{ fontWeight: 500, color: '#374151' }}>{notification.fromUser}</span>
                        <span>·</span>
                        <span>{notification.boardName}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, notification.id)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#9ca3af',
                        flexShrink: 0,
                        opacity: 0,
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.color = '#ef4444';
                        e.currentTarget.style.background = '#fef2f2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0';
                        e.currentTarget.style.color = '#9ca3af';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
