import { Board, BoardElement, NoteGroup, Poll } from '../types';

interface ExportOptions {
  scale: number;
  padding: number;
  backgroundColor?: string;
  includeComments?: boolean;
  includePolls?: boolean;
  format: 'png' | 'jpeg';
  quality?: number;
}

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function measureTextWidth(ctx: CanvasRenderingContext2D, text: string, fontSize: number = 16): number {
  ctx.save();
  ctx.font = `${fontSize}px sans-serif`;
  const width = ctx.measureText(text).width;
  ctx.restore();
  return width;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  
  paragraphs.forEach((paragraph) => {
    if (paragraph === '') {
      lines.push('');
      return;
    }
    
    const words = paragraph.split('');
    let currentLine = '';
    
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + words[i];
      const testWidth = ctx.measureText(testLine).width;
      
      if (testWidth > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
  });
  
  return lines;
}

function calculateBoundingBox(
  ctx: CanvasRenderingContext2D,
  elements: BoardElement[],
  noteGroups: NoteGroup[],
  polls: Poll[],
  padding: number
): BoundingBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach((el) => {
    if (el.type === 'path' && el.points && el.points.length >= 4) {
      for (let i = 0; i < el.points.length; i += 2) {
        minX = Math.min(minX, el.points[i]);
        minY = Math.min(minY, el.points[i + 1]);
        maxX = Math.max(maxX, el.points[i]);
        maxY = Math.max(maxY, el.points[i + 1]);
      }
    } else if (el.type === 'line' && el.points && el.points.length >= 4) {
      minX = Math.min(minX, el.points[0], el.points[2]);
      minY = Math.min(minY, el.points[1], el.points[3]);
      maxX = Math.max(maxX, el.points[0], el.points[2]);
      maxY = Math.max(maxY, el.points[1], el.points[3]);
    } else if (el.type === 'circle') {
      const rx = (el.width || 0) / 2;
      const ry = (el.height || 0) / 2;
      minX = Math.min(minX, el.x - rx);
      minY = Math.min(minY, el.y - ry);
      maxX = Math.max(maxX, el.x + rx);
      maxY = Math.max(maxY, el.y + ry);
    } else if (el.type === 'text') {
      const fontSize = el.fontSize || 16;
      const textWidth = el.text ? measureTextWidth(ctx, el.text, fontSize) : 100;
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y - fontSize);
      maxX = Math.max(maxX, el.x + textWidth);
      maxY = Math.max(maxY, el.y + 4);
    } else if (el.type === 'sticky-note') {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + (el.width || 160));
      maxY = Math.max(maxY, el.y + (el.height || 120));
    } else if (el.type === 'task-card') {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + (el.width || 240));
      maxY = Math.max(maxY, el.y + (el.height || 160));
    } else if (el.type === 'image') {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + (el.width || 100));
      maxY = Math.max(maxY, el.y + (el.height || 100));
    } else {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + (el.width || 100));
      maxY = Math.max(maxY, el.y + (el.height || 100));
    }
  });

  noteGroups.forEach((group) => {
    minX = Math.min(minX, group.x);
    minY = Math.min(minY, group.y);
    maxX = Math.max(maxX, group.x + group.width);
    maxY = Math.max(maxY, group.y + (group.collapsed ? 50 : group.height));
  });

  polls.forEach((poll) => {
    const cardWidth = 280;
    const cardHeight = 120 + poll.options.length * 36;
    minX = Math.min(minX, poll.x);
    minY = Math.min(minY, poll.y);
    maxX = Math.max(maxX, poll.x + cardWidth);
    maxY = Math.max(maxY, poll.y + cardHeight);
  });

  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 600;
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  };
}

function setupContextQuality(ctx: CanvasRenderingContext2D) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.textBaseline = 'alphabetic';
}

