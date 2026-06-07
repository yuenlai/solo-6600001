const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { Board, readBoards } = require('../storage');

// Get all boards for a user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const boards = await Board.find({
      $or: [{ ownerId: userId }, { collaborators: userId }]
    }).sort({ updatedAt: -1 });
    console.log(`[Boards] Fetched ${boards.length} boards for user ${userId}`);
    res.json(boards);
  } catch (err) {
    console.error('[Boards] Error fetching boards:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get a board by share token
router.get('/share/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const boards = readBoards();
    const board = boards.find((b) => b.shareToken === token && b.isShared);
    
    if (!board) {
      return res.status(404).json({ error: 'Board not found or share link expired' });
    }
    
    res.json(board);
  } catch (err) {
    console.error('[Boards] Error fetching shared board:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get a single board
router.get('/:id', async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new board
router.post('/', async (req, res) => {
  try {
    const { name, ownerId, width, height, backgroundColor, layers } = req.body;

    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId is required' });
    }

    const boardData = {
      name: name || 'Untitled Board',
      ownerId,
      width: width || 3000,
      height: height || 2000,
      backgroundColor: backgroundColor || '#ffffff',
    };

    if (layers && Array.isArray(layers)) {
      boardData.layers = layers.map((layer) => ({
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        order: layer.order,
        elements: layer.elements,
      }));
    } else {
      boardData.layers = [{ name: 'Layer 1', visible: true, locked: false, order: 0, elements: [] }];
    }

    const board = new Board(boardData);
    const savedBoard = await board.save();
    console.log(`[Boards] Created board: ${savedBoard._id}, name: ${savedBoard.name}, layers: ${savedBoard.layers.length}`);
    res.status(201).json(savedBoard);
  } catch (err) {
    console.error('[Boards] Error creating board:', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate or update share link for a board
router.post('/:id/share', async (req, res) => {
  try {
    const { permission = 'view' } = req.body;
    const board = await Board.findById(req.params.id);
    
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const shareToken = board.shareToken || uuidv4();
    const updatedBoard = await Board.findByIdAndUpdate(
      req.params.id,
      {
        isShared: true,
        shareToken,
        sharePermission: permission
      },
      { new: true }
    );

    console.log(`[Boards] Shared board ${req.params.id} with permission: ${permission}`);
    res.json({
      shareToken,
      shareUrl: `${req.protocol}://${req.get('host')}/share/${shareToken}`,
      permission,
      board: updatedBoard
    });
  } catch (err) {
    console.error('[Boards] Error sharing board:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update share permission
router.put('/:id/share', async (req, res) => {
  try {
    const { permission } = req.body;
    const board = await Board.findById(req.params.id);
    
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    if (!board.isShared || !board.shareToken) {
      return res.status(400).json({ error: 'Board is not shared yet' });
    }

    const updatedBoard = await Board.findByIdAndUpdate(
      req.params.id,
      { sharePermission: permission },
      { new: true }
    );

    console.log(`[Boards] Updated share permission for board ${req.params.id}: ${permission}`);
    res.json(updatedBoard);
  } catch (err) {
    console.error('[Boards] Error updating share permission:', err);
    res.status(500).json({ error: err.message });
  }
});

// Revoke share link
router.delete('/:id/share', async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const updatedBoard = await Board.findByIdAndUpdate(
      req.params.id,
      { isShared: false, shareToken: null },
      { new: true }
    );

    console.log(`[Boards] Revoked share for board ${req.params.id}`);
    res.json({ message: 'Share revoked', board: updatedBoard });
  } catch (err) {
    console.error('[Boards] Error revoking share:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update a board
router.put('/:id', async (req, res) => {
  try {
    const board = await Board.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a board
router.delete('/:id', async (req, res) => {
  try {
    const board = await Board.findByIdAndDelete(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json({ message: 'Board deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all comments for a board
router.get('/:id/comments', async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json(board.comments || []);
  } catch (err) {
    console.error('[Boards] Error fetching comments:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add a new comment to a board
router.post('/:id/comments', async (req, res) => {
  try {
    const { targetType, targetId, x, y, content, author, authorId } = req.body;
    const board = await Board.findById(req.params.id);
    
    if (!board) return res.status(404).json({ error: 'Board not found' });
    
    const newComment = {
      id: uuidv4(),
      targetType: targetType || 'canvas',
      targetId: targetId || null,
      x: x || 0,
      y: y || 0,
      content,
      author: author || 'Anonymous',
      authorId: authorId || 'anonymous',
      createdAt: new Date().toISOString(),
      resolved: false,
      replies: []
    };
    
    const comments = board.comments || [];
    comments.push(newComment);
    
    const updatedBoard = await Board.findByIdAndUpdate(
      req.params.id,
      { comments },
      { new: true }
    );
    
    console.log(`[Boards] Added comment to board ${req.params.id}`);
    res.json(newComment);
  } catch (err) {
    console.error('[Boards] Error adding comment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add a reply to a comment
router.post('/:id/comments/:commentId/replies', async (req, res) => {
  try {
    const { content, author, authorId } = req.body;
    const board = await Board.findById(req.params.id);
    
    if (!board) return res.status(404).json({ error: 'Board not found' });
    
    const comments = board.comments || [];
    const commentIndex = comments.findIndex(c => c.id === req.params.commentId);
    
    if (commentIndex < 0) return res.status(404).json({ error: 'Comment not found' });
    
    const newReply = {
      id: uuidv4(),
      content,
      author: author || 'Anonymous',
      authorId: authorId || 'anonymous',
      createdAt: new Date().toISOString()
    };
    
    comments[commentIndex].replies.push(newReply);
    
    await Board.findByIdAndUpdate(req.params.id, { comments });
    
    console.log(`[Boards] Added reply to comment ${req.params.commentId}`);
    res.json(newReply);
  } catch (err) {
    console.error('[Boards] Error adding reply:', err);
    res.status(500).json({ error: err.message });
  }
});

// Resolve a comment
router.patch('/:id/comments/:commentId/resolve', async (req, res) => {
  try {
    const { resolved } = req.body;
    const board = await Board.findById(req.params.id);
    
    if (!board) return res.status(404).json({ error: 'Board not found' });
    
    const comments = board.comments || [];
    const commentIndex = comments.findIndex(c => c.id === req.params.commentId);
    
    if (commentIndex < 0) return res.status(404).json({ error: 'Comment not found' });
    
    comments[commentIndex].resolved = resolved !== undefined ? resolved : true;
    
    await Board.findByIdAndUpdate(req.params.id, { comments });
    
    console.log(`[Boards] Resolved comment ${req.params.commentId}`);
    res.json(comments[commentIndex]);
  } catch (err) {
    console.error('[Boards] Error resolving comment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a comment
router.delete('/:id/comments/:commentId', async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    
    if (!board) return res.status(404).json({ error: 'Board not found' });
    
    const comments = (board.comments || []).filter(c => c.id !== req.params.commentId);
    
    await Board.findByIdAndUpdate(req.params.id, { comments });
    
    console.log(`[Boards] Deleted comment ${req.params.commentId}`);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('[Boards] Error deleting comment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all snapshots for a board
router.get('/:id/snapshots', async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json(board.snapshots || []);
  } catch (err) {
    console.error('[Boards] Error fetching snapshots:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new snapshot
router.post('/:id/snapshots', async (req, res) => {
  try {
    const { name, description, createdBy, createdById } = req.body;
    const board = await Board.findById(req.params.id);
    
    if (!board) return res.status(404).json({ error: 'Board not found' });
    
    const newSnapshot = {
      id: uuidv4(),
      name: name || `快照 ${(board.snapshots || []).length + 1}`,
      description: description || '',
      layers: JSON.parse(JSON.stringify(board.layers || [])),
      createdAt: new Date().toISOString(),
      createdBy: createdBy || 'Anonymous',
      createdById: createdById || 'anonymous'
    };
    
    const snapshots = board.snapshots || [];
    snapshots.push(newSnapshot);
    
    const updatedBoard = await Board.findByIdAndUpdate(
      req.params.id,
      { snapshots },
      { new: true }
    );
    
    console.log(`[Boards] Created snapshot ${newSnapshot.id} for board ${req.params.id}`);
    res.json(newSnapshot);
  } catch (err) {
    console.error('[Boards] Error creating snapshot:', err);
    res.status(500).json({ error: err.message });
  }
});

// Restore a snapshot
router.post('/:id/snapshots/:snapshotId/restore', async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    
    if (!board) return res.status(404).json({ error: 'Board not found' });
    
    const snapshots = board.snapshots || [];
    const snapshot = snapshots.find(s => s.id === req.params.snapshotId);
    
    if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });
    
    const updatedBoard = await Board.findByIdAndUpdate(
      req.params.id,
      { layers: JSON.parse(JSON.stringify(snapshot.layers)) },
      { new: true }
    );
    
    console.log(`[Boards] Restored snapshot ${req.params.snapshotId} for board ${req.params.id}`);
    res.json(updatedBoard);
  } catch (err) {
    console.error('[Boards] Error restoring snapshot:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update a snapshot (name/description)
router.put('/:id/snapshots/:snapshotId', async (req, res) => {
  try {
    const { name, description } = req.body;
    const board = await Board.findById(req.params.id);
    
    if (!board) return res.status(404).json({ error: 'Board not found' });
    
    const snapshots = board.snapshots || [];
    const snapshotIndex = snapshots.findIndex(s => s.id === req.params.snapshotId);
    
    if (snapshotIndex < 0) return res.status(404).json({ error: 'Snapshot not found' });
    
    snapshots[snapshotIndex] = {
      ...snapshots[snapshotIndex],
      name: name || snapshots[snapshotIndex].name,
      description: description !== undefined ? description : snapshots[snapshotIndex].description
    };
    
    const updatedBoard = await Board.findByIdAndUpdate(
      req.params.id,
      { snapshots },
      { new: true }
    );
    
    console.log(`[Boards] Updated snapshot ${req.params.snapshotId} for board ${req.params.id}`);
    res.json(snapshots[snapshotIndex]);
  } catch (err) {
    console.error('[Boards] Error updating snapshot:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a snapshot
router.delete('/:id/snapshots/:snapshotId', async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    
    if (!board) return res.status(404).json({ error: 'Board not found' });
    
    const snapshots = (board.snapshots || []).filter(s => s.id !== req.params.snapshotId);
    
    await Board.findByIdAndUpdate(req.params.id, { snapshots });
    
    console.log(`[Boards] Deleted snapshot ${req.params.snapshotId} for board ${req.params.id}`);
    res.json({ message: 'Snapshot deleted' });
  } catch (err) {
    console.error('[Boards] Error deleting snapshot:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
