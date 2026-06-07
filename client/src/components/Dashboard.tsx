import React, { useState, useEffect } from 'react';
import { Board, Team } from '../types';
import { boardApi, templateApi, teamApi } from '../services/api';
import { useWhiteboardStore } from '../store/whiteboard';
import { TemplateCenter } from './TemplateCenter';
import { CreateTeamModal } from './CreateTeamModal';

interface DashboardProps {
  onBoardSelect: (board: Board) => void;
  onTeamSelect: (teamId: string) => void;
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

const BoardCard: React.FC<{
  board: Board;
  index: number;
  onClick: () => void;
}> = ({ board, index, onClick }) => {
  return (
    <div
      onClick={onClick}
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
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ onBoardSelect, onTeamSelect }) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTemplateCenterOpen, setIsTemplateCenterOpen] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [showWelcomeTip, setShowWelcomeTip] = useState(false);
  const { username, unreadNotificationCount, showNotificationPanel, setShowNotificationPanel } = useWhiteboardStore((state) => ({
    username: state.username,
    unreadNotificationCount: state.unreadNotificationCount,
    showNotificationPanel: state.showNotificationPanel,
    setShowNotificationPanel: state.setShowNotificationPanel,
  }));

  const userId = 'user-1';

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (!loading && boards.length === 0) {
      const hasSeenWelcome = localStorage.getItem('has_seen_welcome');
      if (!hasSeenWelcome) {
        setIsTemplateCenterOpen(true);
        setShowWelcomeTip(true);
        localStorage.setItem('has_seen_welcome', 'true');
      }
    }
  }, [loading, boards]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [boardsData, teamsData] = await Promise.all([
        boardApi.getBoards(userId),
        teamApi.getTeams(userId),
      ]);
      setBoards(boardsData);
      setTeams(teamsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (name: string, description: string) => {
    try {
      const newTeam = await teamApi.createTeam({ name, description, ownerId: userId });
      setTeams((prev) => [newTeam, ...prev]);
    } catch (error) {
      console.error('Failed to create team:', error);
      throw error;
    }
  };

  const handleCreateBoard = async (name: string, templateId?: string) => {
    try {
      let newBoard: Board | null = null;
      if (templateId) {
        newBoard = await templateApi.createBoardFromTemplate(templateId, { name, ownerId: userId });
      } else {
        newBoard = await boardApi.createBoard({ name, ownerId: userId });
      }
      if (newBoard) {
        await loadAllData();
        onBoardSelect(newBoard);
      } else {
        throw new Error('Failed to create board');
      }
    } catch (error) {
      console.error('Failed to create board:', error);
      alert('创建白板失败，请重试');
    }
  };

  const myBoards = boards.filter((b) => b.ownerId === userId);
  const sharedBoards = boards.filter((b) => b.ownerId !== userId);
  const recentBoards = [...boards].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const SectionHeader: React.FC<{ title: string; count?: number }> = ({ title, count }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
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
        {title}
      </h2>
      {count !== undefined && (
        <span
          style={{
            fontSize: '13px',
            color: '#6b7280',
            background: '#f3f4f6',
            padding: '2px 8px',
            borderRadius: '10px',
          }}
        >
          {count}
        </span>
      )}
    </div>
  );

  const BoardGrid: React.FC<{ boards: Board[]; loading?: boolean; onOpenTemplate?: () => void }> = ({ boards: boardList, loading, onOpenTemplate }) => {
    if (loading) {
      return (
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
      );
    }

    if (boardList.length === 0) {
      return (
        <div
          style={{
            textAlign: 'center',
            padding: '64px 16px',
            color: '#6b7280',
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
          <p style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1a1a1a' }}>开始你的第一个白板</p>
          <p style={{ margin: '8px 0 24px', fontSize: '14px', color: '#6b7280' }}>
            选择模板快速开始，或创建空白白板自由创作
          </p>
          <button
            onClick={onOpenTemplate}
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
            从模板开始
          </button>
        </div>
      );
    }

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px',
        }}
      >
        {boardList.map((board, index) => (
          <BoardCard
            key={board._id}
            board={board}
            index={index}
            onClick={() => onBoardSelect(board)}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f9fafb',
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <header
        style={{
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 32px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="9" x2="15" y2="9" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#1a1a1a',
              }}
            >
              协作白板
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#5a67d8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#667eea';
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
                transition: 'background 0.2s',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
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
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
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
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '40px',
            marginBottom: '40px',
            color: '#fff',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 700,
              marginBottom: '8px',
            }}
          >
            欢迎回来，{username}
          </h1>
          <p style={{ margin: 0, fontSize: '15px', opacity: 0.9 }}>
            继续你的创作，或者开始一个新的白板
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              onClick={() => setIsTemplateCenterOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#667eea',
                background: '#fff',
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
          </div>
        </div>

        <section style={{ marginBottom: '40px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <SectionHeader title="我的团队" count={loading ? undefined : teams.length} />
            <button
              onClick={() => setIsCreateTeamOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#667eea',
                background: 'rgba(102, 126, 234, 0.1)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              创建团队
            </button>
          </div>

          {loading ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {[1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: '12px',
                    height: '120px',
                    background: '#e5e7eb',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              ))}
            </div>
          ) : teams.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 16px',
                background: '#fff',
                borderRadius: '12px',
                border: '2px dashed #d1d5db',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  margin: '0 auto 12px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 500, color: '#1a1a1a' }}>
                还没有团队空间
              </p>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280' }}>
                创建团队，和成员一起协作管理白板
              </p>
              <button
                onClick={() => setIsCreateTeamOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#fff',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                创建团队
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {teams.map((team) => (
                <div
                  key={team._id}
                  onClick={() => onTeamSelect(team._id)}
                  style={{
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '20px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: team.avatarColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '20px',
                        fontWeight: 600,
                      }}
                    >
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
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
                        {team.name}
                      </h3>
                      <p
                        style={{
                          margin: '4px 0 0',
                          fontSize: '12px',
                          color: '#6b7280',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {team.description || '暂无描述'}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#6b7280' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      {team.members.length} 成员
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="9" x2="15" y2="9" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                      {boards.filter((b) => b.teamId === team._id).length} 白板
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ marginBottom: '40px' }}>
          <SectionHeader title="最近编辑" count={loading ? undefined : recentBoards.length} />
          <BoardGrid 
            boards={recentBoards.slice(0, 8)} 
            loading={loading && boards.length === 0}
            onOpenTemplate={() => setIsTemplateCenterOpen(true)}
          />
        </section>

        <section style={{ marginBottom: '40px' }}>
          <SectionHeader title="我创建的" count={loading ? undefined : myBoards.length} />
          <BoardGrid 
            boards={myBoards} 
            loading={loading && boards.length === 0}
            onOpenTemplate={() => setIsTemplateCenterOpen(true)}
          />
        </section>

        <section>
          <SectionHeader title="我参与的" count={loading ? undefined : sharedBoards.length} />
          <BoardGrid 
            boards={sharedBoards} 
            loading={loading && boards.length === 0}
            onOpenTemplate={() => setIsTemplateCenterOpen(true)}
          />
        </section>
      </main>

      <TemplateCenter
        isOpen={isTemplateCenterOpen}
        onClose={() => {
          setIsTemplateCenterOpen(false);
          setShowWelcomeTip(false);
        }}
        onCreate={handleCreateBoard}
        showWelcome={showWelcomeTip}
      />

      <CreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        onCreate={handleCreateTeam}
      />
    </div>
  );
};
