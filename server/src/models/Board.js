const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  id: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  authorId: { type: String, required: true },
  createdAt: { type: String, required: true }
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
  replies: [replySchema]
});

const layerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  visible: { type: Boolean, default: true },
  locked: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  elements: [{ type: mongoose.Schema.Types.Mixed }]
}, { timestamps: true });

const boardSchema = new mongoose.Schema({
  name: { type: String, required: true, default: 'Untitled Board' },
  ownerId: { type: String, required: true },
  collaborators: [{ type: String }],
  layers: [layerSchema],
  comments: [commentSchema],
  width: { type: Number, default: 3000 },
  height: { type: Number, default: 2000 },
  backgroundColor: { type: String, default: '#ffffff' },
  isShared: { type: Boolean, default: false },
  shareToken: { type: String, default: null },
  sharePermission: { type: String, default: 'view', enum: ['view', 'edit'] }
}, { timestamps: true });

module.exports = mongoose.model('Board', boardSchema);