function renderElement(ctx: CanvasRenderingContext2D, el: BoardElement) {
  ctx.save();
  setupContextQuality(ctx);
  
  ctx.globalAlpha = el.opacity ?? 1;
  ctx.strokeStyle = el.stroke || '#000';
  ctx.fillStyle = el.fill || 'transparent';
  ctx.lineWidth = el.strokeWidth || 2;

  switch (el.type) {
    case 'path':
      if (el.points && el.points.length >= 4) {
        ctx.beginPath();
        ctx.moveTo(el.points[0], el.points[1]);
        for (let i = 2; i < el.points.length; i += 2) {
          ctx.lineTo(el.points[i], el.points[i + 1]);
        }
        ctx.stroke();
      }
      break;
    case 'rect':
      ctx.beginPath();
      ctx.rect(el.x, el.y, el.width || 0, el.height || 0);
      if (el.fill && el.fill !== 'transparent') ctx.fill();
      ctx.stroke();
      break;
    case 'circle':
      ctx.beginPath();
      ctx.ellipse(el.x, el.y, (el.width || 0) / 2, (el.height || 0) / 2, 0, 0, Math.PI * 2);
      if (el.fill && el.fill !== 'transparent') ctx.fill();
      ctx.stroke();
      break;
    case 'line':
      if (el.points && el.points.length >= 4) {
        ctx.beginPath();
        ctx.moveTo(el.points[0], el.points[1]);
        ctx.lineTo(el.points[2], el.points[3]);
        ctx.stroke();
      }
      break;
    case 'sticky-note':
      ctx.fillStyle = el.fill || '#FFF59D';
      ctx.fillRect(el.x, el.y, el.width || 160, el.height || 120);
      ctx.strokeStyle = el.stroke || '#F9A825';
      ctx.lineWidth = 1;
      ctx.strokeRect(el.x, el.y, el.width || 160, el.height || 120);
      if (el.text) {
        ctx.fillStyle = '#333';
        ctx.font = '14px sans-serif';
        const maxWidth = (el.width || 160) - 20;
        const lines = wrapText(ctx, el.text, maxWidth);
        const lineHeight = 20;
        lines.slice(0, 5).forEach((line, index) => {
          ctx.fillText(line, el.x + 10, el.y + 30 + index * lineHeight);
        });
      }
      break;
    case 'text':
      if (el.text) {
        ctx.fillStyle = el.fill || '#000';
        ctx.font = `${el.fontSize || 16}px sans-serif`;
        ctx.fillText(el.text, el.x, el.y);
      }
      break;
    case 'task-card':
      ctx.fillStyle = el.fill || '#ffffff';
      ctx.fillRect(el.x, el.y, el.width || 240, el.height || 160);
      ctx.strokeStyle = el.stroke || '#9ca3af';
      ctx.lineWidth = el.strokeWidth || 2;
      ctx.strokeRect(el.x, el.y, el.width || 240, el.height || 160);
      if (el.taskData) {
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 14px sans-serif';
        const titleMaxWidth = (el.width || 240) - 24;
        const titleLines = wrapText(ctx, el.taskData.title || '新任务', titleMaxWidth);
        ctx.fillText(titleLines[0] || '新任务', el.x + 12, el.y + 28);
        
        if (el.taskData.description) {
          ctx.fillStyle = '#6b7280';
          ctx.font = '12px sans-serif';
          const descMaxWidth = (el.width || 240) - 24;
          const descLines = wrapText(ctx, el.taskData.description, descMaxWidth);
          descLines.slice(0, 3).forEach((line, index) => {
            ctx.fillText(line, el.x + 12, el.y + 50 + index * 18);
          });
        }
        const statusColors: Record<string, string> = {
          todo: '#f59e0b',
          'in-progress': '#3b82f6',
          done: '#10b981',
        };
        const statusLabels: Record<string, string> = {
          todo: '待办',
          'in-progress': '进行中',
          done: '已完成',
        };
        ctx.fillStyle = statusColors[el.taskData.status] || '#9ca3af';
        ctx.beginPath();
        ctx.roundRect(el.x + 12, el.y + (el.height || 160) - 32, 60, 20, 4);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '11px sans-serif';
        ctx.fillText(statusLabels[el.taskData.status] || el.taskData.status, el.x + 20, el.y + (el.height || 160) - 18);
      }
      break;
    case 'image':
      if (el.imageSrc) {
        const exportImageCache = (window as any).__exportImageCache || new Map();
        (window as any).__exportImageCache = exportImageCache;
        
        let img = exportImageCache.get(el.imageSrc);
        if (!img) {
          img = new Image();
          img.src = el.imageSrc;
          img.crossOrigin = 'anonymous';
          exportImageCache.set(el.imageSrc, img);
        }
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, el.x, el.y, el.width || 100, el.height || 100);
        } else {
          ctx.fillStyle = '#f3f4f6';
          ctx.fillRect(el.x, el.y, el.width || 100, el.height || 100);
          ctx.strokeStyle = '#d1d5db';
          ctx.strokeRect(el.x, el.y, el.width || 100, el.height || 100);
        }
      }
      break;
  }
  ctx.restore();
}

