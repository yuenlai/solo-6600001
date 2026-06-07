import React, { useState } from 'react';
import { Team } from '../types';

interface TeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  onAddMember: (memberIds: string[]) => void;
  onRemoveMember: (memberId: string) => void;
  onAddAdmin: (adminIds: string[]) => void;
  onRemoveAdmin: (adminId: string) => void;
}

const mockUsers = [
  { id: 'user-1', name: '张三', email: 'zhangsan@example.com' },
  { id: 'user-2', name: '李四', email: 'lisi@example.com' },
  { id: 'user-3', name: '王五', email: 'wangwu@example.com' },
  { id: 'user-4', name: '赵六', email: 'zhaoliu@example.com' },
  { id: 'user-5', name: '钱七', email: 'qianqi@example.com' },
];

export const TeamMemberModal: React.FC<TeamMemberModalProps> = ({
  isOpen,
  onClose,
  team,
  onAddMember,
  onRemoveMember,
  onAddAdmin,
  onRemoveAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'admins'>('members');
  const [newMemberEmail, setNewMemberEmail] = useState('');

  if (!isOpen || !team) return null;

  const getUserName = (userId: string) => {
    const user = mockUsers.find((u) => u.id === userId);
    return user?.name || userId;
  };

  const getUserAvatar = (userId: string) => {
    const user = mockUsers.find((u) => u.id === userId);
    return user?.name.charAt(0).toUpperCase() || userId.charAt(0).toUpperCase();
  };

  const isOwner = (userId: string) => team.ownerId === userId;
  const isAdmin = (userId: string) => team.admins.includes(userId) || isOwner(userId);

  const handleAddMember = () => {
    const user = mockUsers.find((u) => u.email === newMemberEmail);
    if (user && !team.members.includes(user.id)) {
      onAddMember([user.id]);
      setNewMemberEmail('');
    } else if (!user) {
      alert('未找到该用户');
    }
  };

  const MemberItem: React.FC<{ userId: string }> = ({ userId }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#f9fafb',
        borderRadius: '8px',
        marginBottom: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          {getUserAvatar(userId)}
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a' }}>
            {getUserName(userId)}
            {isOwner(userId) && (
              <span
                style={{
                  marginLeft: '8px',
                  fontSize: '12px',
                  color: '#667eea',
                  background: 'rgba(102, 126, 234, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                创建者
              </span>
            )}
            {isAdmin(userId) && !isOwner(userId) && (
              <span
                style={{
                  marginLeft: '8px',
                  fontSize: '12px',
                  color: '#f59e0b',
                  background: 'rgba(245, 158, 11, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                管理员
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {mockUsers.find((u) => u.id === userId)?.email || ''}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {!isOwner(userId) && !isAdmin(userId) && activeTab === 'members' && (
          <button
            onClick={() => onAddAdmin([userId])}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              color: '#f59e0b',
              background: 'rgba(245, 158, 11, 0.1)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            设为管理员
          </button>
        )}
        {!isOwner(userId) && isAdmin(userId) && activeTab === 'admins' && (
          <button
            onClick={() => onRemoveAdmin(userId)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              color: '#6b7280',
              background: '#e5e7eb',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            移除管理员
          </button>
        )}
        {!isOwner(userId) && (
          <button
            onClick={() => onRemoveMember(userId)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              color: '#ef4444',
              background: 'rgba(239, 68, 68, 0.1)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            移除
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '80vh',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.16)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '24px 24px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1a1a1a' }}>
            团队成员管理
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              border: 'none',
              background: '#f3f4f6',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e5e7eb',
            padding: '0 24px',
            marginTop: '20px',
          }}
        >
          <button
            onClick={() => setActiveTab('members')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: activeTab === 'members' ? '#667eea' : '#6b7280',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'members' ? '2px solid #667eea' : '2px solid transparent',
            }}
          >
            成员 ({team.members.length})
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: activeTab === 'admins' ? '#667eea' : '#6b7280',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'admins' ? '2px solid #667eea' : '2px solid transparent',
            }}
          >
            管理员 ({team.admins.length})
          </button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'members' && (
            <>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="输入邮箱添加成员"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleAddMember}
                  disabled={!newMemberEmail}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#fff',
                    background: newMemberEmail
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : '#d1d5db',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: newMemberEmail ? 'pointer' : 'not-allowed',
                  }}
                >
                  添加
                </button>
              </div>
              {team.members.map((memberId) => (
                <MemberItem key={memberId} userId={memberId} />
              ))}
            </>
          )}

          {activeTab === 'admins' && (
            <>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }}>
                管理员可以管理团队成员和设置团队信息
              </p>
              {team.admins.map((adminId) => (
                <MemberItem key={adminId} userId={adminId} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
