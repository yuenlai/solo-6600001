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
  collaborators: string[];
  layers: Layer[];
  comments: Comment[];
  snapshots: Snapshot[];
  width: number;
  height: number;
  backgroundColor: string;
  createdAt: string;
  updatedAt: string;
  isShared?: boolean;
  shareToken?: string | null;
  sharePermission?: SharePermission;
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
