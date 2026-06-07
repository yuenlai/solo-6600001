const express = require('express');
const router = express.Router();
const { Team, Board } = require('../storage');

// Get all teams for a user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const teams = await Team.find({
      $or: [{ ownerId: userId }, { members: userId }]
    }).sort({ updatedAt: -1 }).exec();
    console.log(`[Teams] Fetched ${teams.length} teams for user ${userId}`);
    res.json(teams);
  } catch (err) {
    console.error('[Teams] Error fetching teams:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get a single team
router.get('/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new team
router.post('/', async (req, res) => {
  try {
    const { name, description, ownerId } = req.body;

    if (!name || !ownerId) {
      return res.status(400).json({ error: 'name and ownerId are required' });
    }

    const team = new Team({
      name,
      description: description || '',
      ownerId,
      members: [ownerId],
      admins: [ownerId],
    });

    const savedTeam = await team.save();
    console.log(`[Teams] Created team: ${savedTeam._id}, name: ${savedTeam.name}`);
    res.status(201).json(savedTeam);
  } catch (err) {
    console.error('[Teams] Error creating team:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update a team
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    const team = await Team.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    console.log(`[Teams] Updated team: ${req.params.id}`);
    res.json(team);
  } catch (err) {
    console.error('[Teams] Error updating team:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a team
router.delete('/:id', async (req, res) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    
    // Also update all boards in this team to remove teamId
    const boards = await Board.find({ teamId: req.params.id }).exec();
    for (const board of boards) {
      await Board.findByIdAndUpdate(board._id, { teamId: null });
    }
    
    console.log(`[Teams] Deleted team: ${req.params.id}, updated ${boards.length} boards`);
    res.json({ message: 'Team deleted' });
  } catch (err) {
    console.error('[Teams] Error deleting team:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add members to team
router.post('/:id/members', async (req, res) => {
  try {
    const { memberIds } = req.body;
    if (!memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({ error: 'memberIds array is required' });
    }

    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const currentMembers = team.members || [];
    const newMembers = [...new Set([...currentMembers, ...memberIds])];

    const updatedTeam = await Team.findByIdAndUpdate(
      req.params.id,
      { members: newMembers },
      { new: true }
    );

    console.log(`[Teams] Added ${memberIds.length} members to team ${req.params.id}`);
    res.json(updatedTeam);
  } catch (err) {
    console.error('[Teams] Error adding members:', err);
    res.status(500).json({ error: err.message });
  }
});

// Remove a member from team
router.delete('/:id/members/:memberId', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    if (team.ownerId === req.params.memberId) {
      return res.status(400).json({ error: 'Cannot remove team owner' });
    }

    const updatedMembers = (team.members || []).filter((m) => m !== req.params.memberId);
    const updatedAdmins = (team.admins || []).filter((a) => a !== req.params.memberId);

    const updatedTeam = await Team.findByIdAndUpdate(
      req.params.id,
      { members: updatedMembers, admins: updatedAdmins },
      { new: true }
    );

    console.log(`[Teams] Removed member ${req.params.memberId} from team ${req.params.id}`);
    res.json(updatedTeam);
  } catch (err) {
    console.error('[Teams] Error removing member:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add admins to team
router.post('/:id/admins', async (req, res) => {
  try {
    const { adminIds } = req.body;
    if (!adminIds || !Array.isArray(adminIds)) {
      return res.status(400).json({ error: 'adminIds array is required' });
    }

    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const currentAdmins = team.admins || [];
    const currentMembers = team.members || [];
    const newAdmins = [...new Set([...currentAdmins, ...adminIds])];
    const newMembers = [...new Set([...currentMembers, ...adminIds])];

    const updatedTeam = await Team.findByIdAndUpdate(
      req.params.id,
      { admins: newAdmins, members: newMembers },
      { new: true }
    );

    console.log(`[Teams] Added ${adminIds.length} admins to team ${req.params.id}`);
    res.json(updatedTeam);
  } catch (err) {
    console.error('[Teams] Error adding admins:', err);
    res.status(500).json({ error: err.message });
  }
});

// Remove an admin from team
router.delete('/:id/admins/:adminId', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    if (team.ownerId === req.params.adminId) {
      return res.status(400).json({ error: 'Cannot remove team owner as admin' });
    }

    const updatedAdmins = (team.admins || []).filter((a) => a !== req.params.adminId);

    const updatedTeam = await Team.findByIdAndUpdate(
      req.params.id,
      { admins: updatedAdmins },
      { new: true }
    );

    console.log(`[Teams] Removed admin ${req.params.adminId} from team ${req.params.id}`);
    res.json(updatedTeam);
  } catch (err) {
    console.error('[Teams] Error removing admin:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all boards in a team
router.get('/:id/boards', async (req, res) => {
  try {
    const boards = await Board.find({ teamId: req.params.id }).sort({ updatedAt: -1 }).exec();
    console.log(`[Teams] Fetched ${boards.length} boards for team ${req.params.id}`);
    res.json(boards);
  } catch (err) {
    console.error('[Teams] Error fetching team boards:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
