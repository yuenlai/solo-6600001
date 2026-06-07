import React, { useRef, useEffect, useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useWhiteboardStore } from '../store/whiteboard';
import { socketService } from '../services/socket';
import { BoardElement, Comment } from '../types';
import { CommentPanel } from './CommentPanel';
import { AddCommentModal } from './AddCommentModal';
import { TaskCard, TaskCardEditor } from './TaskCard';
import { VotePoll } from './VotePoll';
import { CreatePollModal } from './CreatePollModal';
import { NoteGroupPanel } from './NoteGroupPanel';
import { ExportModal } from './ExportModal';
import { useMobile } from '../hooks/useMobile';

const imageCache = new Map<string, HTMLImageElement>();

type DragMode = 'none' | 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | 'resize-n' | 'resize-s' | 'resize-w' | 'resize-e';

export const WhiteboardCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const currentPathRef = useRef<number[]>([]);
  const startPosRef = useRef({ x: 0, y: 0 });
  const currentMousePosRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0, translateX: 0, translateY: 0 });
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const lastPanPosRef = useRef({ x: 0, y: 0, time: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const spacePressedRef = useRef(false);
  const dragModeRef = useRef<DragMode>('none');
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const dragStartElementRef = useRef<BoardElement | null>(null);
  const [, forceUpdate] = useState({});
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [editingText, setEditingText] = useState<string>('');
  
  const { isMobile, isSmallScreen } = useMobile();
  
  const touchStartRef = useRef<{
    touches: { x: number; y: number }[];
    initialDistance: number;
    initialScale: number;
    initialTranslateX: number;
    initialTranslateY: number;
    midpoint: { x: number; y: number };
  } | null>(null);
  const lastTapTimeRef = useRef(0);
  const touchTimeoutRef = useRef<number | null>(null);

  const [addingComment, setAddingComment] = useState<{
    position: { x: number; y: number };
    targetType: 'element' | 'canvas';
    targetId: string | null;
  } | null>(null);

  const {
    board, activeTool, strokeColor, fillColor, strokeWidth,
    canvasTransform, addElement, updateElement, deleteElement, canEdit, showCommentPanel, setShowCommentPanel,
    setSelectedCommentId,
    presentationSteps,
    isPresentationMode,
    currentPresentationStepIndex,
    showPresentationPanel,
    showTaskCardEditor,
    setShowTaskCardEditor,
    loadPolls,
    setCanvasTransform,
    followState,
    stopFollowingHost,
    noteGroups,
    searchResults,
    selectedSearchResultId,
    resetView,
    zoomIn,
    zoomOut,
    selectedElementId,
    setSelectedElementId,
    editingElementId,
    setEditingElementId,
  } = useWhiteboardStore();

  const getCanvasPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - canvasTransform.translateX) / canvasTransform.scale,
      y: (e.clientY - rect.top - canvasTransform.translateY) / canvasTransform.scale
    };
  }, [canvasTransform]);

  const getSelectedElement = useCallback((): BoardElement | null => {
    if (!board || !selectedElementId) return null;
    for (let i = board.layers.length - 1; i >= 0; i--) {
      const layer = board.layers[i];
      if (!layer.visible) continue;
      const el = layer.elements.find(e => e.id === selectedElementId);
      if (el) return el;
    }
    return null;
  }, [board, selectedElementId]);

  const getElementBounds = useCallback((el: BoardElement) => {
    let x = el.x, y = el.y, w = el.width || 0, h = el.height || 0;
    if (el.type === 'circle') {
      x = el.x - (el.width || 0) / 2;
      y = el.y - (el.height || 0) / 2;
    } else if (el.type === 'text') {
      w = Math.max(w, 60);
      h = Math.max(h, 24);
      y = el.y - 20;
    }
    return { x, y, w, h };
  }, []);

  const getResizeHandleAtPoint = useCallback((el: BoardElement, x: number, y: number): DragMode => {
    const { x: ex, y: ey, w, h } = getElementBounds(el);
    const handleSize = 10 / canvasTransform.scale;
    const halfHandle = handleSize / 2;

    if (Math.abs(x - ex) < halfHandle && Math.abs(y - ey) < halfHandle) return 'resize-nw';
    if (Math.abs(x - (ex + w)) < halfHandle && Math.abs(y - ey) < halfHandle) return 'resize-ne';
    if (Math.abs(x - ex) < halfHandle && Math.abs(y - (ey + h)) < halfHandle) return 'resize-sw';
    if (Math.abs(x - (ex + w)) < halfHandle && Math.abs(y - (ey + h)) < halfHandle) return 'resize-se';
    if (Math.abs(y - ey) < halfHandle && x > ex && x < ex + w) return 'resize-n';
    if (Math.abs(y - (ey + h)) < halfHandle && x > ex && x < ex + w) return 'resize-s';
    if (Math.abs(x - ex) < halfHandle && y > ey && y < ey + h) return 'resize-w';
    if (Math.abs(x - (ex + w)) < halfHandle && y > ey && y < ey + h) return 'resize-e';
    return 'none';
  }, [getElementBounds, canvasTransform.scale]);

  const findElementAtPoint = useCallback((x: number, y: number): BoardElement | null => {
    if (!board) return null;
    
    for (let i = board.layers.length - 1; i >= 0; i--) {
      const layer = board.layers[i];
      if (!layer.visible) continue;
      
      for (let j = layer.elements.length - 1; j >= 0; j--) {
        const el = layer.elements[j];
        let hit = false;
        
        switch (el.type) {
          case 'rect':
          case 'sticky-note':
          case 'task-card':
            hit = x >= el.x && x <= el.x + (el.width || 0) &&
                  y >= el.y && y <= el.y + (el.height || 0);
            break;
          case 'circle':
            const rx = (el.width || 0) / 2;
            const ry = (el.height || 0) / 2;
            hit = Math.pow((x - el.x) / rx, 2) + Math.pow((y - el.y) / ry, 2) <= 1;
            break;
          case 'text':
            hit = x >= el.x && x <= el.x + 100 && y >= el.y - 20 && y <= el.y;
            break;
          case 'path':
          case 'line':
            hit = false;
            break;
        }
        
        if (hit) return el;
      }
    }
    return null;
  }, [board]);

  const startPanning = useCallback((clientX: number, clientY: number) => {
    if (followState.isFollowing) {
      stopFollowingHost();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    isPanningRef.current = true;
    setIsPanning(true);
    panStartRef.current = {
      x: clientX,
      y: clientY,
      translateX: canvasTransform.translateX,
      translateY: canvasTransform.translateY
    };
    lastPanPosRef.current = { x: clientX, y: clientY, time: Date.now() };
    velocityRef.current = { vx: 0, vy: 0 };
  }, [canvasTransform, followState.isFollowing, stopFollowingHost]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (e.button === 0 && (e.altKey || spacePressedRef.current))) {
      e.preventDefault();
      startPanning(e.clientX, e.clientY);
      return;
    }

    const point = getCanvasPoint(e);

    if (activeTool === 'comment' && !isPresentationMode) {
      const element = findElementAtPoint(point.x, point.y);
      setAddingComment({
        position: point,
        targetType: element ? 'element' : 'canvas',
        targetId: element?.id || null
      });
      return;
    }

    if (!canEdit || isPresentationMode) return;

    if (activeTool === 'select') {
      const selectedEl = getSelectedElement();
      if (selectedEl) {
        const resizeHandle = getResizeHandleAtPoint(selectedEl, point.x, point.y);
        if (resizeHandle !== 'none') {
          dragModeRef.current = resizeHandle;
          dragStartPosRef.current = { x: point.x, y: point.y };
          dragStartElementRef.current = { ...selectedEl };
          return;
        }
        const bounds = getElementBounds(selectedEl);
        if (point.x >= bounds.x && point.x <= bounds.x + bounds.w &&
            point.y >= bounds.y && point.y <= bounds.y + bounds.h) {
          dragModeRef.current = 'move';
          dragStartPosRef.current = { x: point.x, y: point.y };
          dragStartElementRef.current = { ...selectedEl };
          return;
        }
      }

      const element = findElementAtPoint(point.x, point.y);
      if (element) {
        setSelectedElementId(element.id);
        dragModeRef.current = 'move';
        dragStartPosRef.current = { x: point.x, y: point.y };
        dragStartElementRef.current = { ...element };
      } else {
        setSelectedElementId(null);
      }
      return;
    }

    isDrawingRef.current = true;
    startPosRef.current = point;
    currentPathRef.current = [point.x, point.y];
  }, [canEdit, getCanvasPoint, activeTool, findElementAtPoint, canvasTransform, followState.isFollowing, stopFollowingHost, getSelectedElement, getResizeHandleAtPoint, getElementBounds, setSelectedElementId]);

  const applyInertia = useCallback(() => {
    const friction = 0.95;
    const minVelocity = 0.5;
    
    const animate = () => {
      const { vx, vy } = velocityRef.current;
      if (Math.abs(vx) < minVelocity && Math.abs(vy) < minVelocity) {
        animationFrameRef.current = null;
        return;
      }
      
      const state = useWhiteboardStore.getState();
      const newTranslateX = state.canvasTransform.translateX + vx;
      const newTranslateY = state.canvasTransform.translateY + vy;
      
      state.setCanvasTransform({
        scale: state.canvasTransform.scale,
        translateX: newTranslateX,
        translateY: newTranslateY
      });
      
      velocityRef.current = {
        vx: vx * friction,
        vy: vy * friction
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e);
    currentMousePosRef.current = point;

    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      
      const now = Date.now();
      const dt = now - lastPanPosRef.current.time;
      if (dt > 0) {
        velocityRef.current = {
          vx: (e.clientX - lastPanPosRef.current.x) / dt * 16,
          vy: (e.clientY - lastPanPosRef.current.y) / dt * 16
        };
      }
      lastPanPosRef.current = { x: e.clientX, y: e.clientY, time: now };
      
      setCanvasTransform({
        scale: canvasTransform.scale,
        translateX: panStartRef.current.translateX + dx,
        translateY: panStartRef.current.translateY + dy
      });
      return;
    }

    if (dragModeRef.current !== 'none' && dragStartElementRef.current && canEdit) {
      const dx = point.x - dragStartPosRef.current.x;
      const dy = point.y - dragStartPosRef.current.y;
      const startEl = dragStartElementRef.current;
      const updates: Partial<BoardElement> = {};

      if (dragModeRef.current === 'move') {
        if (startEl.type === 'circle') {
          updates.x = startEl.x + dx;
          updates.y = startEl.y + dy;
        } else if (startEl.type === 'text') {
          updates.x = startEl.x + dx;
          updates.y = startEl.y + dy;
        } else {
          updates.x = startEl.x + dx;
          updates.y = startEl.y + dy;
        }
      } else {
        const bounds = getElementBounds(startEl);
        let newX = bounds.x, newY = bounds.y, newW = bounds.w, newH = bounds.h;

        switch (dragModeRef.current) {
          case 'resize-nw':
            newX = bounds.x + dx;
            newY = bounds.y + dy;
            newW = bounds.w - dx;
            newH = bounds.h - dy;
            break;
          case 'resize-ne':
            newY = bounds.y + dy;
            newW = bounds.w + dx;
            newH = bounds.h - dy;
            break;
          case 'resize-sw':
            newX = bounds.x + dx;
            newW = bounds.w - dx;
            newH = bounds.h + dy;
            break;
          case 'resize-se':
            newW = bounds.w + dx;
            newH = bounds.h + dy;
            break;
          case 'resize-n':
            newY = bounds.y + dy;
            newH = bounds.h - dy;
            break;
          case 'resize-s':
            newH = bounds.h + dy;
            break;
          case 'resize-w':
            newX = bounds.x + dx;
            newW = bounds.w - dx;
            break;
          case 'resize-e':
            newW = bounds.w + dx;
            break;
        }

        const minSize = 20;
        if (newW < minSize) {
          if (dragModeRef.current.includes('w')) newX = bounds.x + bounds.w - minSize;
          newW = minSize;
        }
        if (newH < minSize) {
          if (dragModeRef.current.includes('n')) newY = bounds.y + bounds.h - minSize;
          newH = minSize;
        }

        if (startEl.type === 'circle') {
          updates.x = newX + newW / 2;
          updates.y = newY + newH / 2;
          updates.width = newW;
          updates.height = newH;
        } else {
          updates.x = newX;
          updates.y = newY;
          updates.width = newW;
          updates.height = newH;
        }
      }

      updateElement(startEl.id, updates);
      forceUpdate({});
      return;
    }

    socketService.moveCursor(point.x, point.y);

    if (!isDrawingRef.current || !canEdit) {
      forceUpdate({});
      return;
    }
    currentPathRef.current.push(point.x, point.y);
    forceUpdate({});
  }, [canEdit, getCanvasPoint, canvasTransform, setCanvasTransform, updateElement, getElementBounds]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      setIsPanning(false);
      applyInertia();
      return;
    }

    if (dragModeRef.current !== 'none') {
      dragModeRef.current = 'none';
      dragStartElementRef.current = null;
      return;
    }

    if (!isDrawingRef.current || !canEdit) return;
    isDrawingRef.current = false;
    const point = getCanvasPoint(e);
    let element: BoardElement | null = null;

    switch (activeTool) {
      case 'pen':
        element = {
          id: uuidv4(), type: 'path', x: 0, y: 0,
          points: [...currentPathRef.current],
          stroke: strokeColor, strokeWidth, fill: 'transparent'
        };
        break;
      case 'rect':
        element = {
          id: uuidv4(), type: 'rect',
          x: Math.min(startPosRef.current.x, point.x),
          y: Math.min(startPosRef.current.y, point.y),
          width: Math.abs(point.x - startPosRef.current.x),
          height: Math.abs(point.y - startPosRef.current.y),
          fill: fillColor, stroke: strokeColor, strokeWidth
        };
        break;
      case 'circle':
        const cx = (startPosRef.current.x + point.x) / 2;
        const cy = (startPosRef.current.y + point.y) / 2;
        const rx = Math.abs(point.x - startPosRef.current.x) / 2;
        const ry = Math.abs(point.y - startPosRef.current.y) / 2;
        element = {
          id: uuidv4(), type: 'circle', x: cx, y: cy,
          width: rx * 2, height: ry * 2,
          fill: fillColor, stroke: strokeColor, strokeWidth
        };
        break;
      case 'line':
        element = {
          id: uuidv4(), type: 'line',
          x: startPosRef.current.x, y: startPosRef.current.y,
          points: [startPosRef.current.x, startPosRef.current.y, point.x, point.y],
          stroke: strokeColor, strokeWidth, fill: 'transparent'
        };
        break;
      case 'sticky-note':
        element = {
          id: uuidv4(), type: 'sticky-note',
          x: point.x, y: point.y, width: 160, height: 120,
          fill: '#FFF59D', stroke: '#F9A825', strokeWidth: 1, text: '便签内容'
        };
        break;
      case 'task-card':
        element = {
          id: uuidv4(), type: 'task-card',
          x: point.x, y: point.y, width: 240, height: 160,
          fill: '#ffffff', stroke: '#9ca3af', strokeWidth: 2,
          taskData: {
            title: '新任务',
            description: '',
            status: 'todo',
            priority: 'medium',
            assignee: '',
            dueDate: '',
          }
        };
        break;
      case 'text':
        element = {
          id: uuidv4(), type: 'text', x: point.x, y: point.y,
          text: '文本', stroke: strokeColor, fill: strokeColor, strokeWidth: 1
        };
        break;
    }

    if (element) {
      addElement(element);
    }
    currentPathRef.current = [];
  }, [activeTool, strokeColor, fillColor, strokeWidth, addElement, canEdit, getCanvasPoint]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canEdit || isPresentationMode) return;
    if (activeTool !== 'select') return;

    const point = getCanvasPoint(e);
    const element = findElementAtPoint(point.x, point.y);
    
    if (element && (element.type === 'text' || element.type === 'sticky-note')) {
      setSelectedElementId(element.id);
      setEditingElementId(element.id);
      setEditingText(element.text || '');
    }
  }, [canEdit, isPresentationMode, activeTool, getCanvasPoint, findElementAtPoint, setSelectedElementId, setEditingElementId]);

  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchMidpoint = (touch1: React.Touch, touch2: React.Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  const getCanvasPointFromClient = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - canvasTransform.translateX) / canvasTransform.scale,
      y: (clientY - rect.top - canvasTransform.translateY) / canvasTransform.scale
    };
  }, [canvasTransform]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }

    const now = Date.now();
    
    if (e.touches.length === 2) {
      isPanningRef.current = true;
      setIsPanning(true);
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = getTouchDistance(touch1, touch2);
      const midpoint = getTouchMidpoint(touch1, touch2);
      
      touchStartRef.current = {
        touches: [
          { x: touch1.clientX, y: touch1.clientY },
          { x: touch2.clientX, y: touch2.clientY },
        ],
        initialDistance: distance,
        initialScale: canvasTransform.scale,
        initialTranslateX: canvasTransform.translateX,
        initialTranslateY: canvasTransform.translateY,
        midpoint,
      };
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const timeSinceLastTap = now - lastTapTimeRef.current;
      
      if (timeSinceLastTap < 300) {
        lastTapTimeRef.current = 0;
        const point = getCanvasPointFromClient(touch.clientX, touch.clientY);
        const element = findElementAtPoint(point.x, point.y);
        
        if (element && (element.type === 'text' || element.type === 'sticky-note') && canEdit && !isPresentationMode) {
          setSelectedElementId(element.id);
          setEditingElementId(element.id);
          setEditingText(element.text || '');
        } else {
          resetView();
        }
        return;
      }
      
      lastTapTimeRef.current = now;
      
      touchTimeoutRef.current = window.setTimeout(() => {
        if (!isDrawingRef.current && !isPanningRef.current) {
          const point = getCanvasPointFromClient(touch.clientX, touch.clientY);
          const element = findElementAtPoint(point.x, point.y);
          if (element && activeTool === 'select') {
            setSelectedElementId(element.id);
          }
        }
      }, 200);
      
      if (followState.isFollowing) {
        stopFollowingHost();
      }
      
      startPanning(touch.clientX, touch.clientY);
    }
  }, [canvasTransform, canEdit, isPresentationMode, activeTool, findElementAtPoint, getCanvasPointFromClient, resetView, startPanning, followState.isFollowing, stopFollowingHost]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }

    if (e.touches.length === 2 && touchStartRef.current) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = getTouchDistance(touch1, touch2);
      const currentMidpoint = getTouchMidpoint(touch1, touch2);
      
      const scaleDelta = currentDistance / touchStartRef.current.initialDistance;
      let newScale = touchStartRef.current.initialScale * scaleDelta;
      newScale = Math.min(Math.max(newScale, 0.1), 5);
      
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        
        const midX = currentMidpoint.x - rect.left;
        const midY = currentMidpoint.y - rect.top;
        
        const worldX = (touchStartRef.current.midpoint.x - rect.left - touchStartRef.current.initialTranslateX) / touchStartRef.current.initialScale;
        const worldY = (touchStartRef.current.midpoint.y - rect.top - touchStartRef.current.initialTranslateY) / touchStartRef.current.initialScale;
        
        const panDeltaX = currentMidpoint.x - touchStartRef.current.midpoint.x;
        const panDeltaY = currentMidpoint.y - touchStartRef.current.midpoint.y;
        
        const newTranslateX = midX - worldX * newScale + panDeltaX;
        const newTranslateY = midY - worldY * newScale + panDeltaY;
        
        setCanvasTransform({
          scale: newScale,
          translateX: newTranslateX,
          translateY: newTranslateY,
        });
      }
      return;
    }

    if (e.touches.length === 1 && isPanningRef.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - panStartRef.current.x;
      const dy = touch.clientY - panStartRef.current.y;
      
      const now = Date.now();
      const dt = now - lastPanPosRef.current.time;
      if (dt > 0) {
        velocityRef.current = {
          vx: (touch.clientX - lastPanPosRef.current.x) / dt * 16,
          vy: (touch.clientY - lastPanPosRef.current.y) / dt * 16,
        };
      }
      lastPanPosRef.current = { x: touch.clientX, y: touch.clientY, time: now };
      
      setCanvasTransform({
        scale: canvasTransform.scale,
        translateX: panStartRef.current.translateX + dx,
        translateY: panStartRef.current.translateY + dy,
      });
    }
  }, [canvasTransform, setCanvasTransform]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }

    if (e.touches.length === 0) {
      touchStartRef.current = null;
      
      if (isPanningRef.current) {
        isPanningRef.current = false;
        setIsPanning(false);
        applyInertia();
      }
    } else if (e.touches.length === 1 && touchStartRef.current) {
      const touch = e.touches[0];
      panStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        translateX: canvasTransform.translateX,
        translateY: canvasTransform.translateY,
      };
      lastPanPosRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      velocityRef.current = { vx: 0, vy: 0 };
    }
  }, [canvasTransform, applyInertia]);

  const handleCommentMarkerClick = (comment: Comment, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCommentId(comment.id);
    setShowCommentPanel(true);
  };

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvasTransform.translateX, canvasTransform.translateY);
    ctx.scale(canvasTransform.scale, canvasTransform.scale);

    if (board) {
      noteGroups.forEach(group => {
        ctx.save();
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
      });

      board.layers.forEach((layer) => {
        if (!layer.visible) return;
        layer.elements.forEach(el => {
          ctx.save();
          ctx.globalAlpha = el.opacity ?? 1;
          ctx.strokeStyle = el.stroke || '#000';
          ctx.fillStyle = el.fill || 'transparent';
          ctx.lineWidth = el.strokeWidth || 2;
          
          if (el.syncStatus === 'syncing') {
            ctx.shadowColor = 'rgba(33, 150, 243, 0.6)';
            ctx.shadowBlur = 8;
          } else if (el.syncStatus === 'error') {
            ctx.shadowColor = 'rgba(244, 67, 54, 0.6)';
            ctx.shadowBlur = 8;
          }

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
              ctx.strokeRect(el.x, el.y, el.width || 160, el.height || 120);
              if (el.text) {
                ctx.fillStyle = '#333';
                ctx.font = '14px sans-serif';
                ctx.fillText(el.text, el.x + 10, el.y + 30);
              }
              break;
            case 'text':
              if (el.text) {
                ctx.fillStyle = el.fill || '#000';
                ctx.font = '16px sans-serif';
                ctx.fillText(el.text, el.x, el.y);
              }
              break;
            case 'image':
              if (el.imageSrc) {
                let img = imageCache.get(el.imageSrc);
                if (!img) {
                  img = new Image();
                  img.src = el.imageSrc;
                  img.onload = () => {
                    forceUpdate({});
                  };
                  imageCache.set(el.imageSrc, img);
                }
                if (img.complete && img.naturalWidth > 0) {
                  ctx.drawImage(img, el.x, el.y, el.width || 100, el.height || 100);
                } else {
                  ctx.fillStyle = '#f3f4f6';
                  ctx.fillRect(el.x, el.y, el.width || 100, el.height || 100);
                  ctx.strokeStyle = '#d1d5db';
                  ctx.strokeRect(el.x, el.y, el.width || 100, el.height || 100);
                  ctx.fillStyle = '#9ca3af';
                  ctx.font = '12px sans-serif';
                  ctx.textAlign = 'center';
                  ctx.fillText('加载中...', el.x + (el.width || 100) / 2, el.y + (el.height || 100) / 2);
                  ctx.textAlign = 'left';
                }
              }
              break;
          }
          
          if (el.syncStatus === 'syncing' || el.syncStatus === 'error') {
            ctx.shadowBlur = 0;
            const indicatorSize = 12;
            let indicatorX = el.x;
            let indicatorY = el.y - indicatorSize - 4;
            
            if (el.type === 'circle') {
              indicatorX = el.x - (el.width || 0) / 2;
              indicatorY = el.y - (el.height || 0) / 2 - indicatorSize - 4;
            } else if (el.type === 'text') {
              indicatorY = el.y - 20 - indicatorSize - 4;
            }
            
            if (el.type === 'path' || el.type === 'line') {
              if (el.points && el.points.length >= 2) {
                indicatorX = el.points[0];
                indicatorY = el.points[1] - indicatorSize - 4;
              }
            }
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(indicatorX + indicatorSize / 2, indicatorY + indicatorSize / 2, indicatorSize / 2, 0, Math.PI * 2);
            
            if (el.syncStatus === 'syncing') {
              ctx.fillStyle = '#2196f3';
              ctx.fill();
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 1.5;
              ctx.stroke();
              
              const time = Date.now() / 500;
              ctx.beginPath();
              ctx.moveTo(indicatorX + indicatorSize / 2, indicatorY + indicatorSize / 2);
              ctx.arc(indicatorX + indicatorSize / 2, indicatorY + indicatorSize / 2, indicatorSize / 3, -Math.PI / 2, -Math.PI / 2 + time * Math.PI);
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 2;
              ctx.stroke();
            } else if (el.syncStatus === 'error') {
              ctx.fillStyle = '#f44336';
              ctx.fill();
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 1.5;
              ctx.stroke();
              
              ctx.fillStyle = '#fff';
              ctx.font = 'bold 10px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('!', indicatorX + indicatorSize / 2, indicatorY + indicatorSize / 2);
            }
            
            ctx.restore();
          }
          
          ctx.restore();
        });
      });

      if (searchResults.length > 0) {
        searchResults.forEach((result) => {
          if (result.type === 'element' && result.elementId) {
            const isSelected = selectedSearchResultId === result.id;
            ctx.save();
            ctx.strokeStyle = isSelected ? '#2196f3' : 'rgba(33, 150, 243, 0.5)';
            ctx.lineWidth = isSelected ? 3 : 2;
            ctx.setLineDash(isSelected ? [] : [5, 5]);
            
            const x = result.x;
            const y = result.y;
            const w = result.width || 100;
            const h = result.height || 50;
            
            if (result.elementType === 'circle') {
              const rx = w / 2;
              const ry = h / 2;
              ctx.beginPath();
              ctx.ellipse(x, y, rx + 8, ry + 8, 0, 0, Math.PI * 2);
              ctx.stroke();
            } else if (result.elementType === 'text') {
              ctx.beginPath();
              ctx.roundRect(x - 4, y - 20, Math.max(w, 60) + 8, 28, 4);
              ctx.stroke();
            } else {
              ctx.beginPath();
              ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 6);
              ctx.stroke();
            }
            
            if (isSelected) {
              ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
              if (result.elementType === 'circle') {
                const rx = w / 2;
                const ry = h / 2;
                ctx.beginPath();
                ctx.ellipse(x, y, rx + 8, ry + 8, 0, 0, Math.PI * 2);
                ctx.fill();
              } else if (result.elementType === 'text') {
                ctx.beginPath();
                ctx.roundRect(x - 4, y - 20, Math.max(w, 60) + 8, 28, 4);
                ctx.fill();
              } else {
                ctx.beginPath();
                ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 6);
                ctx.fill();
              }
            }
            ctx.restore();
          }
        });
      }

      if (selectedElementId && activeTool === 'select' && !editingElementId) {
        const selectedEl = getSelectedElement();
        if (selectedEl) {
          const bounds = getElementBounds(selectedEl);
          ctx.save();
          ctx.strokeStyle = '#2196f3';
          ctx.lineWidth = 2 / canvasTransform.scale;
          ctx.setLineDash([6 / canvasTransform.scale, 4 / canvasTransform.scale]);
          ctx.strokeRect(bounds.x - 4 / canvasTransform.scale, bounds.y - 4 / canvasTransform.scale, bounds.w + 8 / canvasTransform.scale, bounds.h + 8 / canvasTransform.scale);
          ctx.setLineDash([]);

          const handleSize = 8 / canvasTransform.scale;
          const handles = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.w, y: bounds.y },
            { x: bounds.x, y: bounds.y + bounds.h },
            { x: bounds.x + bounds.w, y: bounds.y + bounds.h },
            { x: bounds.x + bounds.w / 2, y: bounds.y },
            { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h },
            { x: bounds.x, y: bounds.y + bounds.h / 2 },
            { x: bounds.x + bounds.w, y: bounds.y + bounds.h / 2 },
          ];
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#2196f3';
          ctx.lineWidth = 1.5 / canvasTransform.scale;
          handles.forEach(handle => {
            ctx.beginPath();
            ctx.rect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
            ctx.fill();
            ctx.stroke();
          });
          ctx.restore();
        }
      }

      if (canEdit && !isPresentationMode) {
        const mousePos = currentMousePosRef.current;
        const isDrawing = isDrawingRef.current;

        ctx.save();

        if (isDrawing) {
          switch (activeTool) {
            case 'pen':
              if (currentPathRef.current.length >= 2) {
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = strokeWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(currentPathRef.current[0], currentPathRef.current[1]);
                for (let i = 2; i < currentPathRef.current.length; i += 2) {
                  ctx.lineTo(currentPathRef.current[i], currentPathRef.current[i + 1]);
                }
                ctx.stroke();
              }
              break;
            case 'rect':
              const rectX = Math.min(startPosRef.current.x, mousePos.x);
              const rectY = Math.min(startPosRef.current.y, mousePos.y);
              const rectW = Math.abs(mousePos.x - startPosRef.current.x);
              const rectH = Math.abs(mousePos.y - startPosRef.current.y);
              ctx.globalAlpha = 0.6;
              ctx.fillStyle = fillColor;
              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = strokeWidth;
              ctx.setLineDash([5, 5]);
              ctx.beginPath();
              ctx.rect(rectX, rectY, rectW, rectH);
              if (fillColor && fillColor !== 'transparent') ctx.fill();
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.globalAlpha = 1;
              ctx.fillStyle = '#666';
              ctx.font = '12px sans-serif';
              ctx.fillText(`${Math.round(rectW)} × ${Math.round(rectH)}`, rectX + rectW + 8, rectY + 12);
              break;
            case 'circle':
              const cx = (startPosRef.current.x + mousePos.x) / 2;
              const cy = (startPosRef.current.y + mousePos.y) / 2;
              const rx = Math.abs(mousePos.x - startPosRef.current.x) / 2;
              const ry = Math.abs(mousePos.y - startPosRef.current.y) / 2;
              ctx.globalAlpha = 0.6;
              ctx.fillStyle = fillColor;
              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = strokeWidth;
              ctx.setLineDash([5, 5]);
              ctx.beginPath();
              ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
              if (fillColor && fillColor !== 'transparent') ctx.fill();
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.globalAlpha = 1;
              ctx.fillStyle = '#666';
              ctx.font = '12px sans-serif';
              ctx.fillText(`${Math.round(rx * 2)} × ${Math.round(ry * 2)}`, cx + rx + 8, cy - ry + 12);
              break;
            case 'line':
              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = strokeWidth;
              ctx.lineCap = 'round';
              ctx.setLineDash([5, 5]);
              ctx.beginPath();
              ctx.moveTo(startPosRef.current.x, startPosRef.current.y);
              ctx.lineTo(mousePos.x, mousePos.y);
              ctx.stroke();
              ctx.setLineDash([]);
              const lineLength = Math.sqrt(
                Math.pow(mousePos.x - startPosRef.current.x, 2) +
                Math.pow(mousePos.y - startPosRef.current.y, 2)
              );
              ctx.fillStyle = '#666';
              ctx.font = '12px sans-serif';
              ctx.fillText(`${Math.round(lineLength)}px`, mousePos.x + 8, mousePos.y - 8);
              break;
          }
        } else if (isHoveringCanvas) {
          switch (activeTool) {
            case 'sticky-note':
              ctx.globalAlpha = 0.4;
              ctx.fillStyle = '#FFF59D';
              ctx.strokeStyle = '#F9A825';
              ctx.lineWidth = 2;
              ctx.setLineDash([4, 4]);
              ctx.fillRect(mousePos.x, mousePos.y, 160, 120);
              ctx.strokeRect(mousePos.x, mousePos.y, 160, 120);
              ctx.setLineDash([]);
              ctx.globalAlpha = 1;
              ctx.fillStyle = '#999';
              ctx.font = '14px sans-serif';
              ctx.fillText('点击创建便签', mousePos.x + 10, mousePos.y + 65);
              break;
            case 'text':
              ctx.globalAlpha = 0.5;
              ctx.fillStyle = strokeColor;
              ctx.font = '16px sans-serif';
              ctx.fillText('|', mousePos.x, mousePos.y);
              ctx.globalAlpha = 0.3;
              ctx.fillText('文本内容', mousePos.x, mousePos.y);
              ctx.globalAlpha = 1;
              break;
            case 'task-card':
              ctx.globalAlpha = 0.4;
              ctx.fillStyle = '#ffffff';
              ctx.strokeStyle = '#9ca3af';
              ctx.lineWidth = 2;
              ctx.setLineDash([4, 4]);
              ctx.fillRect(mousePos.x, mousePos.y, 240, 160);
              ctx.strokeRect(mousePos.x, mousePos.y, 240, 160);
              ctx.setLineDash([]);
              ctx.globalAlpha = 1;
              ctx.fillStyle = '#999';
              ctx.font = '14px sans-serif';
              ctx.fillText('点击创建任务卡片', mousePos.x + 10, mousePos.y + 85);
              break;
          }
        }

        ctx.restore();
      }
    }
    ctx.restore();
  }, [board, canvasTransform, searchResults, selectedSearchResultId, activeTool, strokeColor, fillColor, strokeWidth, canEdit, isPresentationMode, isHoveringCanvas, selectedElementId, editingElementId, getSelectedElement, getElementBounds]);

  const animateTransform = useCallback((target: { scale: number; translateX: number; translateY: number }) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    const startTransform = useWhiteboardStore.getState().canvasTransform;
    const startTime = Date.now();
    const duration = 150;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentScale = startTransform.scale + (target.scale - startTransform.scale) * easeProgress;
      const currentX = startTransform.translateX + (target.translateX - startTransform.translateX) * easeProgress;
      const currentY = startTransform.translateY + (target.translateY - startTransform.translateY) * easeProgress;
      
      useWhiteboardStore.getState().setCanvasTransform({
        scale: currentScale,
        translateX: currentX,
        translateY: currentY
      });
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  const zoomAt = useCallback((clientX: number, clientY: number, newScale: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const { canvasTransform } = useWhiteboardStore.getState();
    const rect = canvas.getBoundingClientRect();
    
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    const worldX = (mouseX - canvasTransform.translateX) / canvasTransform.scale;
    const worldY = (mouseY - canvasTransform.translateY) / canvasTransform.scale;
    
    const clampedScale = Math.min(Math.max(newScale, 0.1), 5);
    
    const newTranslateX = mouseX - worldX * clampedScale;
    const newTranslateY = mouseY - worldY * clampedScale;
    
    animateTransform({
      scale: clampedScale,
      translateX: newTranslateX,
      translateY: newTranslateY
    });
  }, [animateTransform]);

  // Handle wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { followState, stopFollowingHost } = useWhiteboardStore.getState();
      
      if (followState.isFollowing) {
        stopFollowingHost();
      }
      
      const currentTransform = useWhiteboardStore.getState().canvasTransform;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = currentTransform.scale * delta;
      
      zoomAt(e.clientX, e.clientY, newScale);
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [zoomAt]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Escape') {
        if (editingElementId) {
          setEditingElementId(null);
          setEditingText('');
          e.preventDefault();
          return;
        }
        if (selectedElementId) {
          setSelectedElementId(null);
          e.preventDefault();
          return;
        }
      }

      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedElementId && canEdit && !editingElementId) {
        deleteElement(selectedElementId);
        e.preventDefault();
        return;
      }

      if (e.code === 'Space' && !spacePressedRef.current) {
        e.preventDefault();
        spacePressedRef.current = true;
        forceUpdate({});
      }

      if ((e.metaKey || e.ctrlKey) && e.code === 'Digit0') {
        e.preventDefault();
        resetView();
      }

      if ((e.metaKey || e.ctrlKey) && (e.code === 'Equal' || e.code === 'NumpadAdd')) {
        e.preventDefault();
        zoomIn();
      }

      if ((e.metaKey || e.ctrlKey) && (e.code === 'Minus' || e.code === 'NumpadSubtract')) {
        e.preventDefault();
        zoomOut();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spacePressedRef.current = false;
        forceUpdate({});
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [resetView, zoomIn, zoomOut, selectedElementId, editingElementId, canEdit, deleteElement, setSelectedElementId, setEditingElementId]);

  // Sync status indicator animation loop
  const syncAnimationRef = useRef<number | null>(null);
  useEffect(() => {
    let hasSyncingElements = false;
    if (board) {
      for (const layer of board.layers) {
        for (const el of layer.elements) {
          if (el.syncStatus === 'syncing' || el.syncStatus === 'error') {
            hasSyncingElements = true;
            break;
          }
        }
        if (hasSyncingElements) break;
      }
    }

    if (hasSyncingElements && !syncAnimationRef.current) {
      const animate = () => {
        forceUpdate({});
        syncAnimationRef.current = requestAnimationFrame(animate);
      };
      syncAnimationRef.current = requestAnimationFrame(animate);
    } else if (!hasSyncingElements && syncAnimationRef.current) {
      cancelAnimationFrame(syncAnimationRef.current);
      syncAnimationRef.current = null;
    }

    return () => {
      if (syncAnimationRef.current) {
        cancelAnimationFrame(syncAnimationRef.current);
        syncAnimationRef.current = null;
      }
    };
  }, [board]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (syncAnimationRef.current) {
        cancelAnimationFrame(syncAnimationRef.current);
      }
    };
  }, []);

  // Load polls and setup socket listeners
  useEffect(() => {
    if (!board) return;
    
    loadPolls();

    socketService.onPollAdded(({ poll }) => {
      const { board: currentBoard, setPolls } = useWhiteboardStore.getState();
      if (currentBoard) {
        const polls = [...(currentBoard.polls || []), poll];
        setPolls(polls);
      }
    });

    socketService.onPollUpdated(({ pollId, updates }) => {
      const { board: currentBoard, setPolls } = useWhiteboardStore.getState();
      if (currentBoard) {
        const polls = (currentBoard.polls || []).map(p => p.id === pollId ? { ...p, ...updates } : p);
        setPolls(polls);
      }
    });

    socketService.onPollVoted(({ pollId, optionIds, userId }) => {
      const { board: currentBoard, setPolls } = useWhiteboardStore.getState();
      if (currentBoard) {
        const polls = (currentBoard.polls || []).map(poll => {
          if (poll.id !== pollId) return poll;
          const optionIdArray = Array.isArray(optionIds) ? optionIds : [optionIds];
          const updatedOptions = poll.options.map(option => {
            const hasVoted = option.votes.includes(userId);
            const isSelected = optionIdArray.includes(option.id);
            if (isSelected && !hasVoted) {
              return { ...option, votes: [...option.votes, userId] };
            } else if (!isSelected && hasVoted && poll.isMultipleChoice) {
              return { ...option, votes: option.votes.filter(v => v !== userId) };
            } else if (!poll.isMultipleChoice && !isSelected) {
              return { ...option, votes: option.votes.filter(v => v !== userId) };
            }
            return option;
          });
          return { ...poll, options: updatedOptions };
        });
        setPolls(polls);
      }
    });

    socketService.onPollClosed(({ pollId, closed }) => {
      const { board: currentBoard, setPolls } = useWhiteboardStore.getState();
      if (currentBoard) {
        const polls = (currentBoard.polls || []).map(p => {
          if (p.id === pollId) {
            return { ...p, closed, closedAt: closed ? new Date().toISOString() : undefined };
          }
          return p;
        });
        setPolls(polls);
      }
    });

    socketService.onPollDeleted(({ pollId }) => {
      const { board: currentBoard, setPolls } = useWhiteboardStore.getState();
      if (currentBoard) {
        const polls = (currentBoard.polls || []).filter(p => p.id !== pollId);
        setPolls(polls);
      }
    });

    return () => {
      socketService.off('poll-added');
      socketService.off('poll-updated');
      socketService.off('poll-voted');
      socketService.off('poll-closed');
      socketService.off('poll-deleted');
    };
  }, [board?._id, loadPolls]);

  const comments = board?.comments || [];
  const polls = board?.polls || [];
  const currentStep = presentationSteps[currentPresentationStepIndex];
  const showStepOverlay = (showPresentationPanel || isPresentationMode) && presentationSteps.length > 0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: isMobile ? 'default' : (isPanning ? 'grabbing' : spacePressedRef.current ? 'grab' : isPresentationMode ? 'default' : activeTool === 'comment' ? 'pointer' : !canEdit ? 'default' : activeTool === 'select' ? 'default' : 'crosshair'),
          backgroundColor: board?.backgroundColor || '#f5f5f5',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseEnter={() => setIsHoveringCanvas(true)}
        onMouseLeave={() => { 
          isDrawingRef.current = false; 
          isPanningRef.current = false;
          setIsHoveringCanvas(false);
        }}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />

      {editingElementId && (() => {
        const el = getSelectedElement();
        if (!el || (el.type !== 'text' && el.type !== 'sticky-note')) return null;
        const bounds = getElementBounds(el);
        return (
          <textarea
            autoFocus
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={() => {
              updateElement(el.id, { text: editingText });
              setEditingElementId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                updateElement(el.id, { text: editingText });
                setEditingElementId(null);
              }
              if (e.key === 'Escape') {
                setEditingElementId(null);
                setEditingText(el.text || '');
              }
            }}
            style={{
              position: 'absolute',
              left: bounds.x * canvasTransform.scale + canvasTransform.translateX,
              top: bounds.y * canvasTransform.scale + canvasTransform.translateY,
              width: Math.max(bounds.w, 100) * canvasTransform.scale,
              height: Math.max(bounds.h, 40) * canvasTransform.scale,
              fontSize: (el.type === 'sticky-note' ? 14 : 16) * canvasTransform.scale,
              fontFamily: 'sans-serif',
              color: el.type === 'sticky-note' ? '#333' : (el.fill || '#000'),
              backgroundColor: el.type === 'sticky-note' ? (el.fill || '#FFF59D') : 'transparent',
              border: '2px solid #2196f3',
              borderRadius: el.type === 'sticky-note' ? '0' : '4px',
              padding: '4px 8px',
              margin: 0,
              resize: 'none',
              outline: 'none',
              zIndex: 1000,
              lineHeight: '1.4',
            }}
          />
        );
      })()}

      {showStepOverlay && !isPresentationMode && presentationSteps.map((step, index) => (
        <div
          key={step.id}
          style={{
            position: 'absolute',
            left: step.x * canvasTransform.scale + canvasTransform.translateX,
            top: step.y * canvasTransform.scale + canvasTransform.translateY,
            width: step.width * canvasTransform.scale,
            height: step.height * canvasTransform.scale,
            border: `2px dashed ${index === currentPresentationStepIndex ? '#667eea' : '#9ca3af'}`,
            borderRadius: '8px',
            pointerEvents: 'none',
            zIndex: 50,
            boxShadow: index === currentPresentationStepIndex ? '0 0 0 2px rgba(102, 126, 234, 0.3)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '-28px',
            left: '-2px',
            padding: '4px 10px',
            background: index === currentPresentationStepIndex ? '#667eea' : '#9ca3af',
            color: '#fff',
            fontSize: '12px',
            borderRadius: '4px 4px 0 0',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}>
            {index + 1}. {step.title}
          </div>
        </div>
      ))}

      {isPresentationMode && currentStep && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 50
        }}>
          <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
            <defs>
              <mask id="presentation-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={currentStep.x * canvasTransform.scale + canvasTransform.translateX}
                  y={currentStep.y * canvasTransform.scale + canvasTransform.translateY}
                  width={currentStep.width * canvasTransform.scale}
                  height={currentStep.height * canvasTransform.scale}
                  fill="black"
                  rx="8"
                  ry="8"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.6)"
              mask="url(#presentation-mask)"
            />
            <rect
              x={currentStep.x * canvasTransform.scale + canvasTransform.translateX}
              y={currentStep.y * canvasTransform.scale + canvasTransform.translateY}
              width={currentStep.width * canvasTransform.scale}
              height={currentStep.height * canvasTransform.scale}
              fill="none"
              stroke="#667eea"
              strokeWidth="3"
              rx="8"
              ry="8"
            />
          </svg>
        </div>
      )}
      
      {comments.map((comment) => (
        <div
          key={comment.id}
          onClick={(e) => handleCommentMarkerClick(comment, e)}
          style={{
            position: 'absolute',
            left: comment.x * canvasTransform.scale + canvasTransform.translateX - 12,
            top: comment.y * canvasTransform.scale + canvasTransform.translateY - 12,
            width: '24px',
            height: '24px',
            background: comment.resolved ? '#4caf50' : '#f44336',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '12px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            zIndex: 100,
            transition: 'transform 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          💬
        </div>
      ))}

      {board?.layers.map((layer) => (
        layer.visible && layer.elements
          .filter(el => el.type === 'task-card')
          .map(el => (
            <TaskCard
              key={el.id}
              element={el}
              scale={canvasTransform.scale}
              translateX={canvasTransform.translateX}
              translateY={canvasTransform.translateY}
            />
          ))
      ))}

      {polls.map((poll) => (
        <div
          key={poll.id}
          style={{
            position: 'absolute',
            left: poll.x * canvasTransform.scale + canvasTransform.translateX,
            top: poll.y * canvasTransform.scale + canvasTransform.translateY,
            transform: `scale(${canvasTransform.scale})`,
            transformOrigin: 'top left',
            zIndex: 100
          }}
        >
          <VotePoll poll={poll} />
        </div>
      ))}

      {showCommentPanel && <CommentPanel />}
      <CreatePollModal />
      <NoteGroupPanel />

      {showTaskCardEditor && (
        <TaskCardEditor
          onClose={() => setShowTaskCardEditor(false)}
        />
      )}

      {addingComment && (
        <AddCommentModal
          position={addingComment.position}
          targetType={addingComment.targetType}
          targetId={addingComment.targetId}
          onClose={() => setAddingComment(null)}
        />
      )}
      <ExportModal />

      <div
        style={{
          position: 'absolute',
          bottom: isSmallScreen ? '16px' : '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: isSmallScreen ? '8px' : '4px',
          padding: isSmallScreen ? '10px 12px' : '6px 8px',
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: isSmallScreen ? '12px' : '8px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
          border: '1px solid #e5e7eb',
          zIndex: 500,
          backdropFilter: 'blur(8px)',
        }}
      >
        <button
          onClick={zoomOut}
          title="缩小"
          style={{
            width: isSmallScreen ? '44px' : '32px',
            height: isSmallScreen ? '44px' : '32px',
            border: 'none',
            borderRadius: isSmallScreen ? '10px' : '6px',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: isSmallScreen ? '22px' : '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            touchAction: 'manipulation',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          ➖
        </button>
        <button
          onClick={resetView}
          title="重置视图"
          style={{
            minWidth: isSmallScreen ? '80px' : '60px',
            height: isSmallScreen ? '40px' : '28px',
            border: 'none',
            borderRadius: isSmallScreen ? '10px' : '6px',
            background: '#f3f4f6',
            cursor: 'pointer',
            fontSize: isSmallScreen ? '14px' : '12px',
            fontWeight: 600,
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isSmallScreen ? '0 16px' : '0 10px',
            transition: 'all 0.15s',
            touchAction: 'manipulation',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
          }}
        >
          {Math.round(canvasTransform.scale * 100)}%
        </button>
        <button
          onClick={zoomIn}
          title="放大"
          style={{
            width: isSmallScreen ? '44px' : '32px',
            height: isSmallScreen ? '44px' : '32px',
            border: 'none',
            borderRadius: isSmallScreen ? '10px' : '6px',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: isSmallScreen ? '22px' : '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            touchAction: 'manipulation',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          ➕
        </button>
        {isSmallScreen && (
          <button
            onClick={() => {
              const { setShowMinimap, showMinimap } = useWhiteboardStore.getState();
              setShowMinimap(!showMinimap);
            }}
            title="小地图"
            style={{
              width: '44px',
              height: '44px',
              border: 'none',
              borderRadius: '10px',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
              touchAction: 'manipulation',
            }}
          >
            🗺️
          </button>
        )}
      </div>

      {!canEdit && (
        <button
          onClick={() => {
            const { setActiveTool, activeTool } = useWhiteboardStore.getState();
            setActiveTool(activeTool === 'comment' ? 'select' : 'comment');
          }}
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
            zIndex: 500,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.4)';
          }}
          title="点击添加批注"
        >
          💬
        </button>
      )}
    </div>
  );
};
