export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface TaskCardData {
  title: string;
  description?: string;
  assignee?: string;
  assigneeId?: string;
  status: TaskStatus;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export interface BoardElement {
  id: string;
  type: 'path' | 'rect' | 'circle' | 'text' | 'sticky-note' | 'line' | 'image' | 'task-card';
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  points?: number[];
  rotation?: number;
  opacity?: number;
  fontSize?: number;
  fontWeight?: number;
  textAlign?: string;
  lineHeight?: number;
  borderRadius?: number;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  taskData?: TaskCardData;
  imageSrc?: string;
}

export interface Asset {
  id: string;
  name: string;
  type: 'image';
  dataUrl: string;
  width: number;
  height: number;
  createdAt: string;
  usageCount: number;
}

export interface Layer {
  name: string;
  visible: boolean;
  locked: boolean;
  order: number;
  elements: BoardElement[];
}

export type SharePermission = 'view' | 'edit';

export interface Board {
  _id: string;
  name: string;
  ownerId: string;
  teamId: string | null;
  collaborators: string[];
  layers: Layer[];
  comments: Comment[];
  snapshots: Snapshot[];
  polls: Poll[];
  width: number;
  height: number;
  backgroundColor: string;
  createdAt: string;
  updatedAt: string;
  isShared?: boolean;
  shareToken?: string | null;
  sharePermission?: SharePermission;
}

export interface Team {
  _id: string;
  name: string;
  description: string;
  ownerId: string;
  members: string[];
  admins: string[];
  avatarColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  role: 'owner' | 'admin' | 'member';
  avatar?: string;
}

export interface ShareResult {
  shareToken: string;
  shareUrl: string;
  permission: SharePermission;
  board: Board;
}

export type ViewType = 'dashboard' | 'board';

export interface CursorPosition {
  socketId: string;
  username: string;
  x: number;
  y: number;
  isHost?: boolean;
}

export interface HostInfo {
  socketId: string;
  userId: string;
  username: string;
  canvasTransform: CanvasTransform;
  lastUpdatedAt: number;
}

export interface FollowState {
  isFollowing: boolean;
  hostSocketId: string | null;
  hostUsername: string | null;
}

export interface CanvasTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface CommentReply {
  id: string;
  content: string;
  author: string;
  authorId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  targetType: 'element' | 'canvas';
  targetId: string | null;
  x: number;
  y: number;
  content: string;
  author: string;
  authorId: string;
  createdAt: string;
  resolved: boolean;
  replies: CommentReply[];
}

export type ToolType = 'select' | 'pen' | 'rect' | 'circle' | 'line' | 'text' | 'sticky-note' | 'task-card' | 'eraser' | 'comment';

export interface PresentationStep {
  id: string;
  title: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  order: number;
}

export interface Template {
  _id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string;
  icon: string;
  width: number;
  height: number;
  backgroundColor: string;
  layers?: Layer[];
}

export interface MeetingMinutesContent {
  title: string;
  date: string;
  texts: string[];
  stickyNotes: { content: string; color?: string }[];
  comments: { author: string; content: string; createdAt: string; replies: { author: string; content: string; createdAt: string }[] }[];
}

export interface MeetingMinutes {
  content: string;
  generatedAt: string;
}

export interface Snapshot {
  id: string;
  name: string;
  description?: string;
  layers: Layer[];
  createdAt: string;
  createdBy: string;
  createdById: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

export interface Poll {
  id: string;
  targetType: 'element' | 'canvas';
  targetId: string | null;
  x: number;
  y: number;
  question: string;
  options: PollOption[];
  isMultipleChoice: boolean;
  isAnonymous: boolean;
  author: string;
  authorId: string;
  createdAt: string;
  closed: boolean;
  closedAt?: string;
}

export interface NoteGroup {
  id: string;
  title: string;
  elementIds: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  collapsed: boolean;
}

export interface GroupingResult {
  groups: NoteGroup[];
  ungroupedElementIds: string[];
}

export interface SearchResult {
  id: string;
  type: 'element' | 'layer';
  elementType?: BoardElement['type'];
  layerIndex: number;
  layerName: string;
  elementId?: string;
  text: string;
  matchedText: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export type NotificationType = 'invite' | 'comment' | 'task-assign' | 'reply';

export interface Notification {
  id: string;
  type: NotificationType;
  boardId: string;
  boardName: string;
  title: string;
  content: string;
  fromUser: string;
  fromUserId: string;
  toUserId: string;
  read: boolean;
  createdAt: string;
  linkData?: {
    elementId?: string;
    commentId?: string;
    x?: number;
    y?: number;
  };
}

export interface TimerPhase {
  id: string;
  name: string;
  description?: string;
  duration: number;
  color: string;
}

export interface TimerState {
  isRunning: boolean;
  currentPhaseIndex: number;
  phases: TimerPhase[];
  remainingTime: number;
  totalDuration: number;
  startTime: number | null;
  pausedTime: number;
  isPaused: boolean;
}

export interface TimerSettings {
  soundEnabled: boolean;
  warningThreshold: number;
  autoNextPhase: boolean;
}
