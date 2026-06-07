const express = require('express');
const router = express.Router();
const Board = require('../models/Board');
const { getTemplates, getTemplateById } = require('../templates');

router.get('/', (req, res) => {
  try {
    const templates = getTemplates();
    const simplified = templates.map((t) => ({
      _id: t._id,
      name: t.name,
      description: t.description,
      category: t.category,
      thumbnail: t.thumbnail,
      icon: t.icon,
      width: t.width,
      height: t.height,
      backgroundColor: t.backgroundColor,
    }));
    res.json(simplified);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const template = getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/create', async (req, res) => {
  try {
    const { name, ownerId } = req.body;
    const template = getTemplateById(req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const board = new Board({
      name: name || template.name,
      ownerId,
      width: template.width,
      height: template.height,
      backgroundColor: template.backgroundColor,
      layers: template.layers,
    });

    await board.save();
    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
