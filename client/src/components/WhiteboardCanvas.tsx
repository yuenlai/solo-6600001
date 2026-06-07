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

export const WhiteboardCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const currentPathRef = useRef<number[]>([]);
  const startPosRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0, translateX: 0, translateY: 0 });

  const [addingComment, setAddingComment] = useState<{
    position: { x: number; y: number };
    targetType: 'element' | 'canvas';
    targetId: string | null;
  } | null>(null);

  const {
    board, activeTool, strokeColor, fillColor, strokeWidth,
    canvasTransform, addElement, canEdit, showCommentPanel, setShowCommentPanel,
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
    noteGroups
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

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      if (followState.isFollowing) {
        stopFollowingHost();
      }
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        translateX: canvasTransform.translateX,
        translateY: canvasTransform.translateY
      };
      return;
    }

    if (!canEdit || isPresentationMode) return;
    const point = getCanvasPoint(e);

    if (activeTool === 'comment') {
      const element = findElementAtPoint(point.x, point.y);
      setAddingComment({
        position: point,
        targetType: element ? 'element' : 'canvas',
        targetId: element?.id || null
      });
      return;
    }

    isDrawingRef.current = true;
    startPosRef.current = point;
    currentPathRef.current = [point.x, point.y];
  }, [canEdit, getCanvasPoint, activeTool, findElementAtPoint, canvasTransform, followState.isFollowing, stopFollowingHost]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setCanvasTransform({
        scale: canvasTransform.scale,
        translateX: panStartRef.current.translateX + dx,
        translateY: panStartRef.current.translateY + dy
      });
      return;
    }

    const point = getCanvasPoint(e);
    socketService.moveCursor(point.x, point.y);

    if (!isDrawingRef.current || !canEdit) return;
    currentPathRef.current.push(point.x, point.y);
  }, [canEdit, getCanvasPoint, canvasTransform, setCanvasTransform]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
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
          }
          ctx.restore();
        });
      });
    }
    ctx.restore();
  }, [board, canvasTransform]);

  // Handle wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { canvasTransform, setCanvasTransform, followState, stopFollowingHost } = useWhiteboardStore.getState();
      
      if (followState.isFollowing) {
        stopFollowingHost();
      }
      
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(canvasTransform.scale * delta, 0.1), 5);
      setCanvasTransform({
        scale: newScale,
        translateX: canvasTransform.translateX,
        translateY: canvasTransform.translateY
      });
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
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
          cursor: !canEdit || isPresentationMode ? 'default' : activeTool === 'select' ? 'default' : activeTool === 'comment' ? 'pointer' : 'crosshair',
          backgroundColor: board?.backgroundColor || '#f5f5f5'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { 
          isDrawingRef.current = false; 
          isPanningRef.current = false;
        }}
      />

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
    </div>
  );
};
