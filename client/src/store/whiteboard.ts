import { create } from 'zustand';
import { Board, BoardElement, CursorPosition, CanvasTransform, ToolType, Layer, Comment, CommentReply, PresentationStep, TaskCardData, Snapshot, Poll, HostInfo, FollowState } from '../types';
import { socketService } from '../services/socket';
import { boardApi } from '../services/api';

interface WhiteboardState {
  board: Board | null;
  activeTool: ToolType;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  activeLayerIndex: number;
  cursors: Map<string, CursorPosition>;
  canvasTransform: CanvasTransform;
  username: string;
  canEdit: boolean;
  isShareAccess: boolean;
  selectedCommentId: string | null;
  showCommentPanel: boolean;
  presentationSteps: PresentationStep[];
  isPresentationMode: boolean;
  currentPresentationStepIndex: number;
  isPresentationPlaying: boolean;
  showPresentationPanel: boolean;
  showMeetingMinutes: boolean;
  selectedTaskCardId: string | null;
  showTaskCardEditor: boolean;
  showSnapshotHistory: boolean;
  snapshots: Snapshot[];
  showCreatePollModal: boolean;
  createPollPosition: { x: number; y: number } | null;
  selectedPollId: string | null;
  hostInfo: HostInfo | null;
  followState: FollowState;
  isHost: boolean;

  // Actions
  setBoard: (board: Board) => void;
  setActiveTool: (tool: ToolType) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setActiveLayerIndex: (index: number) => void;
  addElement: (element: BoardElement) => void;
  updateElement: (elementId: string, updates: Partial<BoardElement>) => void;
  deleteElement: (elementId: string) => void;
  addLayer: (name: string) => void;
  toggleLayerVisibility: (index: number) => void;
  toggleLayerLock: (index: number) => void;
  setCanvasTransform: (transform: CanvasTransform) => void;
  updateCursor: (cursor: CursorPosition) => void;
  removeCursor: (socketId: string) => void;
  setCursors: (cursors: CursorPosition[]) => void;
  setUsername: (name: string) => void;
  setCanEdit: (canEdit: boolean) => void;
  setIsShareAccess: (isShare: boolean) => void;
  addComment: (comment: Omit<Comment, 'id' | 'createdAt' | 'replies' | 'resolved'>) => Promise<Comment | null>;
  addReplyToComment: (commentId: string, reply: Omit<CommentReply, 'id' | 'createdAt'>) => Promise<CommentReply | null>;
  updateComment: (commentId: string, updates: Partial<Comment>) => void;
  resolveComment: (commentId: string, resolved: boolean) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;
  loadComments: (boardId: string) => Promise<void>;
  setComments: (comments: Comment[]) => void;
  setSelectedCommentId: (id: string | null) => void;
  setShowCommentPanel: (show: boolean) => void;
  setPresentationSteps: (steps: PresentationStep[]) => void;
  addPresentationStep: (step: Omit<PresentationStep, 'id'>) => void;
  updatePresentationStep: (stepId: string, updates: Partial<PresentationStep>) => void;
  deletePresentationStep: (stepId: string) => void;
  reorderPresentationSteps: (steps: PresentationStep[]) => void;
  setIsPresentationMode: (isMode: boolean) => void;
  setCurrentPresentationStepIndex: (index: number) => void;
  setIsPresentationPlaying: (isPlaying: boolean) => void;
  setShowPresentationPanel: (show: boolean) => void;
  goToNextPresentationStep: () => void;
  goToPrevPresentationStep: () => void;
  setShowMeetingMinutes: (show: boolean) => void;
  updateTaskCard: (elementId: string, taskData: Partial<TaskCardData>) => void;
  setSelectedTaskCardId: (id: string | null) => void;
  setShowTaskCardEditor: (show: boolean) => void;
  setShowSnapshotHistory: (show: boolean) => void;
  setSnapshots: (snapshots: Snapshot[]) => void;
  loadSnapshots: () => Promise<void>;
  createSnapshot: (name?: string, description?: string) => Promise<Snapshot | null>;
  restoreSnapshot: (snapshotId: string) => Promise<boolean>;
  updateSnapshot: (snapshotId: string, updates: { name?: string; description?: string }) => Promise<boolean>;
  deleteSnapshot: (snapshotId: string) => Promise<boolean>;
  setShowCreatePollModal: (show: boolean, position?: { x: number; y: number }) => void;
  setSelectedPollId: (id: string | null) => void;
  loadPolls: () => Promise<void>;
  setPolls: (polls: Poll[]) => void;
  addPoll: (pollData: Omit<Poll, 'id' | 'createdAt' | 'closed'> & { options: string[] }) => Promise<Poll | null>;
  votePoll: (pollId: string, optionIds: string | string[]) => Promise<Poll | null>;
  closePoll: (pollId: string, closed: boolean) => Promise<Poll | null>;
  deletePoll: (pollId: string) => Promise<boolean>;
  updatePoll: (pollId: string, updates: Partial<Poll>) => void;
  setHostInfo: (hostInfo: HostInfo | null) => void;
  setIsHost: (isHost: boolean) => void;
  toggleHostMode: () => void;
  startFollowingHost: (hostSocketId: string, hostUsername: string) => void;
  stopFollowingHost: () => void;
  applyHostView: (transform: CanvasTransform) => void;
}

