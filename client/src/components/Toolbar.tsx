import React from 'react';
import { useWhiteboardStore } from '../store/whiteboard';
import { ToolType } from '../types';

const tools: { type: ToolType; label: string; icon: string }[] = [
  { type: 'select', label: '选择', icon: '👆' },
  { type: 'pen', label: '画笔', icon: '✏️' },
  { type: 'rect', label: '矩形', icon: '⬜' },
  { type: 'circle', label: '圆形', icon: '⭕' },
  { type: 'line', label: '直线', icon: '📏' },
  { type: 'text', label: '文本', icon: '🔤' },
  { type: 'sticky-note', label: '便签', icon: '📝' },
  { type: 'task-card', label: '任务卡片', icon: '✅' },
  { type: 'eraser', label: '橡皮', icon: '🧹' },
  { type: 'comment', label: '评论', icon: '💬' },
];

export const Toolbar: React.FC = () => {
  const { activeTool, setActiveTool, strokeColor, setStrokeColor, fillColor, setFillColor, strokeWidth, setStrokeWidth, showPresentationPanel, setShowPresentationPanel, showMeetingMinutes, setShowMeetingMinutes, showSnapshotHistory, setShowSnapshotHistory, setShowCreatePollModal, canEdit, isHost, toggleHostMode, hostInfo, followState, startFollowingHost, stopFollowingHost, showNoteGroupPanel, setShowNoteGroupPanel, showSearchPanel, setShowSearchPanel, setShowExportModal, showAssetPanel, setShowAssetPanel, assets } = useWhiteboardStore();

  const renderActionButton = (icon: string, title: string, isActive: boolean, onClick: () => void, disabled = false, badge?: React.ReactNode) => (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        width: '40px', height: '40px', border: 'none', borderRadius: '8px',
        background: isActive ? 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' : 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '18px', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
        boxShadow: isActive ? '0 2px 8px rgba(33, 150, 243, 0.3), inset 0 0 0 2px #2196f3' : 'none',
        transition: 'all 0.15s ease',
        transform: isActive ? 'scale(1.05)' : 'scale(1)',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isActive) {
          e.currentTarget.style.background = '#f5f5f5';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      {icon}
      {badge}
    </button>
  );

  const renderToolButton = (tool: typeof tools[0]) => {
    const isCommentTool = tool.type === 'comment';
    const isDisabled = !canEdit && !isCommentTool;
    const isActive = activeTool === tool.type;
    
    return (
      <button
        key={tool.type}
        onClick={() => !isDisabled && setActiveTool(tool.type)}
        title={tool.label}
        style={{
          width: '40px', height: '40px', border: 'none', borderRadius: '8px',
          background: isActive ? 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' : 'transparent',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          fontSize: '18px', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          opacity: isDisabled ? 0.4 : 1,
          boxShadow: isActive ? '0 2px 8px rgba(33, 150, 243, 0.3), inset 0 0 0 2px #2196f3' : 'none',
          transition: 'all 0.15s ease',
          transform: isActive ? 'scale(1.05)' : 'scale(1)'
        }}
        disabled={isDisabled}
        onMouseEnter={(e) => {
          if (!isDisabled && !isActive) {
            e.currentTarget.style.background = '#f5f5f5';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        {tool.icon}
      </button>
    );
  };

  return (
    <div className="toolbar-container" style={{
      display: 'flex', flexDirection: 'column', gap: '8px',
      padding: '12px', background: '#fff', borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)', width: '60px', alignItems: 'center'
    }}>
      {tools.map(tool => renderToolButton(tool))}
      <div style={{ width: '100%', height: '1px', background: '#e5e7eb', margin: '4px 0' }} />
      
      <div title="描边颜色" style={{ position: 'relative' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '8px',
          background: strokeColor,
          border: '2px solid #e5e7eb',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        }}>
          <input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)}
            style={{ 
              width: '100%', height: '100%', 
              border: 'none', cursor: 'pointer',
              opacity: 0, position: 'absolute',
              borderRadius: '8px'
            }} />
        </div>
        <div style={{
          position: 'absolute', bottom: '-4px', right: '-4px',
          width: '14px', height: '14px', borderRadius: '50%',
          background: '#fff', border: '1px solid #d1d5db',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '8px'
        }}>✏️</div>
      </div>

      <div title="填充颜色" style={{ position: 'relative' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '8px',
          background: fillColor === 'transparent' 
            ? 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%), #fff'
            : fillColor,
          backgroundSize: '8px 8px',
          backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
          border: '2px solid #e5e7eb',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        }}>
          <input type="color" value={fillColor === 'transparent' ? '#ffffff' : fillColor}
            onChange={e => setFillColor(e.target.value)}
            style={{ 
              width: '100%', height: '100%', 
              border: 'none', cursor: 'pointer',
              opacity: 0, position: 'absolute',
              borderRadius: '8px'
            }} />
        </div>
        <div style={{
          position: 'absolute', bottom: '-4px', right: '-4px',
          width: '14px', height: '14px', borderRadius: '50%',
          background: '#fff', border: '1px solid #d1d5db',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '8px'
        }}>🎨</div>
      </div>

      <div title={`线宽: ${strokeWidth}px`} style={{ 
        display: 'flex', flexDirection: 'column', 
        alignItems: 'center', gap: '4px',
        padding: '4px 0'
      }}>
        <div style={{
          width: '32px', height: '32px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f3f4f6',
          borderRadius: '6px'
        }}>
          <div style={{
            width: `${Math.min(24, strokeWidth * 2)}px`,
            height: `${Math.min(24, strokeWidth * 2)}px`,
            borderRadius: '50%',
            background: strokeColor,
            transition: 'all 0.15s ease'
          }} />
        </div>
        <input type="range" min="1" max="20" value={strokeWidth}
          onChange={e => setStrokeWidth(Number(e.target.value))}
          style={{ 
            width: '44px',
            cursor: 'pointer',
            accentColor: '#2196f3'
          }} />
      </div>
      <div style={{ width: '100%', height: '1px', background: '#e5e7eb', margin: '4px 0' }} />
      {renderActionButton('🎬', '演示模式', showPresentationPanel, () => setShowPresentationPanel(!showPresentationPanel))}
      {renderActionButton('📋', '会议纪要', showMeetingMinutes, () => setShowMeetingMinutes(!showMeetingMinutes))}
      {renderActionButton('📸', '快照历史', showSnapshotHistory, () => setShowSnapshotHistory(!showSnapshotHistory))}
      {canEdit && renderActionButton('🗳️', '创建投票', false, () => setShowCreatePollModal(true, { x: 200, y: 200 }))}
      {renderActionButton('📁', '便签分组', showNoteGroupPanel, () => setShowNoteGroupPanel(!showNoteGroupPanel))}
      {renderActionButton('🔍', '搜索内容 (⌘F)', showSearchPanel, () => setShowSearchPanel(!showSearchPanel))}
      {renderActionButton('📷', '导出高清长图', false, () => setShowExportModal(true))}
      {renderActionButton('🎨', '素材库', showAssetPanel, () => setShowAssetPanel(!showAssetPanel), false,
        assets.length > 0 ? (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            background: '#4472C4',
            color: '#fff',
            fontSize: '9px',
            padding: '1px 4px',
            borderRadius: '8px',
            minWidth: '16px',
            textAlign: 'center'
          }}>
            {assets.length}
          </span>
        ) : undefined
      )}
      <div style={{ width: '100%', height: '1px', background: '#e5e7eb', margin: '4px 0' }} />
      {canEdit && (
        <button
          onClick={toggleHostMode}
          title={isHost ? '取消主持人模式' : '开启主持人模式'}
          style={{
            width: '40px', height: '40px', border: 'none', borderRadius: '8px',
            background: isHost ? 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)' : 'transparent',
            cursor: 'pointer', fontSize: '18px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: isHost ? '#fff' : 'inherit',
            boxShadow: isHost ? '0 2px 8px rgba(76, 175, 80, 0.4), inset 0 0 0 2px #388e3c' : 'none',
            transition: 'all 0.15s ease',
            transform: isHost ? 'scale(1.05)' : 'scale(1)'
          }}
          onMouseEnter={(e) => {
            if (!isHost) {
              e.currentTarget.style.background = '#f5f5f5';
            }
          }}
          onMouseLeave={(e) => {
            if (!isHost) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          🎤
        </button>
      )}
      {hostInfo && !isHost && (
        <button
          onClick={() => {
            if (followState.isFollowing) {
              stopFollowingHost();
            } else {
              startFollowingHost(hostInfo.socketId, hostInfo.username);
            }
          }}
          title={followState.isFollowing ? `取消跟随 ${followState.hostUsername}` : `跟随 ${hostInfo.username} 的视角`}
          style={{
            width: '40px', height: '40px', border: 'none', borderRadius: '8px',
            background: followState.isFollowing ? 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)' : 'transparent',
            cursor: 'pointer', fontSize: '18px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: followState.isFollowing ? '#fff' : 'inherit',
            boxShadow: followState.isFollowing ? '0 2px 8px rgba(33, 150, 243, 0.4), inset 0 0 0 2px #1565c0' : 'none',
            transition: 'all 0.15s ease',
            transform: followState.isFollowing ? 'scale(1.05)' : 'scale(1)'
          }}
          onMouseEnter={(e) => {
            if (!followState.isFollowing) {
              e.currentTarget.style.background = '#f5f5f5';
            }
          }}
          onMouseLeave={(e) => {
            if (!followState.isFollowing) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          👁️
        </button>
      )}
    </div>
  );
};
