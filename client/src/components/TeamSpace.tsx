import React, { useState, useEffect } from 'react';
import { Team, Board } from '../types';
import { teamApi, boardApi, templateApi } from '../services/api';
import { useWhiteboardStore } from '../store/whiteboard';
import { TeamMemberModal } from './TeamMemberModal';
import { TemplateCenter } from './TemplateCenter';

interface TeamSpaceProps {
  teamId: string;
  onBack: () => void;
  onBoardSelect: (board: Board) => void;
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-CN');
};

const getRandomGradient = (index: number): string => {
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  ];
  return gradients[index % gradients.length];
};

export const TeamSpace: React.FC<TeamSpaceProps> = ({ teamId, onBack, onBoardSelect }) => {
  const [team, setTeam] = useState<Team | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [isTemplateCenterOpen, setIsTemplateCenterOpen] = useState(false);
  const { username, unreadNotificationCount, showNotificationPanel, setShowNotificationPanel } = useWhiteboardStore((state) => ({
    username: state.username,
    unreadNotificationCount: state.unreadNotificationCount,
    showNotificationPanel: state.showNotificationPanel,
    setShowNotificationPanel: state.setShowNotificationPanel,
  }));

  const userId = 'user-1';

  useEffect(() => {
    loadTeamData();
  }, [teamId]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const [teamData, boardData] = await Promise.all([
        teamApi.getTeam(teamId),
        boardApi.getBoards(userId, teamId),
      ]);
      setTeam(teamData);
      setBoards(boardData);
    } catch (error) {
      console.error('Failed to load team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async (name: string, templateId?: string) => {
    try {
      let newBoard: Board | null = null;
      if (templateId) {
        newBoard = await templateApi.createBoardFromTemplate(templateId, { name, ownerId: userId, teamId });
      } else {
        newBoard = await boardApi.createBoard({ name, ownerId: userId, teamId });
      }
      if (newBoard) {
        await loadTeamData();
        onBoardSelect(newBoard);
      }
    } catch (error) {
      console.error('Failed to create board:', error);
      alert('创建白板失败，请重试');
    }
  };

  const handleAddMember = async (memberIds: string[]) => {
    if (!team) return;
    try {
      const updated = await teamApi.addMembers(team._id, memberIds);
      setTeam(updated);
    } catch (error) {
      console.error('Failed to add member:', error);
      alert('添加成员失败');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!team) return;
    try {
      const updated = await teamApi.removeMember(team._id, memberId);
      setTeam(updated);
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('移除成员失败');
    }
  };

  const handleAddAdmin = async (adminIds: string[]) => {
    if (!team) return;
    try {
      const updated = await teamApi.addAdmins(team._id, adminIds);
      setTeam(updated);
    } catch (error) {
      console.error('Failed to add admin:', error);
      alert('设置管理员失败');
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    if (!team) return;
    try {
      const updated = await teamApi.removeAdmin(team._id, adminId);
      setTeam(updated);
    } catch (error) {
      console.error('Failed to remove admin:', error);
      alert('移除管理员失败');
    }
  };

  if (loading && !team) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>加载中...</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '16px' }}>团队不存在</p>
          <button
            onClick={onBack}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              color: '#667eea',
              background: 'rgba(102, 126, 234, 0.1)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={onBack}
              style={{
                width: '36px',
                height: '36px',
                border: 'none',
                background: '#f3f4f6',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
              }}
            >
              ←
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: team.avatarColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                {team.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a' }}>
                  {team.name}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {team.members.length} 位成员
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setShowMemberModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              成员管理
            </button>
            <button
              onClick={() => setIsTemplateCenterOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#fff',
                background: '#667eea',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              新建白板
            </button>
            <button
              onClick={() => setShowNotificationPanel(!showNotificationPanel)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                fontSize: '18px',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              🔔
              {unreadNotificationCount > 0 && (
                <span
                  style={{
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
                  }}
                >
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </span>
              )}
            </button>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
              }}
            >
              {username.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px' }}>
        <div
          style={{
            background: team.avatarColor,
            borderRadius: '16px',
            padding: '40px',
            marginBottom: '32px',
            color: '#fff',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
            {team.name}
          </h1>
          {team.description && (
            <p style={{ margin: 0, fontSize: '15px', opacity: 0.9 }}>
              {team.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: '24px', marginTop: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700 }}>{boards.length}</div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>白板总数</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700 }}>{team.members.length}</div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>团队成员</div>
            </div>
          </div>
        </div>

        <section>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: '#1a1a1a',
              }}
            >
              团队白板
              <span
                style={{
                  marginLeft: '8px',
                  fontSize: '13px',
                  color: '#6b7280',
                  background: '#f3f4f6',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                {boards.length}
              </span>
            </h2>
          </div>

          {loading ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '20px',
              }}
            >
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: '12px',
                    height: '200px',
                    background: '#e5e7eb',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              ))}
            </div>
          ) : boards.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '64px 16px',
                color: '#6b7280',
                background: '#fff',
                borderRadius: '12px',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 20px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="9" y1="9" x2="15" y2="9" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1a1a1a' }}>
                还没有团队白板
              </p>
              <p style={{ margin: '8px 0 24px', fontSize: '14px', color: '#6b7280' }}>
                创建第一个白板，开始团队协作
              </p>
              <button
                onClick={() => setIsTemplateCenterOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#fff',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                创建白板
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '20px',
              }}
            >
              {boards.map((board, index) => (
                <div
                  key={board._id}
                  onClick={() => onBoardSelect(board)}
                  style={{
                    background: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                  }}
                >
                  <div
                    style={{
                      height: '120px',
                      background: board.backgroundColor || getRandomGradient(index),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        color: '#fff',
                        fontSize: '24px',
                        fontWeight: 600,
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                      }}
                    >
                      {board.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div style={{ padding: '16px' }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#1a1a1a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {board.name}
                    </h3>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '8px',
                        fontSize: '12px',
                        color: '#6b7280',
                      }}
                    >
                      <span>{formatDate(board.updatedAt)}</span>
                      {board.collaborators.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          <span>{board.collaborators.length + 1}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <TeamMemberModal
        isOpen={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        team={team}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        onAddAdmin={handleAddAdmin}
        onRemoveAdmin={handleRemoveAdmin}
      />

      <TemplateCenter
        isOpen={isTemplateCenterOpen}
        onClose={() => setIsTemplateCenterOpen(false)}
        onCreate={handleCreateBoard}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};
