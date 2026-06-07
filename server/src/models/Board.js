const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  id: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  authorId: { type: String, required: true },
  createdAt: { type: String, required: true },
  isGuest: { type: Boolean, default: false }
});

const commentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  targetType: { type: String, enum: ['element', 'canvas'], required: true },
  targetId: { type: String, default: null },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  authorId: { type: String, required: true },
  createdAt: { type: String, required: true },
  resolved: { type: Boolean, default: false },
  replies: [replySchema],
  isGuest: { type: Boolean, default: false }
});

const layerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  visible: { type: Boolean, default: true },
  locked: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  elements: [{ type: mongoose.Schema.Types.Mixed }]
}, { timestamps: true });

const snapshotSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  layers: [layerSchema],
  createdAt: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdById: { type: String, required: true }
});

const pollOptionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  votes: [{ type: String }]
});

const pollSchema = new mongoose.Schema({
  id: { type: String, required: true },
  targetType: { type: String, enum: ['element', 'canvas'], required: true },
  targetId: { type: String, default: null },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  question: { type: String, required: true },
  options: [pollOptionSchema],
  isMultipleChoice: { type: Boolean, default: false },
  isAnonymous: { type: Boolean, default: false },
  author: { type: String, required: true },
  authorId: { type: String, required: true },
  createdAt: { type: String, required: true },
  closed: { type: Boolean, default: false },
  closedAt: { type: String }
});

const boardSchema = new mongoose.Schema({
  name: { type: String, required: true, default: 'Untitled Board' },
  ownerId: { type: String, required: true },
  collaborators: [{ type: String }],
  layers: [layerSchema],
  comments: [commentSchema],
  snapshots: [snapshotSchema],
  polls: [pollSchema],
  width: { type: Number, default: 3000 },
  height: { type: Number, default: 2000 },
  backgroundColor: { type: String, default: '#ffffff' },
  isShared: { type: Boolean, default: false },
  shareToken: { type: String, default: null },
  sharePermission: { type: String, default: 'view', enum: ['view', 'edit'] },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Board', boardSchema);