export const useWhiteboardStore = create<WhiteboardState>((set, get) => ({
  board: null,
  activeTool: 'pen',
  strokeColor: '#000000',
  fillColor: 'transparent',
  strokeWidth: 2,
  activeLayerIndex: 0,
  cursors: new Map(),
  canvasTransform: { scale: 1, translateX: 0, translateY: 0 },
  username: `User_${Math.random().toString(36).substr(2, 6)}`,
  canEdit: true,
  isShareAccess: false,
  selectedCommentId: null,
  showCommentPanel: false,
  presentationSteps: [],
  isPresentationMode: false,
  currentPresentationStepIndex: 0,
  isPresentationPlaying: false,
  showPresentationPanel: false,
  showMeetingMinutes: false,
  selectedTaskCardId: null,
  showTaskCardEditor: false,
  showSnapshotHistory: false,
  snapshots: [],
  showCreatePollModal: false,
  createPollPosition: null,
  selectedPollId: null,
  hostInfo: null,
  followState: {
    isFollowing: false,
    hostSocketId: null,
    hostUsername: null
  },
  isHost: false,

  setBoard: (board) => set({ board }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setFillColor: (color) => set({ fillColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setActiveLayerIndex: (index) => set({ activeLayerIndex: index }),

  addElement: (element) => {
    const { board, activeLayerIndex, canEdit } = get();
    if (!board || !canEdit) return;
    const layers = [...board.layers];
    layers[activeLayerIndex] = {
      ...layers[activeLayerIndex],
      elements: [...layers[activeLayerIndex].elements, element]
    };
    set({ board: { ...board, layers } });
    socketService.drawElement(element, activeLayerIndex);
  },

  updateElement: (elementId, updates) => {
    const { board, activeLayerIndex, canEdit } = get();
    if (!board || !canEdit) return;
    const layers = [...board.layers];
    const elements = layers[activeLayerIndex].elements.map(el =>
      el.id === elementId ? { ...el, ...updates } : el
    );
    layers[activeLayerIndex] = { ...layers[activeLayerIndex], elements };
    set({ board: { ...board, layers } });
    socketService.updateElement(elementId, updates, activeLayerIndex);
  },

  deleteElement: (elementId) => {
    const { board, activeLayerIndex, canEdit } = get();
    if (!board || !canEdit) return;
    const layers = [...board.layers];
    const elements = layers[activeLayerIndex].elements.filter(el => el.id !== elementId);
    layers[activeLayerIndex] = { ...layers[activeLayerIndex], elements };
    set({ board: { ...board, layers } });
    socketService.deleteElement(elementId, activeLayerIndex);
  },

  addLayer: (name) => {
    const { board, canEdit } = get();
    if (!board || !canEdit) return;
    const newLayer: Layer = { name, visible: true, locked: false, order: board.layers.length, elements: [] };
    const layers = [...board.layers, newLayer];
    set({ board: { ...board, layers }, activeLayerIndex: layers.length - 1 });
    socketService.updateLayers(layers);
  },

  toggleLayerVisibility: (index) => {
    const { board } = get();
    if (!board) return;
    const layers = [...board.layers];
    layers[index] = { ...layers[index], visible: !layers[index].visible };
    set({ board: { ...board, layers } });
    socketService.updateLayers(layers);
  },

  toggleLayerLock: (index) => {
    const { board, canEdit } = get();
    if (!board || !canEdit) return;
    const layers = [...board.layers];
    layers[index] = { ...layers[index], locked: !layers[index].locked };
    set({ board: { ...board, layers } });
    socketService.updateLayers(layers);
  },

  setCanvasTransform: (transform) => {
    set({ canvasTransform: transform });
    socketService.canvasTransform(transform);
    
    const { isHost } = get();
    if (isHost) {
      socketService.broadcastHostView(transform);
    }
  },

  updateCursor: (cursor) => {
    const cursors = new Map(get().cursors);
    cursors.set(cursor.socketId, cursor);
    set({ cursors });
  },

  removeCursor: (socketId) => {
    const cursors = new Map(get().cursors);
    cursors.delete(socketId);
    set({ cursors });
  },

  setCursors: (cursorsList) => {
    const cursors = new Map();
    cursorsList.forEach(c => cursors.set(c.socketId, c));
    set({ cursors });
  },

  setUsername: (name) => set({ username: name }),
  setCanEdit: (canEdit) => set({ canEdit }),
  setIsShareAccess: (isShareAccess) => set({ isShareAccess }),

  addComment: async (commentData) => {
    const { board } = get();
    if (!board) return null;
    
    try {
      const savedComment = await boardApi.addComment(board._id, commentData);
      const { board: currentBoard } = get();
      if (currentBoard) {
        const comments = [...(currentBoard.comments || []), savedComment];
        set({ board: { ...currentBoard, comments } });
        socketService.addComment(savedComment);
      }
      return savedComment;
    } catch (err) {
      console.error('Failed to add comment:', err);
      return null;
    }
  },

  addReplyToComment: async (commentId, replyData) => {
    const { board } = get();
    if (!board) return null;
    
    try {
      const savedReply = await boardApi.addReply(board._id, commentId, replyData);
      const { board: currentBoard } = get();
      if (currentBoard) {
        const comments = (currentBoard.comments || []).map(c => {
          if (c.id === commentId) {
            return { ...c, replies: [...c.replies, savedReply] };
          }
          return c;
        });
        set({ board: { ...currentBoard, comments } });
        socketService.addReply(commentId, savedReply);
      }
      return savedReply;
    } catch (err) {
      console.error('Failed to add reply:', err);
      return null;
    }
  },

  updateComment: (commentId, updates) => {
    const { board } = get();
    if (!board) return;
    const comments = (board.comments || []).map(c => {
      if (c.id === commentId) {
        return { ...c, ...updates };
      }
      return c;
    });
    set({ board: { ...board, comments } });
    socketService.updateComment(commentId, updates);
  },

  resolveComment: async (commentId, resolved) => {
    const { board } = get();
    if (!board) return false;
    
    try {
      const updatedComment = await boardApi.resolveComment(board._id, commentId, resolved);
      const { board: currentBoard } = get();
      if (currentBoard) {
        const comments = (currentBoard.comments || []).map(c => {
          if (c.id === commentId) {
            return updatedComment;
          }
          return c;
        });
        set({ board: { ...currentBoard, comments } });
        socketService.resolveComment(commentId, resolved);
      }
      return true;
    } catch (err) {
      console.error('Failed to resolve comment:', err);
      return false;
    }
  },

  deleteComment: async (commentId) => {
    const { board } = get();
    if (!board) return false;
    
    try {
      await boardApi.deleteComment(board._id, commentId);
      const { board: currentBoard } = get();
      if (currentBoard) {
        const comments = (currentBoard.comments || []).filter(c => c.id !== commentId);
        set({ board: { ...currentBoard, comments }, selectedCommentId: null });
        socketService.deleteComment(commentId);
      }
      return true;
    } catch (err) {
      console.error('Failed to delete comment:', err);
      return false;
    }
  },

  loadComments: async (boardId: string) => {
    try {
      const comments = await boardApi.getComments(boardId);
      const { board } = get();
      if (board && board._id === boardId) {
        set({ board: { ...board, comments } });
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  },

  setComments: (comments: Comment[]) => {
    const { board } = get();
    if (!board) return;
    set({ board: { ...board, comments } });
  },

  setSelectedCommentId: (id) => set({ selectedCommentId: id }),
  setShowCommentPanel: (show) => set({ showCommentPanel: show }),

  setPresentationSteps: (steps) => set({ presentationSteps: steps }),

  addPresentationStep: (step) => {
    const { presentationSteps, canEdit } = get();
    if (!canEdit) return;
    const newStep: PresentationStep = {
      ...step,
      id: Math.random().toString(36).substr(2, 9)
    };
    const steps = [...presentationSteps, newStep].sort((a, b) => a.order - b.order);
    set({ presentationSteps: steps });
  },

  updatePresentationStep: (stepId, updates) => {
    const { presentationSteps, canEdit } = get();
    if (!canEdit) return;
    const steps = presentationSteps.map(s =>
      s.id === stepId ? { ...s, ...updates } : s
    );
    set({ presentationSteps: steps });
  },

  deletePresentationStep: (stepId) => {
    const { presentationSteps, canEdit, currentPresentationStepIndex } = get();
    if (!canEdit) return;
    const steps = presentationSteps.filter(s => s.id !== stepId);
    const newIndex = Math.min(currentPresentationStepIndex, Math.max(0, steps.length - 1));
    set({ 
      presentationSteps: steps,
      currentPresentationStepIndex: newIndex
    });
  },

  reorderPresentationSteps: (steps) => {
    const { canEdit } = get();
    if (!canEdit) return;
    const reordered = steps.map((s, i) => ({ ...s, order: i }));
    set({ presentationSteps: reordered });
  },

  setIsPresentationMode: (isMode) => {
    if (!isMode) {
      set({ 
        isPresentationMode: false, 
        isPresentationPlaying: false,
        currentPresentationStepIndex: 0
      });
    } else {
      set({ isPresentationMode: true });
    }
  },

  setCurrentPresentationStepIndex: (index) => {
    const { presentationSteps, board } = get();
    if (index < 0 || index >= presentationSteps.length) return;
    const step = presentationSteps[index];
    if (step && board) {
      const centerX = step.x + step.width / 2;
      const centerY = step.y + step.height / 2;
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const translateX = rect.width / 2 - centerX * step.scale;
        const translateY = rect.height / 2 - centerY * step.scale;
        useWhiteboardStore.getState().setCanvasTransform({
          scale: step.scale,
          translateX,
          translateY
        });
      }
    }
    set({ currentPresentationStepIndex: index });
  },

  setIsPresentationPlaying: (isPlaying) => set({ isPresentationPlaying: isPlaying }),
  setShowPresentationPanel: (show) => set({ showPresentationPanel: show }),

  goToNextPresentationStep: () => {
    const { currentPresentationStepIndex, presentationSteps, setCurrentPresentationStepIndex } = get();
    if (currentPresentationStepIndex < presentationSteps.length - 1) {
      setCurrentPresentationStepIndex(currentPresentationStepIndex + 1);
    }
  },

  goToPrevPresentationStep: () => {
    const { currentPresentationStepIndex, setCurrentPresentationStepIndex } = get();
    if (currentPresentationStepIndex > 0) {
      setCurrentPresentationStepIndex(currentPresentationStepIndex - 1);
    }
  },

  setShowMeetingMinutes: (show) => set({ showMeetingMinutes: show }),

  updateTaskCard: (elementId, taskData) => {
    const { board, canEdit } = get();
    if (!board || !canEdit) return;
    const layers = [...board.layers];
    let layerIndex = -1;
    for (let i = 0; i < layers.length; i++) {
      const found = layers[i].elements.find(el => el.id === elementId);
      if (found) {
        layerIndex = i;
        break;
      }
    }
    if (layerIndex === -1) return;
    const elements = layers[layerIndex].elements.map(el =>
      el.id === elementId ? { ...el, taskData: { ...el.taskData, ...taskData } } as BoardElement : el
    );
    layers[layerIndex] = { ...layers[layerIndex], elements };
    set({ board: { ...board, layers } });
    socketService.updateTaskCard(elementId, taskData, layerIndex);
  },

  setSelectedTaskCardId: (id) => set({ selectedTaskCardId: id }),
  setShowTaskCardEditor: (show) => set({ showTaskCardEditor: show }),

  setShowSnapshotHistory: (show) => set({ showSnapshotHistory: show }),

  setSnapshots: (snapshots) => set({ snapshots }),

  loadSnapshots: async () => {
    const { board } = get();
    if (!board) return;
    try {
      const snapshots = await boardApi.getSnapshots(board._id);
      set({ snapshots });
    } catch (err) {
      console.error('Failed to load snapshots:', err);
    }
  },

  createSnapshot: async (name, description) => {
    const { board, username, canEdit } = get();
    if (!board || !canEdit) return null;
    try {
      const snapshot = await boardApi.createSnapshot(board._id, {
        name,
        description,
        createdBy: username,
        createdById: 'user-id'
      });
      const { snapshots } = get();
      set({ snapshots: [...snapshots, snapshot] });
      return snapshot;
    } catch (err) {
      console.error('Failed to create snapshot:', err);
      return null;
    }
  },

  restoreSnapshot: async (snapshotId) => {
    const { board, canEdit } = get();
    if (!board || !canEdit) return false;
    try {
      const updatedBoard = await boardApi.restoreSnapshot(board._id, snapshotId);
      set({ board: updatedBoard });
      socketService.restoreSnapshot(updatedBoard.layers);
      return true;
    } catch (err) {
      console.error('Failed to restore snapshot:', err);
      return false;
    }
  },

  updateSnapshot: async (snapshotId, updates) => {
    const { board, canEdit, snapshots } = get();
    if (!board || !canEdit) return false;
    try {
      const updatedSnapshot = await boardApi.updateSnapshot(board._id, snapshotId, updates);
      const newSnapshots = snapshots.map(s => s.id === snapshotId ? updatedSnapshot : s);
      set({ snapshots: newSnapshots });
      return true;
    } catch (err) {
      console.error('Failed to update snapshot:', err);
      return false;
    }
  },

  deleteSnapshot: async (snapshotId) => {
    const { board, canEdit, snapshots } = get();
    if (!board || !canEdit) return false;
    try {
      await boardApi.deleteSnapshot(board._id, snapshotId);
      set({ snapshots: snapshots.filter(s => s.id !== snapshotId) });
      return true;
    } catch (err) {
      console.error('Failed to delete snapshot:', err);
      return false;
    }
  },

  setShowCreatePollModal: (show, position) => {
    set({ showCreatePollModal: show, createPollPosition: position || null });
  },

  setSelectedPollId: (id) => set({ selectedPollId: id }),

  loadPolls: async () => {
    const { board } = get();
    if (!board) return;
    try {
      const polls = await boardApi.getPolls(board._id);
      const { board: currentBoard } = get();
      if (currentBoard) {
        set({ board: { ...currentBoard, polls } });
      }
    } catch (err) {
      console.error('Failed to load polls:', err);
    }
  },

  setPolls: (polls) => {
    const { board } = get();
    if (!board) return;
    set({ board: { ...board, polls } });
  },

  addPoll: async (pollData) => {
    const { board, username, canEdit } = get();
    if (!board || !canEdit) return null;
    try {
      const savedPoll = await boardApi.createPoll(board._id, {
        ...pollData,
        author: username,
        authorId: 'user-id'
      });
      const { board: currentBoard } = get();
      if (currentBoard) {
        const polls = [...(currentBoard.polls || []), savedPoll];
        set({ board: { ...currentBoard, polls } });
        socketService.addPoll(savedPoll);
      }
      return savedPoll;
    } catch (err) {
      console.error('Failed to add poll:', err);
      return null;
    }
  },

  votePoll: async (pollId, optionIds) => {
    const { board } = get();
    if (!board) return null;
    try {
      const updatedPoll = await boardApi.votePoll(board._id, pollId, optionIds, 'user-id');
      const { board: currentBoard } = get();
      if (currentBoard) {
        const polls = (currentBoard.polls || []).map(p => p.id === pollId ? updatedPoll : p);
        set({ board: { ...currentBoard, polls } });
        socketService.votePoll(pollId, optionIds, 'user-id');
      }
      return updatedPoll;
    } catch (err) {
      console.error('Failed to vote:', err);
      return null;
    }
  },

  closePoll: async (pollId, closed) => {
    const { board, canEdit } = get();
    if (!board || !canEdit) return null;
    try {
      const updatedPoll = await boardApi.closePoll(board._id, pollId, closed);
      const { board: currentBoard } = get();
      if (currentBoard) {
        const polls = (currentBoard.polls || []).map(p => p.id === pollId ? updatedPoll : p);
        set({ board: { ...currentBoard, polls } });
        socketService.closePoll(pollId, closed);
      }
      return updatedPoll;
    } catch (err) {
      console.error('Failed to close poll:', err);
      return null;
    }
  },

  deletePoll: async (pollId) => {
    const { board, canEdit } = get();
    if (!board || !canEdit) return false;
    try {
      await boardApi.deletePoll(board._id, pollId);
      const { board: currentBoard } = get();
      if (currentBoard) {
        const polls = (currentBoard.polls || []).filter(p => p.id !== pollId);
        set({ board: { ...currentBoard, polls }, selectedPollId: null });
        socketService.deletePoll(pollId);
      }
      return true;
    } catch (err) {
      console.error('Failed to delete poll:', err);
      return false;
    }
  },

  updatePoll: (pollId, updates) => {
    const { board } = get();
    if (!board) return;
    const polls = (board.polls || []).map(p => p.id === pollId ? { ...p, ...updates } : p);
    set({ board: { ...board, polls } });
    socketService.updatePoll(pollId, updates);
  },

  setHostInfo: (hostInfo) => set({ hostInfo }),

  setIsHost: (isHost) => set({ isHost }),

  toggleHostMode: () => {
    const { isHost, username } = get();
    const newIsHost = !isHost;
    set({ isHost: newIsHost });
    
    const userId = 'user-1';
    socketService.setHost(newIsHost, userId, username);
    
    if (newIsHost) {
      const { canvasTransform } = get();
      socketService.broadcastHostView(canvasTransform);
    } else {
      const { followState, stopFollowingHost } = get();
      if (followState.isFollowing) {
        stopFollowingHost();
      }
    }
  },

  startFollowingHost: (hostSocketId, hostUsername) => {
    set({
      followState: {
        isFollowing: true,
        hostSocketId,
        hostUsername
      }
    });
    socketService.requestFollowHost(hostSocketId);
  },

  stopFollowingHost: () => {
    set({
      followState: {
        isFollowing: false,
        hostSocketId: null,
        hostUsername: null
      }
    });
    socketService.stopFollowing();
  },

  applyHostView: (transform) => {
    const { followState } = get();
    if (!followState.isFollowing) return;
    set({ canvasTransform: transform });
  },
}));
