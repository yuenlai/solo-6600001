const COLOR_PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#FF7F50', '#20B2AA', '#FF69B4', '#32CD32',
  '#FF8C00', '#9370DB', '#3CB371', '#FF1493', '#00CED1',
  '#FFB347', '#87CEEB', '#98FB98', '#DEB887', '#F0E68C',
  '#E6E6FA', '#FFA07A', '#B0E0E6', '#D8BFD8', '#90EE90'
];

export const generateColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
};

export const getContrastColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#333333' : '#FFFFFF';
};

export const lightenColor = (hexColor: string, amount: number): string => {
  const hex = hexColor.replace('#', '');
  const num = parseInt(hex, 16);
  let r = (num >> 16) + Math.round(255 * amount);
  let g = ((num >> 8) & 0x00FF) + Math.round(255 * amount);
  let b = (num & 0x0000FF) + Math.round(255 * amount);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

export const darkenColor = (hexColor: string, amount: number): string => {
  const hex = hexColor.replace('#', '');
  const num = parseInt(hex, 16);
  let r = (num >> 16) - Math.round(255 * amount);
  let g = ((num >> 8) & 0x00FF) - Math.round(255 * amount);
  let b = (num & 0x0000FF) - Math.round(255 * amount);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

export const CURSOR_INACTIVE_TIMEOUT = 5000;
export const CURSOR_FADE_TIMEOUT = 30000;

export const isCursorActive = (lastActiveAt: number | undefined): boolean => {
  if (!lastActiveAt) return true;
  return Date.now() - lastActiveAt < CURSOR_INACTIVE_TIMEOUT;
};

export const shouldShowCursor = (lastActiveAt: number | undefined): boolean => {
  if (!lastActiveAt) return true;
  return Date.now() - lastActiveAt < CURSOR_FADE_TIMEOUT;
};
