export interface BoardElement {
  id: string;
  type: 'path' | 'rect' | 'circle' | 'text' | 'sticky-note' | 'line' | 'image';
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

export type ToolType = 'select' | 'pen' | 'rect' | 'circle' | 'line' | 'text' | 'sticky-note' | 'eraser';

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
