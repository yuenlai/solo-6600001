const express = require('express');
const { NotificationStorage } = require('../storage/notifications');

const router = express.Router();

router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = NotificationStorage.getNotificationsForUser(userId);
    res.json(notifications);
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

router.get('/user/:userId/unread-count', async (req, res) => {
  try {
    const { userId } = req.params;
    const count = NotificationStorage.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

router.post('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = NotificationStorage.markAsRead(notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

router.post('/user/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = NotificationStorage.markAllAsRead(userId);
    res.json(notifications);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

router.delete('/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;
    NotificationStorage.deleteNotification(notificationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

router.post('/', async (req, res) => {
  try {
    const notification = NotificationStorage.createNotification(req.body);
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

module.exports = router;
