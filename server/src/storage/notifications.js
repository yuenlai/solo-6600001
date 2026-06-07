const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '../../data');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

const readNotifications = () => {
  ensureDataDir();
  if (!fs.existsSync(NOTIFICATIONS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(NOTIFICATIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[Storage] Error reading notifications file:', error);
    return [];
  }
};

const writeNotifications = (notifications) => {
  ensureDataDir();
  try {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2), 'utf8');
  } catch (error) {
    console.error('[Storage] Error writing notifications file:', error);
    throw error;
  }
};

class NotificationStorage {
  static createNotification(data) {
    const notifications = readNotifications();
    const notification = {
      id: uuidv4(),
      type: data.type,
      boardId: data.boardId,
      boardName: data.boardName,
      title: data.title,
      content: data.content,
      fromUser: data.fromUser,
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      read: false,
      createdAt: new Date().toISOString(),
      linkData: data.linkData || null,
    };
    notifications.unshift(notification);
    writeNotifications(notifications);
    return notification;
  }

  static getNotificationsForUser(userId) {
    const notifications = readNotifications();
    return notifications.filter((n) => n.toUserId === userId);
  }

  static markAsRead(notificationId) {
    const notifications = readNotifications();
    const index = notifications.findIndex((n) => n.id === notificationId);
    if (index >= 0) {
      notifications[index].read = true;
      writeNotifications(notifications);
      return notifications[index];
    }
    return null;
  }

  static markAllAsRead(userId) {
    const notifications = readNotifications();
    const updated = notifications.map((n) =>
      n.toUserId === userId ? { ...n, read: true } : n
    );
    writeNotifications(updated);
    return updated.filter((n) => n.toUserId === userId);
  }

  static deleteNotification(notificationId) {
    const notifications = readNotifications();
    const filtered = notifications.filter((n) => n.id !== notificationId);
    writeNotifications(filtered);
    return true;
  }

  static getUnreadCount(userId) {
    const notifications = readNotifications();
    return notifications.filter((n) => n.toUserId === userId && !n.read).length;
  }
}

module.exports = {
  NotificationStorage,
  readNotifications,
};
