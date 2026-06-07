import React, { useState, useEffect, useRef } from 'react';
import { useWhiteboardStore } from '../store/whiteboard';
import { PresentationStep } from '../types';

export const PresentationPanel: React.FC = () => {
  const {
    presentationSteps,
    isPresentationMode,
    currentPresentationStepIndex,
    isPresentationPlaying,
    showPresentationPanel,
    canEdit,
    canvasTransform,
    board,
    addPresentationStep,
    updatePresentationStep,
    deletePresentationStep,
    reorderPresentationSteps,
    setIsPresentationMode,
    setCurrentPresentationStepIndex,
    setIsPresentationPlaying,
    setShowPresentationPanel,
    goToNextPresentationStep,
    goToPrevPresentationStep
  } = useWhiteboardStore();

  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPresentationPlaying && isPresentationMode) {
      playIntervalRef.current = setInterval(() => {
        const state = useWhiteboardStore.getState();
        if (state.currentPresentationStepIndex < state.presentationSteps.length - 1) {
          state.goToNextPresentationStep();
        } else {
          state.setIsPresentationPlaying(false);
        }
      }, 5000);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPresentationPlaying, isPresentationMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPresentationMode) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goToNextPresentationStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevPresentationStep();
      } else if (e.key === 'Escape') {
        setIsPresentationMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresentationMode, goToNextPresentationStep, goToPrevPresentationStep, setIsPresentationMode]);

  const handleAddStep = () => {
    if (!board) return;
    const canvas = document.querySelector('canvas');
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;

    const visibleWidth = rect.width / canvasTransform.scale;
    const visibleHeight = rect.height / canvasTransform.scale;
    const centerX = -canvasTransform.translateX / canvasTransform.scale + visibleWidth / 2;
    const centerY = -canvasTransform.translateY / canvasTransform.scale + visibleHeight / 2;

    const newStep: Omit<PresentationStep, 'id'> = {
      title: `步骤 ${presentationSteps.length + 1}`,
      description: '在此添加说明内容...',
      x: centerX - visibleWidth / 2,
      y: centerY - visibleHeight / 2,
      width: visibleWidth,
      height: visibleHeight,
      scale: canvasTransform.scale,
      order: presentationSteps.length
    };
    addPresentationStep(newStep);
  };

  const handleUpdateCurrentView = (stepId: string) => {
    const canvas = document.querySelector('canvas');
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;

    const visibleWidth = rect.width / canvasTransform.scale;
    const visibleHeight = rect.height / canvasTransform.scale;
    const centerX = -canvasTransform.translateX / canvasTransform.scale + visibleWidth / 2;
    const centerY = -canvasTransform.translateY / canvasTransform.scale + visibleHeight / 2;

    updatePresentationStep(stepId, {
      x: centerX - visibleWidth / 2,
      y: centerY - visibleHeight / 2,
      width: visibleWidth,
      height: visibleHeight,
      scale: canvasTransform.scale
    });
  };

  const handleStartEdit = (step: PresentationStep) => {
    setEditingStepId(step.id);
    setEditTitle(step.title);
    setEditDescription(step.description);
  };

  const handleSaveEdit = () => {
    if (editingStepId) {
      updatePresentationStep(editingStepId, {
        title: editTitle,
        description: editDescription
      });
    }
    setEditingStepId(null);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...presentationSteps];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newSteps.length) return;
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    reorderPresentationSteps(newSteps);
  };

  const currentStep = presentationSteps[currentPresentationStepIndex];

  if (!showPresentationPanel && !isPresentationMode) {
    return null;
  }

  if (isPresentationMode) {
    return (
      <>
        {currentStep && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.85)',
            color: '#fff',
            padding: '20px 32px',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '90%',
            zIndex: 1000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
              {currentStep.title}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9, lineHeight: 1.6 }}>
              {currentStep.description}
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '16px', 
              marginTop: '16px' 
            }}>
              <button
                onClick={goToPrevPresentationStep}
                disabled={currentPresentationStepIndex === 0}
                style={{
                  padding: '8px 16px',
                  background: currentPresentationStepIndex === 0 ? '#555' : '#667eea',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: currentPresentationStepIndex === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                ← 上一步
              </button>
              <button
                onClick={() => setIsPresentationPlaying(!isPresentationPlaying)}
                style={{
                  padding: '8px 16px',
                  background: isPresentationPlaying ? '#f59e0b' : '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {isPresentationPlaying ? '⏸ 暂停' : '▶ 自动播放'}
              </button>
              <button
                onClick={goToNextPresentationStep}
                disabled={currentPresentationStepIndex === presentationSteps.length - 1}
                style={{
                  padding: '8px 16px',
                  background: currentPresentationStepIndex === presentationSteps.length - 1 ? '#555' : '#667eea',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: currentPresentationStepIndex === presentationSteps.length - 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                下一步 →
              </button>
              <button
                onClick={() => setIsPresentationMode(false)}
                style={{
                  padding: '8px 16px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                退出
              </button>
            </div>
            <div style={{ 
              textAlign: 'center', 
              marginTop: '12px', 
              fontSize: '12px', 
              opacity: 0.7 
            }}>
              {currentPresentationStepIndex + 1} / {presentationSteps.length} · 按 ← → 切换，ESC 退出
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      right: '12px',
      top: '12px',
      width: '320px',
      maxHeight: 'calc(100vh - 24px)',
      background: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>🎬 演示模式</h3>
        <button
          onClick={() => setShowPresentationPanel(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px 8px',
            borderRadius: '4px'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={() => {
            setCurrentPresentationStepIndex(0);
            setIsPresentationMode(true);
          }}
          disabled={presentationSteps.length === 0}
          style={{
            flex: 1,
            padding: '10px',
            background: presentationSteps.length === 0 ? '#ddd' : '#667eea',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: presentationSteps.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          ▶ 开始演示
        </button>
        {canEdit && (
          <button
            onClick={handleAddStep}
            style={{
              padding: '10px 14px',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            + 添加
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {presentationSteps.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#999',
            fontSize: '14px'
          }}>
            暂无演示步骤<br />
            点击"添加"创建第一个步骤
          </div>
        ) : (
          presentationSteps.map((step, index) => (
            <div
              key={step.id}
              style={{
                padding: '12px',
                marginBottom: '8px',
                background: index === currentPresentationStepIndex ? '#eef2ff' : '#f9fafb',
                border: `1px solid ${index === currentPresentationStepIndex ? '#667eea' : '#e5e7eb'}`,
                borderRadius: '6px',
                cursor: 'pointer'
              }}
              onClick={() => setCurrentPresentationStepIndex(index)}
            >
              {editingStepId === step.id ? (
                <div onClick={e => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="步骤标题"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      marginBottom: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                  <textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    placeholder="步骤说明"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      marginBottom: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleSaveEdit}
                      style={{
                        flex: 1,
                        padding: '6px',
                        background: '#667eea',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingStepId(null)}
                      style={{
                        flex: 1,
                        padding: '6px',
                        background: '#9ca3af',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px'
                  }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                      {index + 1}. {step.title}
                    </span>
                    {canEdit && (
                      <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleMoveStep(index, 'up')}
                          disabled={index === 0}
                          style={{
                            padding: '2px 6px',
                            background: 'none',
                            border: 'none',
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            opacity: index === 0 ? 0.3 : 1
                          }}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMoveStep(index, 'down')}
                          disabled={index === presentationSteps.length - 1}
                          style={{
                            padding: '2px 6px',
                            background: 'none',
                            border: 'none',
                            cursor: index === presentationSteps.length - 1 ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            opacity: index === presentationSteps.length - 1 ? 0.3 : 1
                          }}
                        >
                          ↓
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#666',
                    marginBottom: '10px',
                    lineHeight: 1.4
                  }}>
                    {step.description}
                  </div>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleStartEdit(step)}
                        style={{
                          flex: 1,
                          padding: '5px',
                          background: '#e0e7ff',
                          color: '#4338ca',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        ✏️ 编辑
                      </button>
                      <button
                        onClick={() => handleUpdateCurrentView(step.id)}
                        style={{
                          flex: 1,
                          padding: '5px',
                          background: '#dcfce7',
                          color: '#166534',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        📍 更新视图
                      </button>
                      <button
                        onClick={() => deletePresentationStep(step.id)}
                        style={{
                          flex: 1,
                          padding: '5px',
                          background: '#fee2e2',
                          color: '#991b1b',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        🗑️ 删除
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      {presentationSteps.length > 0 && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #eee',
          fontSize: '12px',
          color: '#666',
          textAlign: 'center'
        }}>
          共 {presentationSteps.length} 个步骤
        </div>
      )}
    </div>
  );
};
