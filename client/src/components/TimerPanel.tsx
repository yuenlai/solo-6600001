import React, { useState, useEffect, useRef } from 'react';
import { useWhiteboardStore } from '../store/whiteboard';
import { TimerPhase } from '../types';

const PHASE_COLORS = [
  '#667eea',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

const DEFAULT_PHASES = [
  { name: '开场介绍', duration: 5 * 60, color: '#667eea' },
  { name: '头脑风暴', duration: 15 * 60, color: '#f59e0b' },
  { name: '分组讨论', duration: 20 * 60, color: '#10b981' },
  { name: '总结分享', duration: 10 * 60, color: '#8b5cf6' },
];

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const TimerPanel: React.FC = () => {
  const {
    showTimerPanel,
    timerState,
    timerSettings,
    canEdit,
    setShowTimerPanel,
    addTimerPhase,
    updateTimerPhase,
    deleteTimerPhase,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    nextTimerPhase,
    prevTimerPhase,
    goToTimerPhase,
    setTimerSettings,
    setTimerState,
  } = useWhiteboardStore();

  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDuration, setEditDuration] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const warningPlayedRef = useRef<boolean>(false);

  useEffect(() => {
    let interval: number | null = null;

    if (timerState.isRunning && timerState.startTime) {
      interval = window.setInterval(() => {
        const currentPhase = timerState.phases[timerState.currentPhaseIndex];
        if (!currentPhase) return;

        const elapsed = Math.floor((Date.now() - timerState.startTime!) / 1000);
        const remaining = Math.max(0, currentPhase.duration - elapsed);

        setTimerState({ remainingTime: remaining });

        if (remaining <= 0) {
          playAlertSound();
          if (timerSettings.autoNextPhase && timerState.currentPhaseIndex < timerState.phases.length - 1) {
            nextTimerPhase();
          } else {
            pauseTimer();
          }
        } else if (remaining <= timerSettings.warningThreshold && !warningPlayedRef.current) {
          playWarningSound();
          warningPlayedRef.current = true;
        }
      }, 1000);
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [timerState.isRunning, timerState.startTime, timerState.currentPhaseIndex, timerState.phases, timerSettings.autoNextPhase, timerSettings.warningThreshold]);

  useEffect(() => {
    warningPlayedRef.current = false;
  }, [timerState.currentPhaseIndex]);

  const playWarningSound = () => {
    if (!timerSettings.soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.error('Failed to play warning sound:', e);
    }
  };

  const playAlertSound = () => {
    if (!timerSettings.soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const playBeep = (delay: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.value = 1000;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.2);
        oscillator.start(ctx.currentTime + delay);
        oscillator.stop(ctx.currentTime + delay + 0.2);
      };
      playBeep(0);
      playBeep(0.25);
      playBeep(0.5);
    } catch (e) {
      console.error('Failed to play alert sound:', e);
    }
  };

  const handleAddPhase = () => {
    const color = PHASE_COLORS[timerState.phases.length % PHASE_COLORS.length];
    addTimerPhase({
      name: `阶段 ${timerState.phases.length + 1}`,
      duration: 5 * 60,
      color,
    });
  };

  const handleLoadTemplate = () => {
    DEFAULT_PHASES.forEach((phase, index) => {
      setTimeout(() => {
        addTimerPhase(phase);
      }, index * 50);
    });
  };

  const handleStartEdit = (phase: TimerPhase) => {
    setEditingPhase(phase.id);
    setEditName(phase.name);
    setEditDuration(phase.duration);
  };

  const handleSaveEdit = (phaseId: string) => {
    updateTimerPhase(phaseId, {
      name: editName,
      duration: Math.max(1, editDuration),
    });
    setEditingPhase(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, phaseId: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(phaseId);
    } else if (e.key === 'Escape') {
      setEditingPhase(null);
    }
  };

  const currentPhase = timerState.phases[timerState.currentPhaseIndex];
  const progress = currentPhase
    ? ((currentPhase.duration - timerState.remainingTime) / currentPhase.duration) * 100
    : 0;
  const isUrgent = timerState.remainingTime <= timerSettings.warningThreshold;

  if (!showTimerPanel) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      right: '16px',
      width: '320px',
      maxHeight: 'calc(100vh - 32px)',
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 100,
    }}>
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>⏱️</span>
          <span style={{ fontWeight: 600, fontSize: '15px' }}>计时协作</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ⚙️
          </button>
          <button
            onClick={() => setShowTimerPanel(false)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {showSettings && (
        <div style={{
          padding: '12px 16px',
          background: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#374151' }}>🔊 声音提醒</span>
            <button
              onClick={() => setTimerSettings({ soundEnabled: !timerSettings.soundEnabled })}
              style={{
                width: '40px',
                height: '22px',
                borderRadius: '11px',
                background: timerSettings.soundEnabled ? '#10b981' : '#d1d5db',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute',
                top: '2px',
                left: timerSettings.soundEnabled ? '20px' : '2px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#374151' }}>🔄 自动下一阶段</span>
            <button
              onClick={() => setTimerSettings({ autoNextPhase: !timerSettings.autoNextPhase })}
              style={{
                width: '40px',
                height: '22px',
                borderRadius: '11px',
                background: timerSettings.autoNextPhase ? '#10b981' : '#d1d5db',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute',
                top: '2px',
                left: timerSettings.autoNextPhase ? '20px' : '2px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
              ⚠️ 提醒阈值: {timerSettings.warningThreshold}秒
            </div>
            <input
              type="range"
              min="10"
              max="300"
              step="10"
              value={timerSettings.warningThreshold}
              onChange={(e) => setTimerSettings({ warningThreshold: parseInt(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}

      <div style={{
        padding: '20px 16px',
        background: currentPhase?.color || '#667eea',
        color: '#fff',
        textAlign: 'center',
        transition: 'background 0.3s',
      }}>
        <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px' }}>
          {currentPhase ? currentPhase.name : '暂无阶段'}
        </div>
        <div style={{
          fontSize: '48px',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '2px',
          color: isUrgent && timerState.isRunning ? '#fef08a' : '#fff',
          animation: isUrgent && timerState.isRunning ? 'pulse 1s infinite' : 'none',
        }}>
          {formatTime(timerState.remainingTime)}
        </div>
        <div style={{
          marginTop: '12px',
          height: '4px',
          background: 'rgba(255,255,255,0.3)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: '#fff',
            borderRadius: '2px',
            transition: 'width 1s linear',
          }} />
        </div>
        {timerState.phases.length > 1 && (
          <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
            阶段 {timerState.currentPhaseIndex + 1} / {timerState.phases.length}
          </div>
        )}
      </div>

      <div style={{
        padding: '12px 16px',
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
        borderBottom: '1px solid #e5e7eb',
      }}>
        {!timerState.isRunning && !timerState.isPaused && (
          <button
            onClick={startTimer}
            disabled={!canEdit || timerState.phases.length === 0}
            style={{
              padding: '8px 24px',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: canEdit && timerState.phases.length > 0 ? 'pointer' : 'not-allowed',
              opacity: canEdit && timerState.phases.length > 0 ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ▶️ 开始
          </button>
        )}
        {timerState.isRunning && (
          <button
            onClick={pauseTimer}
            disabled={!canEdit}
            style={{
              padding: '8px 24px',
              background: '#f59e0b',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: canEdit ? 'pointer' : 'not-allowed',
              opacity: canEdit ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ⏸️ 暂停
          </button>
        )}
        {timerState.isPaused && (
          <button
            onClick={resumeTimer}
            disabled={!canEdit}
            style={{
              padding: '8px 24px',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: canEdit ? 'pointer' : 'not-allowed',
              opacity: canEdit ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ▶️ 继续
          </button>
        )}
        <button
          onClick={prevTimerPhase}
          disabled={!canEdit || timerState.currentPhaseIndex === 0}
          style={{
            padding: '8px 12px',
            background: '#f3f4f6',
            color: '#374151',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: canEdit && timerState.currentPhaseIndex > 0 ? 'pointer' : 'not-allowed',
            opacity: canEdit && timerState.currentPhaseIndex > 0 ? 1 : 0.5,
          }}
        >
          ⏮️
        </button>
        <button
          onClick={nextTimerPhase}
          disabled={!canEdit || timerState.currentPhaseIndex >= timerState.phases.length - 1}
          style={{
            padding: '8px 12px',
            background: '#f3f4f6',
            color: '#374151',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: canEdit && timerState.currentPhaseIndex < timerState.phases.length - 1 ? 'pointer' : 'not-allowed',
            opacity: canEdit && timerState.currentPhaseIndex < timerState.phases.length - 1 ? 1 : 0.5,
          }}
        >
          ⏭️
        </button>
        <button
          onClick={resetTimer}
          disabled={!canEdit}
          style={{
            padding: '8px 12px',
            background: '#f3f4f6',
            color: '#374151',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: canEdit ? 'pointer' : 'not-allowed',
            opacity: canEdit ? 1 : 0.5,
          }}
        >
          🔄
        </button>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 12px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 4px',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
            阶段列表 ({timerState.phases.length})
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {timerState.phases.length === 0 && (
              <button
                onClick={handleLoadTemplate}
                disabled={!canEdit}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  background: '#e0e7ff',
                  color: '#4f46e5',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: canEdit ? 'pointer' : 'not-allowed',
                }}
              >
                加载模板
              </button>
            )}
            <button
              onClick={handleAddPhase}
              disabled={!canEdit}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                background: '#667eea',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: canEdit ? 'pointer' : 'not-allowed',
              }}
            >
              + 添加
            </button>
          </div>
        </div>

        {timerState.phases.length === 0 ? (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: '13px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
            还没有阶段，点击「添加」或「加载模板」开始
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {timerState.phases.map((phase, index) => (
              <div
                key={phase.id}
                onClick={() => canEdit && goToTimerPhase(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: index === timerState.currentPhaseIndex ? `${phase.color}15` : '#f9fafb',
                  border: index === timerState.currentPhaseIndex ? `2px solid ${phase.color}` : '2px solid transparent',
                  cursor: canEdit ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: phase.color,
                  flexShrink: 0,
                }} />
                {editingPhase === phase.id ? (
                  <div style={{ flex: 1, display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, phase.id)}
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                    <input
                      type="number"
                      value={Math.floor(editDuration / 60)}
                      onChange={(e) => setEditDuration(Math.max(1, parseInt(e.target.value) || 0) * 60)}
                      onKeyDown={(e) => handleKeyDown(e, phase.id)}
                      style={{
                        width: '50px',
                        padding: '4px 6px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                      min="1"
                    />
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>分</span>
                    <button
                      onClick={() => handleSaveEdit(phase.id)}
                      style={{
                        padding: '4px 8px',
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      ✓
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#1f2937' }}>
                        {index + 1}. {phase.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {formatTime(phase.duration)}
                      </div>
                    </div>
                    {index === timerState.currentPhaseIndex && timerState.isRunning && (
                      <span style={{ fontSize: '14px' }}>▶️</span>
                    )}
                    {canEdit && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(phase);
                          }}
                          style={{
                            padding: '2px 6px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#6b7280',
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTimerPhase(phase.id);
                          }}
                          style={{
                            padding: '2px 6px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#ef4444',
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};
