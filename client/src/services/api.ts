import { Board, Template, SharePermission, ShareResult, Comment, CommentReply, Snapshot, Poll } from '../types';

const API_BASE_URL = '/api/boards';
const TEMPLATE_API_URL = '/api/templates';

export const boardApi = {
  async getBoards(userId: string): Promise<Board[]> {
    const response = await fetch(`${API_BASE_URL}?userId=${userId}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch boards');
    }
    return response.json();
  },

  async getBoard(boardId: string): Promise<Board | null> {
    const response = await fetch(`${API_BASE_URL}/${boardId}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch board');
    }
    return response.json();
  },

  async getSharedBoard(token: string): Promise<Board | null> {
    const response = await fetch(`${API_BASE_URL}/share/${token}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch shared board');
    }
    return response.json();
  },

  async createBoard(data: { name: string; ownerId: string; width?: number; height?: number }): Promise<Board | null> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create board');
    }
    return response.json();
  },

  async deleteBoard(boardId: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/${boardId}`, { method: 'DELETE' });
    return response.ok;
  },

  async shareBoard(boardId: string, permission: SharePermission = 'view'): Promise<ShareResult> {
    const response = await fetch(`${API_BASE_URL}/${boardId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permission }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to share board');
    }
    return response.json();
  },

  async updateSharePermission(boardId: string, permission: SharePermission): Promise<Board> {
    const response = await fetch(`${API_BASE_URL}/${boardId}/share`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permission }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update share permission');
    }
    return response.json();
  },

  async revokeShare(boardId: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/${boardId}/share`, { method: 'DELETE' });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to revoke share');
    }
    return response.ok;
  },

  async getComments(boardId: string): Promise<Comment[]> {
    const response = await fetch(`${API_BASE_URL}/${boardId}/comments`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch comments');
    }
    return response.json();
  },

  async addComment(boardId: string, comment: Omit<Comment, 'id' | 'createdAt' | 'replies' | 'resolved'>): Promise<Comment> {
    const response = await fetch(`${API_BASE_URL}/${boardId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to add comment');
    }
    return response.json();
  },

  async addReply(boardId: string, commentId: string, reply: Omit<CommentReply, 'id' | 'createdAt'>): Promise<CommentReply> {
    const response = await fetch(`${API_BASE_URL}/${boardId}/comments/${commentId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reply),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to add reply');
    }
    return response.json();
  },

  async resolveComment(boardId: string, commentId: string, resolved: boolean): Promise<Comment> {
    const response = await fetch(`${API_BASE_URL}/${boardId}/comments/${commentId}/resolve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to resolve comment');
    }
    return response.json();
  },

  async deleteComment(boardId: string, commentId: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/${boardId}/comments/${commentId}`, { method: 'DELETE' });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete comment');
    }
    return response.ok;
  },

  async getSnapshots(boardId: string): Promise<Snapshot[]> {
    const response = await fetch(`${API_BASE_URL}/${boardId}/snapshots`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch snapshots');
    }
    return response.json();
  },

  async createSnapshot(boardId: string, data: { name?: string; description?: string; createdBy: string; createdById: string }): Promise<Snapshot> {
    const response = await fetch(`${API_BASE_URL}/${boardId}/snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create snapshot');
    }
    return response.json();
  },

  async restoreSnapshot(boardId: string, snapshotId: string): Promise<Board> {
    const response = await fetch(`${API_BASE_URL}/${boardId}/snapshots/${snapshotId}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to restore snapshot');
    }
    return response.json();
  },

  async updateSnapshot(boardId: string, snapshotId: string, data: { name?: string; description?: string }): Promise<Snapshot> {
    const response = await fetch(`${API_BASE_URL}/${boardId}/snapshots/${snapshotId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update snapshot');
    }
    return response.json();
  },

  async deleteSnapshot(boardId: string, snapshotId: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/${boardId}/snapshots/${snapshotId}`, { method: 'DELETE' });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete snapshot');
    }
    return response.ok;
  },

  async getPolls(boardId: string): Promise<Poll[]> {
    const response = await fetch(`${API_BASE_URL}/${boardId}/polls`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch polls');
    }
    return response.json();
  },

  async createPoll(boardId: string, pollData: Omit<Poll, 'id' | 'createdAt' | 'closed'> & { options: string[] }): Promise<Poll> {
    const response = await fetch(`${API_BASE_URL}/${boardId}/polls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pollData),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create poll');
    }
    return response.json();
  },

  async votePoll(boardId: string, pollId: string, optionIds: string | string[], userId: string): Promise<Poll> {
    const response = await fetch(`${API_BASE_URL}/${boardId}/polls/${pollId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionIds, userId }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to vote');
    }
    return response.json();
  },

  async closePoll(boardId: string, pollId: string, closed: boolean): Promise<Poll> {
    const response = await fetch(`${API_BASE_URL}/${boardId}/polls/${pollId}/close`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ closed }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to close poll');
    }
    return response.json();
  },

  async deletePoll(boardId: string, pollId: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/${boardId}/polls/${pollId}`, { method: 'DELETE' });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete poll');
    }
    return response.ok;
  },

  getMockBoards(): Board[] {
    const now = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString();
    const lastWeek = new Date(Date.now() - 86400000 * 7).toISOString();

    return [
      {
        _id: 'board-1',
        name: '产品需求评审',
        ownerId: 'user-1',
        collaborators: ['user-2', 'user-3'],
        layers: [{ name: '图层 1', visible: true, locked: false, order: 0, elements: [] }],
        comments: [],
        snapshots: [],
        polls: [],
        width: 3000,
        height: 2000,
        backgroundColor: '#f5f5f5',
        createdAt: lastWeek,
        updatedAt: now,
        isShared: true,
        shareToken: 'mock-token-1',
        sharePermission: 'edit',
      },
      {
        _id: 'board-2',
        name: '架构设计讨论',
        ownerId: 'user-1',
        collaborators: ['user-4'],
        layers: [{ name: '图层 1', visible: true, locked: false, order: 0, elements: [] }],
        comments: [],
        snapshots: [],
        polls: [],
        width: 3000,
        height: 2000,
        backgroundColor: '#ffffff',
        createdAt: lastWeek,
        updatedAt: yesterday,
        isShared: false,
        shareToken: null,
        sharePermission: 'view',
      },
      {
        _id: 'board-3',
        name: '用户旅程地图',
        ownerId: 'user-2',
        collaborators: ['user-1', 'user-5'],
        layers: [{ name: '图层 1', visible: true, locked: false, order: 0, elements: [] }],
        comments: [],
        snapshots: [],
        polls: [],
        width: 3000,
        height: 2000,
        backgroundColor: '#f0f8ff',
        createdAt: lastWeek,
        updatedAt: twoDaysAgo,
        isShared: true,
        shareToken: 'mock-token-3',
        sharePermission: 'view',
      },
      {
        _id: 'board-4',
        name: '团队脑暴会',
        ownerId: 'user-3',
        collaborators: ['user-1'],
        layers: [{ name: '图层 1', visible: true, locked: false, order: 0, elements: [] }],
        comments: [],
        snapshots: [],
        polls: [],
        width: 3000,
        height: 2000,
        backgroundColor: '#fff8e1',
        createdAt: lastWeek,
        updatedAt: lastWeek,
        isShared: false,
        shareToken: null,
        sharePermission: 'view',
      },
    ];
  },

  createMockBoard(data: { name: string; ownerId: string }): Board {
    const now = new Date().toISOString();
    return {
      _id: `board-${Date.now()}`,
      name: data.name,
      ownerId: data.ownerId,
      collaborators: [],
      layers: [{ name: '图层 1', visible: true, locked: false, order: 0, elements: [] }],
      comments: [],
      snapshots: [],
      polls: [],
      width: 3000,
      height: 2000,
      backgroundColor: '#ffffff',
      createdAt: now,
      updatedAt: now,
      isShared: false,
      shareToken: null,
      sharePermission: 'view',
    };
  },
};

const mockTemplates: Template[] = [
  {
    _id: 'template-meeting',
    name: '会议纪要',
    description: '快速记录会议要点、待办事项和决议',
    category: 'meeting',
    thumbnail: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    icon: '📝',
    width: 3000,
    height: 2000,
    backgroundColor: '#f8f9fa',
  },
  {
    _id: 'template-workflow',
    name: '流程图',
    description: '可视化梳理业务流程、工作流和决策路径',
    category: 'workflow',
    thumbnail: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    icon: '🔄',
    width: 3500,
    height: 2200,
    backgroundColor: '#f0f9ff',
  },
  {
    _id: 'template-brainstorm',
    name: '头脑风暴',
    description: '激发团队创意，自由发散想法，快速收集灵感',
    category: 'brainstorm',
    thumbnail: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    icon: '💡',
    width: 3500,
    height: 2400,
    backgroundColor: '#fffbeb',
  },
  {
    _id: 'template-weekly',
    name: '周计划',
    description: '规划一周工作，跟踪每日任务和重要事项',
    category: 'productivity',
    thumbnail: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    icon: '📅',
    width: 3200,
    height: 2000,
    backgroundColor: '#f0fdf4',
  },
];

const createMockBoardFromTemplate = (
  template: Template,
  data: { name: string; ownerId: string }
): Board => {
  const now = new Date().toISOString();
  return {
    _id: `board-${Date.now()}`,
    name: data.name || template.name,
    ownerId: data.ownerId,
    collaborators: [],
    layers: template.layers || [{ name: '图层 1', visible: true, locked: false, order: 0, elements: [] }],
    comments: [],
    snapshots: [],
    polls: [],
    width: template.width,
    height: template.height,
    backgroundColor: template.backgroundColor,
    createdAt: now,
    updatedAt: now,
    isShared: false,
    shareToken: null,
    sharePermission: 'view',
  };
};

export const templateApi = {
  async getTemplates(): Promise<Template[]> {
    try {
      const response = await fetch(TEMPLATE_API_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      return response.json();
    } catch (error) {
      console.warn('Using mock templates due to API error:', error);
      return mockTemplates;
    }
  },

  async getTemplate(templateId: string): Promise<Template | null> {
    try {
      const response = await fetch(`${TEMPLATE_API_URL}/${templateId}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch template');
      }
      return response.json();
    } catch (error) {
      console.warn('Using mock template due to API error:', error);
      return mockTemplates.find((t) => t._id === templateId) || null;
    }
  },

  async createBoardFromTemplate(
    templateId: string,
    data: { name: string; ownerId: string }
  ): Promise<Board | null> {
    try {
      const response = await fetch(`${TEMPLATE_API_URL}/${templateId}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create board from template');
      }
      return response.json();
    } catch (error) {
      console.warn('Using mock board creation due to API error:', error);
      const template = mockTemplates.find((t) => t._id === templateId);
      if (template) {
        return createMockBoardFromTemplate(template, data);
      }
      throw error;
    }
  },
};
