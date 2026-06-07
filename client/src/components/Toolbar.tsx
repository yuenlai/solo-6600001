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

  const renderToolButton = (tool: typeof tools[0]) => {
    const isCommentTool = tool.type === 'comment';
    const isDisabled = !canEdit && !isCommentTool;
    
    return (
      <button
        key={tool.type}
        onClick={() => !isDisabled && setActiveTool(tool.type)}
        title={tool.label}
        style={{
          width: '40px', height: '40px', border: 'none', borderRadius: '6px',
          background: activeTool === tool.type ? '#e3f2fd' : 'transparent',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          fontSize: '18px', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          opacity: isDisabled ? 0.4 : 1
        }}
        disabled={isDisabled}
      >
        {tool.icon}
      </button>
    );
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '8px',
      padding: '12px', background: '#fff', borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)', width: '60px', alignItems: 'center'
    }}>
      {tools.map(tool => renderToolButton(tool))}
      <div style={{ width: '100%', height: '1px', background: '#ddd' }} />
      <label title="描边颜色">
        <input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)}
          style={{ width: '32px', height: '32px', border: 'none', cursor: 'pointer' }} />
      </label>
      <label title="填充颜色">
        <input type="color" value={fillColor === 'transparent' ? '#ffffff' : fillColor}
          onChange={e => setFillColor(e.target.value)}
          style={{ width: '32px', height: '32px', border: 'none', cursor: 'pointer' }} />
      </label>
      <input type="range" min="1" max="20" value={strokeWidth}
        onChange={e => setStrokeWidth(Number(e.target.value))}
        title={`线宽: ${strokeWidth}`}
        style={{ width: '40px' }} />
      <div style={{ width: '100%', height: '1px', background: '#ddd' }} />
      <button
        onClick={() => setShowPresentationPanel(!showPresentationPanel)}
        title="演示模式"
        style={{
          width: '40px', height: '40px', border: 'none', borderRadius: '6px',
          background: showPresentationPanel ? '#e3f2fd' : 'transparent',
          cursor: 'pointer', fontSize: '18px', display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}
      >
        🎬
      </button>
      <button
        onClick={() => setShowMeetingMinutes(!showMeetingMinutes)}
        title="会议纪要"
        style={{
          width: '40px', height: '40px', border: 'none', borderRadius: '6px',
          background: showMeetingMinutes ? '#e3f2fd' : 'transparent',
          cursor: 'pointer', fontSize: '18px', display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}
      >
        📋
      </button>
      <button
        onClick={() => setShowSnapshotHistory(!showSnapshotHistory)}
        title="快照历史"
        style={{
          width: '40px', height: '40px', border: 'none', borderRadius: '6px',
          background: showSnapshotHistory ? '#e3f2fd' : 'transparent',
          cursor: 'pointer', fontSize: '18px', display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}
      >
        📸
      </button>
      {canEdit && (
        <button
          onClick={() => setShowCreatePollModal(true, { x: 200, y: 200 })}
          title="创建投票"
          style={{
            width: '40px', height: '40px', border: 'none', borderRadius: '6px',
            background: 'transparent',
            cursor: 'pointer', fontSize: '18px', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}
        >
          🗳️
        </button>
      )}
      <button
        onClick={() => setShowNoteGroupPanel(!showNoteGroupPanel)}
        title="便签分组"
        style={{
          width: '40px', height: '40px', border: 'none', borderRadius: '6px',
          background: showNoteGroupPanel ? '#e3f2fd' : 'transparent',
          cursor: 'pointer', fontSize: '18px', display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}
      >
        📁
      </button>
      <button
        onClick={() => setShowSearchPanel(!showSearchPanel)}
        title="搜索内容 (⌘F)"
        style={{
          width: '40px', height: '40px', border: 'none', borderRadius: '6px',
          background: showSearchPanel ? '#e3f2fd' : 'transparent',
          cursor: 'pointer', fontSize: '18px', display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}
      >
        🔍
      </button>
      <button
        onClick={() => setShowExportModal(true)}
        title="导出高清长图"
        style={{
          width: '40px', height: '40px', border: 'none', borderRadius: '6px',
          background: 'transparent',
          cursor: 'pointer', fontSize: '18px', display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}
      >
        📷
      </button>
      <button
        onClick={() => setShowAssetPanel(!showAssetPanel)}
        title="素材库"
        style={{
          width: '40px', height: '40px', border: 'none', borderRadius: '6px',
          background: showAssetPanel ? '#e3f2fd' : 'transparent',
          cursor: 'pointer', fontSize: '18px', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          position: 'relative'
        }}
      >
        🎨
        {assets.length > 0 && (
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
        )}
      </button>
      <div style={{ width: '100%', height: '1px', background: '#ddd' }} />
      {canEdit && (
        <button
          onClick={toggleHostMode}
          title={isHost ? '取消主持人模式' : '开启主持人模式'}
          style={{
            width: '40px', height: '40px', border: 'none', borderRadius: '6px',
            background: isHost ? '#4caf50' : 'transparent',
            cursor: 'pointer', fontSize: '18px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: isHost ? '#fff' : 'inherit'
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
            width: '40px', height: '40px', border: 'none', borderRadius: '6px',
            background: followState.isFollowing ? '#2196f3' : 'transparent',
            cursor: 'pointer', fontSize: '18px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: followState.isFollowing ? '#fff' : 'inherit'
          }}
        >
          👁️
        </button>
      )}
    </div>
  );
};
