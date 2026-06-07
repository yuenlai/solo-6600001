import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Board, BoardElement, CursorPosition, CanvasTransform, ToolType, Layer, Comment, CommentReply, PresentationStep, TaskCardData, Snapshot, Poll, HostInfo, FollowState, NoteGroup, SearchResult, Notification, Asset, TimerPhase, TimerState, TimerSettings } from '../types';
import { socketService } from '../services/socket';
import { boardApi, notificationApi } from '../services/api';
import { groupStickyNotes, autoArrangeGroups as autoArrangeGroupsUtil, addToGroup, removeFromGroup, mergeGroups } from '../utils/noteGrouping';
import { exportBoardToImage, downloadImage, exportPresets } from '../utils/exportImage';

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
  noteGroups: NoteGroup[];
  showNoteGroupPanel: boolean;
  groupingSimilarityThreshold: number;
  showSearchPanel: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  selectedSearchResultId: string | null;
  showExportModal: boolean;
  exportScale: number;
  exportFormat: 'png' | 'jpeg';
  exportQuality: number;
  includePollsInExport: boolean;
  isExporting: boolean;
  notifications: Notification[];
  unreadNotificationCount: number;
  showNotificationPanel: boolean;
  assets: Asset[];
  showAssetPanel: boolean;
  showMinimap: boolean;
  showTimerPanel: boolean;
  timerState: TimerState;
  timerSettings: TimerSettings;

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
  setNoteGroups: (groups: NoteGroup[]) => void;
  setShowNoteGroupPanel: (show: boolean) => void;
  setGroupingSimilarityThreshold: (threshold: number) => void;
  autoGroupNotes: () => void;
  autoArrangeGroups: () => void;
  addNoteGroup: (group: NoteGroup) => void;
  updateNoteGroup: (groupId: string, updates: Partial<NoteGroup>) => void;
  deleteNoteGroup: (groupId: string, keepElements?: boolean) => void;
  addElementToGroup: (groupId: string, elementId: string) => void;
  removeElementFromGroup: (groupId: string, elementId: string) => void;
  toggleGroupCollapse: (groupId: string) => void;
  clearAllGroups: () => void;
  mergeNoteGroups: (groupId1: string, groupId2: string) => void;
  setShowSearchPanel: (show: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchResult[]) => void;
  setSelectedSearchResultId: (id: string | null) => void;
  performSearch: (query: string) => void;
  navigateToSearchResult: (result: SearchResult) => void;
  setShowExportModal: (show: boolean) => void;
  setExportScale: (scale: number) => void;
  setExportFormat: (format: 'png' | 'jpeg') => void;
  setExportQuality: (quality: number) => void;
  setIncludePollsInExport: (include: boolean) => void;
  exportBoard: () => Promise<void>;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  setUnreadNotificationCount: (count: number) => void;
  setShowNotificationPanel: (show: boolean) => void;
  loadNotifications: (userId: string) => Promise<void>;
  loadUnreadCount: (userId: string) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: (userId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  setShowAssetPanel: (show: boolean) => void;
  setShowMinimap: (show: boolean) => void;
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setAssets: (assets: Asset[]) => void;
  addAsset: (asset: Omit<Asset, 'id' | 'createdAt' | 'usageCount'>) => void;
  deleteAsset: (assetId: string) => void;
  updateAsset: (assetId: string, updates: Partial<Asset>) => void;
  insertAssetToCanvas: (assetId: string, x: number, y: number) => void;
  loadAssets: () => void;
  setShowTimerPanel: (show: boolean) => void;
  setTimerState: (state: Partial<TimerState>) => void;
  setTimerSettings: (settings: Partial<TimerSettings>) => void;
  addTimerPhase: (phase: Omit<TimerPhase, 'id'>) => void;
  updateTimerPhase: (phaseId: string, updates: Partial<TimerPhase>) => void;
  deleteTimerPhase: (phaseId: string) => void;
  reorderTimerPhases: (phases: TimerPhase[]) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  nextTimerPhase: () => void;
  prevTimerPhase: () => void;
  goToTimerPhase: (index: number) => void;
  syncTimerState: (state: TimerState) => void;
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
  noteGroups: [],
  showNoteGroupPanel: false,
  groupingSimilarityThreshold: 0.2,
  showSearchPanel: false,
  searchQuery: '',
  searchResults: [],
  selectedSearchResultId: null,
  showExportModal: false,
  exportScale: exportPresets.high.scale,
  exportFormat: 'png',
  exportQuality: 0.92,
  includePollsInExport: true,
  isExporting: false,
  notifications: [],
  unreadNotificationCount: 0,
  showNotificationPanel: false,
  assets: [],
  showAssetPanel: false,
  showMinimap: true,
  showTimerPanel: false,
  timerState: {
    isRunning: false,
    currentPhaseIndex: 0,
    phases: [],
    remainingTime: 0,
    totalDuration: 0,
    startTime: null,
    pausedTime: 0,
    isPaused: false,
  },
  timerSettings: {
    soundEnabled: true,
    warningThreshold: 60,
    autoNextPhase: true,
  },

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

  setNoteGroups: (groups) => set({ noteGroups: groups }),

  setShowNoteGroupPanel: (show) => set({ showNoteGroupPanel: show }),

  setGroupingSimilarityThreshold: (threshold) => set({ groupingSimilarityThreshold: threshold }),

  autoGroupNotes: () => {
    const { board, groupingSimilarityThreshold, canEdit } = get();
    if (!board || !canEdit) return;

    const allElements = board.layers.flatMap(layer => layer.elements);
    const result = groupStickyNotes(allElements, groupingSimilarityThreshold);
    set({ noteGroups: result.groups });
  },

  autoArrangeGroups: () => {
    const { board, noteGroups, canEdit, activeLayerIndex } = get();
    if (!board || !canEdit || noteGroups.length === 0) return;

    const allElements = board.layers.flatMap(layer => layer.elements);
    const { groups: arrangedGroups, elements: arrangedElements } = autoArrangeGroupsUtil(noteGroups, allElements);

    const layers = [...board.layers];
    layers[activeLayerIndex] = {
      ...layers[activeLayerIndex],
      elements: layers[activeLayerIndex].elements.map(el => {
        const updated = arrangedElements.find(e => e.id === el.id);
        return updated || el;
      })
    };

    set({
      board: { ...board, layers },
      noteGroups: arrangedGroups
    });

    arrangedGroups.forEach(group => {
      group.elementIds.forEach(elementId => {
        const element = arrangedElements.find(e => e.id === elementId);
        if (element) {
          socketService.updateElement(elementId, { x: element.x, y: element.y }, activeLayerIndex);
        }
      });
    });
  },

  addNoteGroup: (group) => {
    const { noteGroups, canEdit } = get();
    if (!canEdit) return;
    set({ noteGroups: [...noteGroups, group] });
  },

  updateNoteGroup: (groupId, updates) => {
    const { noteGroups, canEdit } = get();
    if (!canEdit) return;
    const groups = noteGroups.map(g =>
      g.id === groupId ? { ...g, ...updates } : g
    );
    set({ noteGroups: groups });
  },

  deleteNoteGroup: (groupId, _keepElements = true) => {
    const { noteGroups, canEdit } = get();
    if (!canEdit) return;
    const groups = noteGroups.filter(g => g.id !== groupId);
    set({ noteGroups: groups });
  },

  addElementToGroup: (groupId, elementId) => {
    const { noteGroups, canEdit } = get();
    if (!canEdit) return;
    const groups = noteGroups.map(g =>
      g.id === groupId ? addToGroup(g, elementId) : g
    );
    set({ noteGroups: groups });
  },

  removeElementFromGroup: (groupId, elementId) => {
    const { noteGroups, canEdit } = get();
    if (!canEdit) return;
    const groups = noteGroups.map(g =>
      g.id === groupId ? removeFromGroup(g, elementId) : g
    ).filter(g => g.elementIds.length > 0);
    set({ noteGroups: groups });
  },

  toggleGroupCollapse: (groupId) => {
    const { noteGroups, canEdit } = get();
    if (!canEdit) return;
    const groups = noteGroups.map(g =>
      g.id === groupId ? { ...g, collapsed: !g.collapsed } : g
    );
    set({ noteGroups: groups });
  },

  clearAllGroups: () => {
    const { canEdit } = get();
    if (!canEdit) return;
    set({ noteGroups: [] });
  },

  mergeNoteGroups: (groupId1, groupId2) => {
    const { noteGroups, canEdit } = get();
    if (!canEdit) return;
    const group1 = noteGroups.find(g => g.id === groupId1);
    const group2 = noteGroups.find(g => g.id === groupId2);
    if (!group1 || !group2) return;

    const merged = mergeGroups(group1, group2);
    const groups = noteGroups.filter(g => g.id !== groupId1 && g.id !== groupId2);
    set({ noteGroups: [...groups, merged] });
  },

  setShowSearchPanel: (show) => set({ showSearchPanel: show }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSearchResults: (results) => set({ searchResults: results }),

  setSelectedSearchResultId: (id) => set({ selectedSearchResultId: id }),

  performSearch: (query) => {
    const { board } = get();
    if (!board || !query.trim()) {
      set({ searchResults: [], searchQuery: query });
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    board.layers.forEach((layer, layerIndex) => {
      if (layer.name.toLowerCase().includes(lowerQuery)) {
        const firstElement = layer.elements[0];
        results.push({
          id: `layer-${layerIndex}`,
          type: 'layer',
          layerIndex,
          layerName: layer.name,
          text: layer.name,
          matchedText: layer.name,
          x: firstElement?.x || 0,
          y: firstElement?.y || 0,
          width: firstElement?.width || 100,
          height: firstElement?.height || 100,
        });
      }

      layer.elements.forEach((element) => {
        let textContent = '';
        let matchedText = '';

        if (element.type === 'text' || element.type === 'sticky-note') {
          textContent = element.text || '';
          if (textContent.toLowerCase().includes(lowerQuery)) {
            matchedText = textContent;
          }
        } else if (element.type === 'task-card' && element.taskData) {
          const taskText = `${element.taskData.title || ''} ${element.taskData.description || ''}`;
          if (taskText.toLowerCase().includes(lowerQuery)) {
            textContent = taskText;
            matchedText = element.taskData.title || element.taskData.description || '';
          }
        }

        if (matchedText) {
          results.push({
            id: `element-${element.id}`,
            type: 'element',
            elementType: element.type,
            layerIndex,
            layerName: layer.name,
            elementId: element.id,
            text: textContent,
            matchedText,
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
          });
        }
      });
    });

    set({ searchResults: results, searchQuery: query });
  },

  navigateToSearchResult: (result) => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const centerX = result.x + (result.width || 100) / 2;
    const centerY = result.y + (result.height || 100) / 2;
    const scale = Math.min(1.5, 1);
    const translateX = rect.width / 2 - centerX * scale;
    const translateY = rect.height / 2 - centerY * scale;

    useWhiteboardStore.getState().setCanvasTransform({
      scale,
      translateX,
      translateY,
    });

    set({ selectedSearchResultId: result.id });
  },

  setShowExportModal: (show) => set({ showExportModal: show }),
  setExportScale: (scale) => set({ exportScale: scale }),
  setExportFormat: (format) => set({ exportFormat: format }),
  setExportQuality: (quality) => set({ exportQuality: quality }),
  setIncludePollsInExport: (include) => set({ includePollsInExport: include }),

  exportBoard: async () => {
    const { board, noteGroups, exportScale, exportFormat, exportQuality, includePollsInExport } = get();
    if (!board) {
      console.error('没有可导出的白板');
      return;
    }

    set({ isExporting: true });
    try {
      const padding = exportScale >= 4 ? 60 : 40;
      const dataUrl = await exportBoardToImage(board, noteGroups, {
        scale: exportScale,
        padding,
        backgroundColor: board.backgroundColor,
        includePolls: includePollsInExport,
        format: exportFormat,
        quality: exportQuality,
      });

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `白板_${board.name}_${timestamp}.${exportFormat}`;
      downloadImage(dataUrl, filename);
    } catch (error) {
      console.error('导出图片失败:', error);
      alert('导出图片失败，请重试');
    } finally {
      set({ isExporting: false, showExportModal: false });
    }
  },

  setNotifications: (notifications) => set({ notifications }),

  addNotification: (notification) => {
    const { notifications } = get();
    set({ 
      notifications: [notification, ...notifications],
      unreadNotificationCount: get().unreadNotificationCount + 1
    });
  },

  setUnreadNotificationCount: (count) => set({ unreadNotificationCount: count }),

  setShowNotificationPanel: (show) => set({ showNotificationPanel: show }),

  loadNotifications: async (userId) => {
    try {
      const notifications = await notificationApi.getNotifications(userId);
      set({ notifications });
      const unreadCount = notifications.filter(n => !n.read).length;
      set({ unreadNotificationCount: unreadCount });
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  },

  loadUnreadCount: async (userId) => {
    try {
      const result = await notificationApi.getUnreadCount(userId);
      set({ unreadNotificationCount: result.count });
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  },

  markNotificationAsRead: async (notificationId) => {
    try {
      const updated = await notificationApi.markAsRead(notificationId);
      const { notifications } = get();
      const updatedNotifications = notifications.map(n =>
        n.id === notificationId ? updated : n
      );
      set({ 
        notifications: updatedNotifications,
        unreadNotificationCount: updatedNotifications.filter(n => !n.read).length
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllNotificationsAsRead: async (userId) => {
    try {
      const updated = await notificationApi.markAllAsRead(userId);
      set({ 
        notifications: updated,
        unreadNotificationCount: 0
      });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  },

  deleteNotification: async (notificationId) => {
    try {
      await notificationApi.deleteNotification(notificationId);
      const { notifications } = get();
      const filtered = notifications.filter(n => n.id !== notificationId);
      set({ 
        notifications: filtered,
        unreadNotificationCount: filtered.filter(n => !n.read).length
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  },

  setShowAssetPanel: (show) => set({ showAssetPanel: show }),

  setShowMinimap: (show) => set({ showMinimap: show }),

  resetView: () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      set({
        canvasTransform: {
          scale: 1,
          translateX: rect.width / 2 - 500,
          translateY: rect.height / 2 - 400,
        }
      });
    } else {
      set({
        canvasTransform: { scale: 1, translateX: 0, translateY: 0 }
      });
    }
  },

  zoomIn: () => {
    const { canvasTransform } = get();
    const newScale = Math.min(canvasTransform.scale * 1.2, 5);
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const worldX = (centerX - canvasTransform.translateX) / canvasTransform.scale;
      const worldY = (centerY - canvasTransform.translateY) / canvasTransform.scale;
      set({
        canvasTransform: {
          scale: newScale,
          translateX: centerX - worldX * newScale,
          translateY: centerY - worldY * newScale,
        }
      });
    } else {
      set({
        canvasTransform: {
          ...canvasTransform,
          scale: newScale,
        }
      });
    }
  },

  zoomOut: () => {
    const { canvasTransform } = get();
    const newScale = Math.max(canvasTransform.scale / 1.2, 0.1);
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const worldX = (centerX - canvasTransform.translateX) / canvasTransform.scale;
      const worldY = (centerY - canvasTransform.translateY) / canvasTransform.scale;
      set({
        canvasTransform: {
          scale: newScale,
          translateX: centerX - worldX * newScale,
          translateY: centerY - worldY * newScale,
        }
      });
    } else {
      set({
        canvasTransform: {
          ...canvasTransform,
          scale: newScale,
        }
      });
    }
  },

  setAssets: (assets) => {
    set({ assets });
    localStorage.setItem('whiteboard-assets', JSON.stringify(assets));
  },

  loadAssets: () => {
    try {
      const saved = localStorage.getItem('whiteboard-assets');
      if (saved) {
        const assets = JSON.parse(saved);
        set({ assets });
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  },

  addAsset: (assetData) => {
    const { assets } = get();
    const newAsset: Asset = {
      ...assetData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      usageCount: 0
    };
    const newAssets = [...assets, newAsset];
    set({ assets: newAssets });
    localStorage.setItem('whiteboard-assets', JSON.stringify(newAssets));
  },

  deleteAsset: (assetId) => {
    const { assets } = get();
    const newAssets = assets.filter(a => a.id !== assetId);
    set({ assets: newAssets });
    localStorage.setItem('whiteboard-assets', JSON.stringify(newAssets));
  },

  updateAsset: (assetId, updates) => {
    const { assets } = get();
    const newAssets = assets.map(a =>
      a.id === assetId ? { ...a, ...updates } : a
    );
    set({ assets: newAssets });
    localStorage.setItem('whiteboard-assets', JSON.stringify(newAssets));
  },

  insertAssetToCanvas: (assetId, x, y) => {
    const { assets, addElement, updateAsset } = get();
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    const maxWidth = 300;
    const maxHeight = 300;
    let width = asset.width;
    let height = asset.height;
    if (width > maxWidth) {
      height = (maxWidth / width) * height;
      width = maxWidth;
    }
    if (height > maxHeight) {
      width = (maxHeight / height) * width;
      height = maxHeight;
    }

    const element: BoardElement = {
      id: uuidv4(),
      type: 'image',
      x,
      y,
      width,
      height,
      imageSrc: asset.dataUrl,
      stroke: 'transparent',
      strokeWidth: 0,
      fill: 'transparent'
    };

    addElement(element);
    updateAsset(assetId, { usageCount: asset.usageCount + 1 });
  },

  setShowTimerPanel: (show) => set({ showTimerPanel: show }),

  setTimerState: (state) => {
    const { timerState } = get();
    set({ timerState: { ...timerState, ...state } });
  },

  setTimerSettings: (settings) => {
    const { timerSettings } = get();
    set({ timerSettings: { ...timerSettings, ...settings } });
  },

  addTimerPhase: (phase) => {
    const { timerState, canEdit } = get();
    if (!canEdit) return;
    const newPhase: TimerPhase = {
      ...phase,
      id: Math.random().toString(36).substr(2, 9)
    };
    const phases = [...timerState.phases, newPhase];
    const totalDuration = phases.reduce((sum, p) => sum + p.duration, 0);
    set({
      timerState: {
        ...timerState,
        phases,
        totalDuration,
        remainingTime: timerState.currentPhaseIndex === phases.length - 1 ? newPhase.duration : timerState.remainingTime
      }
    });
    socketService.updateTimerState({ ...timerState, phases, totalDuration });
  },

  updateTimerPhase: (phaseId, updates) => {
    const { timerState, canEdit } = get();
    if (!canEdit) return;
    const phases = timerState.phases.map(p =>
      p.id === phaseId ? { ...p, ...updates } : p
    );
    const totalDuration = phases.reduce((sum, p) => sum + p.duration, 0);
    const currentPhase = phases[timerState.currentPhaseIndex];
    set({
      timerState: {
        ...timerState,
        phases,
        totalDuration,
        remainingTime: currentPhase ? currentPhase.duration : timerState.remainingTime
      }
    });
    socketService.updateTimerState({ ...timerState, phases, totalDuration });
  },

  deleteTimerPhase: (phaseId) => {
    const { timerState, canEdit } = get();
    if (!canEdit) return;
    const phases = timerState.phases.filter(p => p.id !== phaseId);
    const totalDuration = phases.reduce((sum, p) => sum + p.duration, 0);
    const newIndex = Math.min(timerState.currentPhaseIndex, Math.max(0, phases.length - 1));
    const currentPhase = phases[newIndex];
    set({
      timerState: {
        ...timerState,
        phases,
        totalDuration,
        currentPhaseIndex: newIndex,
        remainingTime: currentPhase ? currentPhase.duration : 0
      }
    });
    socketService.updateTimerState({ ...timerState, phases, totalDuration, currentPhaseIndex: newIndex });
  },

  reorderTimerPhases: (phases) => {
    const { timerState, canEdit } = get();
    if (!canEdit) return;
    const totalDuration = phases.reduce((sum, p) => sum + p.duration, 0);
    set({
      timerState: {
        ...timerState,
        phases,
        totalDuration
      }
    });
    socketService.updateTimerState({ ...timerState, phases, totalDuration });
  },

  startTimer: () => {
    const { timerState, canEdit } = get();
    if (!canEdit || timerState.phases.length === 0) return;
    
    const currentPhase = timerState.phases[timerState.currentPhaseIndex];
    const now = Date.now();
    const startTime = timerState.isPaused ? now - (currentPhase.duration - timerState.remainingTime) * 1000 : now;
    
    const newState = {
      ...timerState,
      isRunning: true,
      isPaused: false,
      startTime,
      remainingTime: timerState.isPaused ? timerState.remainingTime : currentPhase.duration
    };
    
    set({ timerState: newState });
    socketService.startTimer(newState);
  },

  pauseTimer: () => {
    const { timerState, canEdit } = get();
    if (!canEdit || !timerState.isRunning) return;
    
    const newState = {
      ...timerState,
      isRunning: false,
      isPaused: true
    };
    
    set({ timerState: newState });
    socketService.pauseTimer(newState);
  },

  resumeTimer: () => {
    const { timerState, canEdit } = get();
    if (!canEdit || !timerState.isPaused) return;
    
    const currentPhase = timerState.phases[timerState.currentPhaseIndex];
    const now = Date.now();
    const startTime = now - (currentPhase.duration - timerState.remainingTime) * 1000;
    
    const newState = {
      ...timerState,
      isRunning: true,
      isPaused: false,
      startTime
    };
    
    set({ timerState: newState });
    socketService.resumeTimer(newState);
  },

  resetTimer: () => {
    const { timerState, canEdit } = get();
    if (!canEdit) return;
    
    const firstPhase = timerState.phases[0];
    const newState = {
      ...timerState,
      isRunning: false,
      isPaused: false,
      currentPhaseIndex: 0,
      startTime: null,
      remainingTime: firstPhase ? firstPhase.duration : 0
    };
    
    set({ timerState: newState });
    socketService.resetTimer(newState);
  },

  nextTimerPhase: () => {
    const { timerState, canEdit } = get();
    if (!canEdit) return;
    
    const nextIndex = timerState.currentPhaseIndex + 1;
    if (nextIndex >= timerState.phases.length) {
      const newState = {
        ...timerState,
        isRunning: false,
        isPaused: false,
        startTime: null
      };
      set({ timerState: newState });
      socketService.timerComplete(newState);
      return;
    }
    
    const nextPhase = timerState.phases[nextIndex];
    const newState = {
      ...timerState,
      currentPhaseIndex: nextIndex,
      remainingTime: nextPhase.duration,
      startTime: timerState.isRunning ? Date.now() : null
    };
    
    set({ timerState: newState });
    socketService.nextTimerPhase(newState);
  },

  prevTimerPhase: () => {
    const { timerState, canEdit } = get();
    if (!canEdit) return;
    
    const prevIndex = Math.max(0, timerState.currentPhaseIndex - 1);
    const prevPhase = timerState.phases[prevIndex];
    const newState = {
      ...timerState,
      currentPhaseIndex: prevIndex,
      remainingTime: prevPhase.duration,
      startTime: timerState.isRunning ? Date.now() : null
    };
    
    set({ timerState: newState });
    socketService.prevTimerPhase(newState);
  },

  goToTimerPhase: (index) => {
    const { timerState, canEdit } = get();
    if (!canEdit || index < 0 || index >= timerState.phases.length) return;
    
    const phase = timerState.phases[index];
    const newState = {
      ...timerState,
      currentPhaseIndex: index,
      remainingTime: phase.duration,
      startTime: timerState.isRunning ? Date.now() : null
    };
    
    set({ timerState: newState });
    socketService.goToTimerPhase(newState);
  },

  syncTimerState: (state) => {
    set({ timerState: state });
  },
}));
