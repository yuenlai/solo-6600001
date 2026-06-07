const { v4: uuidv4 } = require('uuid');
const { readBoards } = require('../storage');

const activeUsers = new Map(); // boardId -> Set of socket ids
const cursorPositions = new Map(); // socketId -> { x, y, username, boardId, canEdit }

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
      
      cursorPositions.set(socket.id, { x: 0, y: 0, username, boardId, canEdit });
      
      // Notify others in the room
      socket.to(`board:${boardId}`).emit('user-joined', { socketId: socket.id, username, canEdit });
      
      // Send current active users to the joiner
      const users = [];
      for (const [sid, data] of cursorPositions) {
        if (data.boardId === boardId && sid !== socket.id) {
          users.push({ socketId: sid, username: data.username, x: data.x, y: data.y, canEdit: data.canEdit });
        }
      }
      socket.emit('active-users', users);
      socket.emit('permission-update', { canEdit });
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
    });

    socket.on('update-comment', ({ boardId, commentId, updates }) => {
      socket.to(`board:${boardId}`).emit('comment-updated', { commentId, updates });
    });

    socket.on('add-reply', ({ boardId, commentId, reply }) => {
      socket.to(`board:${boardId}`).emit('reply-added', { commentId, reply });
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
    });

    socket.on('restore-snapshot', ({ boardId, layers }) => {
      const pos = cursorPositions.get(socket.id);
      if (!pos || !pos.canEdit) {
        socket.emit('error', { message: 'You do not have permission to edit this board' });
        return;
      }
      socket.to(`board:${boardId}`).emit('snapshot-restored', { layers });
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
      }
      console.log(`User disconnected: ${socket.id}`);
    });
  });
}

module.exports = { setupSocketHandlers };
