const { v4: uuidv4 } = require('uuid');
const { readBoards } = require('../storage');
const { NotificationStorage } = require('../storage/notifications');

const activeUsers = new Map(); // boardId -> Set of socket ids
const cursorPositions = new Map(); // socketId -> { x, y, username, boardId, canEdit, userId }
const boardHosts = new Map(); // boardId -> { socketId, userId, username, canvasTransform, lastUpdatedAt }
const boardTimers = new Map(); // boardId -> TimerState

const canUserEdit = (board, userId, isShareAccess) => {
  if (!board) return false;
  if (board.ownerId === userId) return true;
  if (board.collaborators && board.collaborators.includes(userId)) return true;
  if (isShareAccess && board.isShared && board.sharePermission === 'edit') return true;
  return false;
};

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join-board', ({ boardId, username, userId, isShareAccess = false }) => {
      const boards = readBoards();
      const board = boards.find((b) => b._id === boardId);
      const canEdit = canUserEdit(board, userId, isShareAccess);

      socket.join(`board:${boardId}`);
      
      if (!activeUsers.has(boardId)) {
        activeUsers.set(boardId, new Set());
      }
      activeUsers.get(boardId).add(socket.id);
      
      cursorPositions.set(socket.id, { x: 0, y: 0, username, boardId, canEdit, userId });
      
      // Notify others in the room
      socket.to(`board:${boardId}`).emit('user-joined', { socketId: socket.id, username, canEdit });
      
      // Send current active users to the joiner
      const users = [];
      const currentHost = boardHosts.get(boardId);
      for (const [sid, data] of cursorPositions) {
        if (data.boardId === boardId && sid !== socket.id) {
          users.push({ 
            socketId: sid, 
            username: data.username, 
            x: data.x, 
            y: data.y, 
            canEdit: data.canEdit,
            isHost: currentHost && currentHost.socketId === sid
          });
        }
      }
      socket.emit('active-users', users);
      socket.emit('permission-update', { canEdit });
      
      // Send current host info to the joiner
      if (currentHost) {
        socket.emit('host-updated', {
          socketId: currentHost.socketId,
          userId: currentHost.userId,
          username: currentHost.username,
          canvasTransform: currentHost.canvasTransform,
          lastUpdatedAt: currentHost.lastUpdatedAt
        });
      } else {
        socket.emit('host-updated', null);
      }
      
      const currentTimer = boardTimers.get(boardId);
      if (currentTimer) {
        socket.emit('timer-state-updated', currentTimer);
      }
    });

    socket.on('cursor-move', ({ boardId, x, y }) => {
      const pos = cursorPositions.get(socket.id);
      if (pos) {
        pos.x = x;
        pos.y = y;
        socket.to(`board:${boardId}`).emit('cursor-update', {
          socketId: socket.id,
          username: pos.username,
          x, y
        });
      }
    });

    socket.on('draw-element', ({ boardId, element, layerIndex }) => {
      const pos = cursorPositions.get(socket.id);
      if (!pos || !pos.canEdit) {
        socket.emit('error', { message: 'You do not have permission to edit this board' });
        return;
      }
      socket.to(`board:${boardId}`).emit('element-added', { element, layerIndex });
    });

    socket.on('update-element', ({ boardId, elementId, updates, layerIndex }) => {
      const pos = cursorPositions.get(socket.id);
      if (!pos || !pos.canEdit) {
        socket.emit('error', { message: 'You do not have permission to edit this board' });
        return;
      }
      socket.to(`board:${boardId}`).emit('element-updated', { elementId, updates, layerIndex });
    });

    socket.on('delete-element', ({ boardId, elementId, layerIndex }) => {
      const pos = cursorPositions.get(socket.id);
      if (!pos || !pos.canEdit) {
        socket.emit('error', { message: 'You do not have permission to edit this board' });
        return;
      }
      socket.to(`board:${boardId}`).emit('element-deleted', { elementId, layerIndex });
    });

    socket.on('add-sticky-note', ({ boardId, note, layerIndex }) => {
      const pos = cursorPositions.get(socket.id);
      if (!pos || !pos.canEdit) {
        socket.emit('error', { message: 'You do not have permission to edit this board' });
        return;
      }
      socket.to(`board:${boardId}`).emit('sticky-note-added', { note, layerIndex });
    });

    socket.on('add-shape', ({ boardId, shape, layerIndex }) => {
      const pos = cursorPositions.get(socket.id);
      if (!pos || !pos.canEdit) {
        socket.emit('error', { message: 'You do not have permission to edit this board' });
        return;
      }
      socket.to(`board:${boardId}`).emit('shape-added', { shape, layerIndex });
    });

    socket.on('layer-update', ({ boardId, layers }) => {
      const pos = cursorPositions.get(socket.id);
      if (!pos || !pos.canEdit) {
        socket.emit('error', { message: 'You do not have permission to edit this board' });
        return;
      }
      socket.to(`board:${boardId}`).emit('layers-updated', { layers });
    });

    socket.on('canvas-transform', ({ boardId, transform }) => {
      socket.to(`board:${boardId}`).emit('canvas-transformed', { transform });
    });

    socket.on('add-comment', ({ boardId, comment }) => {
      socket.to(`board:${boardId}`).emit('comment-added', { comment });
      
      const boards = readBoards();
      const board = boards.find((b) => b._id === boardId);
      if (board) {
        const pos = cursorPositions.get(socket.id);
        if (comment.targetId && comment.targetId !== 'canvas') {
          const allElements = board.layers.flatMap(layer => layer.elements);
          const element = allElements.find(el => el.id === comment.targetId);
          if (element && element.taskData && element.taskData.assigneeId && element.taskData.assigneeId !== comment.authorId) {
            const notification = NotificationStorage.createNotification({
              type: 'comment',
              boardId,
              boardName: board.name,
              title: `任务收到新评论`,
              content: `${comment.author} 评论了任务「${element.taskData.title}」: ${comment.content}`,
              fromUser: comment.author,
              fromUserId: comment.authorId,
              toUserId: element.taskData.assigneeId,
              linkData: {
                elementId: comment.targetId,
                commentId: comment.id,
                x: comment.x,
                y: comment.y,
              },
            });
            for (const [sid, data] of cursorPositions) {
              if (data.userId === element.taskData.assigneeId) {
                io.to(sid).emit('notification', notification);
              }
            }
          }
        }
      }
    });

    socket.on('update-comment', ({ boardId, commentId, updates }) => {
      socket.to(`board:${boardId}`).emit('comment-updated', { commentId, updates });
    });

    socket.on('add-reply', ({ boardId, commentId, reply }) => {
      socket.to(`board:${boardId}`).emit('reply-added', { commentId, reply });
      
      const boards = readBoards();
      const board = boards.find((b) => b._id === boardId);
      if (board) {
        const comment = (board.comments || []).find(c => c.id === commentId);
        if (comment && comment.authorId !== reply.authorId) {
          const notification = NotificationStorage.createNotification({
            type: 'reply',
            boardId,
            boardName: board.name,
            title: `评论收到新回复`,
            content: `${reply.author} 回复了你: ${reply.content}`,
            fromUser: reply.author,
            fromUserId: reply.authorId,
            toUserId: comment.authorId,
            linkData: {
              commentId,
              x: comment.x,
              y: comment.y,
            },
          });
          for (const [sid, data] of cursorPositions) {
            if (data.userId === comment.authorId) {
              io.to(sid).emit('notification', notification);
            }
          }
        }
      }
    });

    socket.on('resolve-comment', ({ boardId, commentId, resolved }) => {
      socket.to(`board:${boardId}`).emit('comment-resolved', { commentId, resolved });
    });

    socket.on('delete-comment', ({ boardId, commentId }) => {
      socket.to(`board:${boardId}`).emit('comment-deleted', { commentId });
    });

    socket.on('update-task-card', ({ boardId, elementId, taskData, layerIndex }) => {
      const pos = cursorPositions.get(socket.id);
      if (!pos || !pos.canEdit) {
        socket.emit('error', { message: 'You do not have permission to edit this board' });
        return;
      }
      socket.to(`board:${boardId}`).emit('task-card-updated', { elementId, taskData, layerIndex });
      
      if (taskData.assigneeId && taskData.assigneeId !== pos.userId) {
        const boards = readBoards();
        const board = boards.find((b) => b._id === boardId);
        if (board) {
          const notification = NotificationStorage.createNotification({
            type: 'task-assign',
            boardId,
            boardName: board.name,
            title: `你被分配了新任务`,
            content: `${pos.username} 给你分配了任务: ${taskData.title || '未命名任务'}`,
            fromUser: pos.username,
            fromUserId: pos.userId,
            toUserId: taskData.assigneeId,
            linkData: {
              elementId,
            },
          });
          for (const [sid, data] of cursorPositions) {
            if (data.userId === taskData.assigneeId) {
              io.to(sid).emit('notification', notification);
            }
          }
        }
      }
    });

    socket.on('restore-snapshot', ({ boardId, layers }) => {
      const pos = cursorPositions.get(socket.id);
      if (!pos || !pos.canEdit) {
        socket.emit('error', { message: 'You do not have permission to edit this board' });
        return;
      }
      socket.to(`board:${boardId}`).emit('snapshot-restored', { layers });
    });

    socket.on('add-poll', ({ boardId, poll }) => {
      socket.to(`board:${boardId}`).emit('poll-added', { poll });
    });

    socket.on('update-poll', ({ boardId, pollId, updates }) => {
      socket.to(`board:${boardId}`).emit('poll-updated', { pollId, updates });
    });

    socket.on('vote-poll', ({ boardId, pollId, optionIds, userId }) => {
      socket.to(`board:${boardId}`).emit('poll-voted', { pollId, optionIds, userId });
    });

    socket.on('close-poll', ({ boardId, pollId, closed }) => {
      socket.to(`board:${boardId}`).emit('poll-closed', { pollId, closed });
    });

    socket.on('delete-poll', ({ boardId, pollId }) => {
      socket.to(`board:${boardId}`).emit('poll-deleted', { pollId });
    });

    socket.on('set-host', ({ boardId, isHost, userId, username }) => {
      const pos = cursorPositions.get(socket.id);
      if (!pos) return;

      if (isHost) {
        const hostInfo = {
          socketId: socket.id,
          userId,
          username,
          canvasTransform: { scale: 1, translateX: 0, translateY: 0 },
          lastUpdatedAt: Date.now()
        };
        boardHosts.set(boardId, hostInfo);
        io.to(`board:${boardId}`).emit('host-updated', hostInfo);
      } else {
        const currentHost = boardHosts.get(boardId);
        if (currentHost && currentHost.socketId === socket.id) {
          boardHosts.delete(boardId);
          io.to(`board:${boardId}`).emit('host-updated', null);
        }
      }
    });

    socket.on('host-view-update', ({ boardId, transform }) => {
      const currentHost = boardHosts.get(boardId);
      if (!currentHost || currentHost.socketId !== socket.id) return;

      currentHost.canvasTransform = transform;
      currentHost.lastUpdatedAt = Date.now();
      boardHosts.set(boardId, currentHost);

      socket.to(`board:${boardId}`).emit('host-view-updated', {
        hostSocketId: socket.id,
        transform
      });
    });

    socket.on('request-follow-host', ({ boardId, hostSocketId }) => {
      const currentHost = boardHosts.get(boardId);
      if (!currentHost || currentHost.socketId !== hostSocketId) return;

      socket.emit('host-view-updated', {
        hostSocketId: currentHost.socketId,
        transform: currentHost.canvasTransform
      });
    });

    socket.on('stop-following-host', ({ boardId }) => {
    });

    socket.on('timer-state-update', ({ boardId, state }) => {
      const pos = cursorPositions.get(socket.id);
      if (!pos || !pos.canEdit) return;
      boardTimers.set(boardId, state);
      socket.to(`board:${boardId}`).emit('timer-state-updated', state);
    });

    socket.on('timer-start', ({ boardId, state }) => {
      const pos = cursorPositions.get(socket.id);
      if (!pos || !pos.canEdit) return;
      boardTimers.set(boardId, state);
      socket.to(`board:${boardId}`).emit('timer-started', state);
    });

    socket.on('timer-pause', ({ boardId, state }) => {
      const pos = cursorPositions.get(socket.id);
      if (!pos || !pos.canEdit) return;
      boardTimers.set(boardId, state);
      socket.to(`board:${boardId}`).emit('timer-paused', state);
    });

    socket.on('timer-resume', ({ boardId, state }) => {
      const pos = cursorPositions.get(socket.id);
      if (!pos || !pos.canEdit) return;
      boardTimers.set(boardId, state);
      socket.to(`board:${boardId}`).emit('timer-resumed', state);
    });

    socket.on('timer-reset', ({ boardId, state }) => {
      const pos = cursorPositions.get(socket.id);
      if (!pos || !pos.canEdit) return;
      boardTimers.set(boardId, state);
      socket.to(`board:${boardId}`).emit('timer-reset', state);
    });

    socket.on('timer-next-phase', ({ boardId, state }) => {
      const pos = cursorPositions.get(socket.id);
      if (!pos || !pos.canEdit) return;
      boardTimers.set(boardId, state);
      socket.to(`board:${boardId}`).emit('timer-next-phase', state);
    });

    socket.on('timer-prev-phase', ({ boardId, state }) => {
      const pos = cursorPositions.get(socket.id);
      if (!pos || !pos.canEdit) return;
      boardTimers.set(boardId, state);
      socket.to(`board:${boardId}`).emit('timer-prev-phase', state);
    });

    socket.on('timer-goto-phase', ({ boardId, state }) => {
      const pos = cursorPositions.get(socket.id);
      if (!pos || !pos.canEdit) return;
      boardTimers.set(boardId, state);
      socket.to(`board:${boardId}`).emit('timer-goto-phase', state);
    });

    socket.on('timer-complete', ({ boardId, state }) => {
      const pos = cursorPositions.get(socket.id);
      if (!pos || !pos.canEdit) return;
      boardTimers.set(boardId, state);
      socket.to(`board:${boardId}`).emit('timer-complete', state);
    });

    socket.on('disconnect', () => {
      const pos = cursorPositions.get(socket.id);
      if (pos) {
        const { boardId, username } = pos;
        const users = activeUsers.get(boardId);
        if (users) {
          users.delete(socket.id);
          if (users.size === 0) activeUsers.delete(boardId);
        }
        cursorPositions.delete(socket.id);
        socket.to(`board:${boardId}`).emit('user-left', { socketId: socket.id, username });
        
        const currentHost = boardHosts.get(boardId);
        if (currentHost && currentHost.socketId === socket.id) {
          boardHosts.delete(boardId);
          io.to(`board:${boardId}`).emit('host-updated', null);
        }
      }
      console.log(`User disconnected: ${socket.id}`);
    });
  });
}

module.exports = { setupSocketHandlers };