function renderNoteGroup(ctx: CanvasRenderingContext2D, group: NoteGroup) {
  ctx.save();
  setupContextQuality(ctx);
  
  ctx.fillStyle = group.color;
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(group.x, group.y, group.width, group.collapsed ? 50 : group.height, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#374151';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(group.title, group.x + 16, group.y + 28);

  ctx.fillStyle = '#6b7280';
  ctx.font = '12px sans-serif';
  ctx.fillText(`${group.elementIds.length} 个便签`, group.x + 16, group.y + 46);
  ctx.restore();
}

function renderPoll(ctx: CanvasRenderingContext2D, poll: Poll) {
  ctx.save();
  setupContextQuality(ctx);
  
  const cardWidth = 280;
  const cardHeight = 120 + poll.options.length * 36;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(poll.x, poll.y, cardWidth, cardHeight, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#374151';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(poll.question, poll.x + 16, poll.y + 32);

  poll.options.forEach((option, index) => {
    const optionY = poll.y + 56 + index * 36;
    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
    const percentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0;

    ctx.fillStyle = '#f3f4f6';
    ctx.beginPath();
    ctx.roundRect(poll.x + 16, optionY, cardWidth - 32, 28, 6);
    ctx.fill();

    ctx.fillStyle = '#667eea';
    ctx.beginPath();
    ctx.roundRect(poll.x + 16, optionY, (cardWidth - 32) * (percentage / 100), 28, 6);
    ctx.fill();

    ctx.fillStyle = '#374151';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${option.text} (${option.votes.length}票)`, poll.x + 24, optionY + 18);
  });

  if (poll.closed) {
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('已关闭', poll.x + cardWidth - 56, poll.y + 20);
  }

  ctx.restore();
}

async function preloadImages(elements: BoardElement[]): Promise<void> {
  const imageElements = elements.filter(el => el.type === 'image' && el.imageSrc);
  
  const loadPromises = imageElements.map((el) => {
    return new Promise<void>((resolve) => {
      const exportImageCache = (window as any).__exportImageCache || new Map();
      (window as any).__exportImageCache = exportImageCache;
      
      let img = exportImageCache.get(el.imageSrc);
      if (!img) {
        img = new Image();
        img.src = el.imageSrc;
        img.crossOrigin = 'anonymous';
        exportImageCache.set(el.imageSrc, img);
      }
      
      if (img.complete && img.naturalWidth > 0) {
        resolve();
      } else {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      }
    });
  });
  
  await Promise.all(loadPromises);
}

export async function exportBoardToImage(
  board: Board,
  noteGroups: NoteGroup[],
  options: ExportOptions
): Promise<string> {
  const allElements = board.layers.flatMap((layer) => layer.elements);
  const polls = options.includePolls ? board.polls || [] : [];

  await preloadImages(allElements);

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) {
    throw new Error('无法创建 canvas 上下文');
  }

  const bbox = calculateBoundingBox(tempCtx, allElements, noteGroups, polls, options.padding);

  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;

  const dpr = window.devicePixelRatio || 1;
  const finalScale = options.scale * dpr;
  
  const scaledWidth = Math.round(width * finalScale);
  const scaledHeight = Math.round(height * finalScale);

  const canvas = document.createElement('canvas');
  canvas.width = scaledWidth;
  canvas.height = scaledHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法创建 canvas 上下文');
  }

  setupContextQuality(ctx);

  ctx.scale(finalScale, finalScale);
  ctx.translate(-bbox.minX, -bbox.minY);

  ctx.fillStyle = options.backgroundColor || board.backgroundColor || '#f5f5f5';
  ctx.fillRect(bbox.minX, bbox.minY, width, height);

  noteGroups.forEach((group) => renderNoteGroup(ctx, group));

  board.layers.forEach((layer) => {
    if (!layer.visible) return;
    layer.elements.forEach((el) => renderElement(ctx, el));
  });

  if (options.includePolls) {
    polls.forEach((poll) => renderPoll(ctx, poll));
  }

  const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const quality = options.format === 'jpeg' ? (options.quality || 0.92) : undefined;

  return canvas.toDataURL(mimeType, quality);
}

export function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const exportPresets = {
  standard: { label: '标准 (1x)', scale: 1, padding: 40 },
  high: { label: '高清 (2x)', scale: 2, padding: 40 },
  ultra: { label: '超清 (4x)', scale: 4, padding: 60 },
};
