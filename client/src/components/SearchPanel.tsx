import React, { useRef, useEffect } from 'react';
import { useWhiteboardStore } from '../store/whiteboard';
import { SearchResult } from '../types';

const getElementTypeIcon = (type?: string) => {
  switch (type) {
    case 'text':
      return '🔤';
    case 'sticky-note':
      return '📝';
    case 'task-card':
      return '✅';
    case 'layer':
      return '📁';
    default:
      return '📄';
  }
};

const getElementTypeName = (type?: string) => {
  switch (type) {
    case 'text':
      return '文本';
    case 'sticky-note':
      return '便签';
    case 'task-card':
      return '任务卡片';
    case 'layer':
      return '图层';
    default:
      return '元素';
  }
};

const highlightText = (text: string, query: string) => {
  if (!query.trim()) return text;
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts = [];
  let lastIndex = 0;
  let index;

  while ((index = lowerText.indexOf(lowerQuery, lastIndex)) !== -1) {
    if (index > lastIndex) {
      parts.push(<span key={lastIndex}>{text.slice(lastIndex, index)}</span>);
    }
    parts.push(
      <mark key={index} style={{
        background: '#FFEB3B',
        padding: '0 2px',
        borderRadius: '2px',
      }}>
        {text.slice(index, index + query.length)}
      </mark>
    );
    lastIndex = index + query.length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : text;
};

const SearchResultItem: React.FC<{
  result: SearchResult;
  query: string;
  isSelected: boolean;
  onClick: () => void;
}> = ({ result, query, isSelected, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 12px',
        borderRadius: '6px',
        cursor: 'pointer',
        background: isSelected ? '#e3f2fd' : '#f9fafb',
        border: isSelected ? '1px solid #2196f3' : '1px solid transparent',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = '#f3f4f6';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = '#f9fafb';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '14px' }}>{getElementTypeIcon(result.elementType || result.type)}</span>
        <span style={{
          fontSize: '11px',
          color: '#6b7280',
          background: '#e5e7eb',
          padding: '2px 6px',
          borderRadius: '4px',
        }}>
          {getElementTypeName(result.elementType || result.type)}
        </span>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>
          {result.layerName}
        </span>
      </div>
      <div style={{
        fontSize: '13px',
        color: '#374151',
        lineHeight: '1.4',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {highlightText(result.matchedText, query)}
      </div>
    </div>
  );
};

export const SearchPanel: React.FC = () => {
  const {
    showSearchPanel,
    setShowSearchPanel,
    searchQuery,
    searchResults,
    selectedSearchResultId,
    performSearch,
    navigateToSearchResult,
    setSelectedSearchResultId,
  } = useWhiteboardStore();

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSearchPanel && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSearchPanel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearchPanel(!showSearchPanel);
      }
      if (e.key === 'Escape' && showSearchPanel) {
        setShowSearchPanel(false);
        setSelectedSearchResultId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearchPanel, setShowSearchPanel, setSelectedSearchResultId]);

  if (!showSearchPanel) return null;

  const handleClose = () => {
    setShowSearchPanel(false);
    setSelectedSearchResultId(null);
    performSearch('');
  };

  const handleResultClick = (result: SearchResult) => {
    navigateToSearchResult(result);
  };

  return (
    <div style={{
      position: 'absolute',
      top: '12px',
      right: '12px',
      width: '320px',
      maxHeight: 'calc(100% - 24px)',
      background: '#fff',
      borderRadius: '10px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ fontSize: '16px', color: '#6b7280' }}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => performSearch(e.target.value)}
          placeholder="搜索便签、文本、图层..."
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '14px',
            padding: '4px 0',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => performSearch('')}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#9ca3af',
              padding: '4px',
            }}
          >
            ✕
          </button>
        )}
        <button
          onClick={handleClose}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#9ca3af',
            padding: '4px',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{
        padding: '8px 12px',
        fontSize: '12px',
        color: '#6b7280',
        borderBottom: '1px solid #f3f4f6',
        background: '#fafafa',
      }}>
        {searchQuery.trim() ? (
          <span>找到 <strong style={{ color: '#374151' }}>{searchResults.length}</strong> 个结果</span>
        ) : (
          <span>输入关键词开始搜索</span>
        )}
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}>
        {searchResults.length > 0 ? (
          searchResults.map((result) => (
            <SearchResultItem
              key={result.id}
              result={result}
              query={searchQuery}
              isSelected={selectedSearchResultId === result.id}
              onClick={() => handleResultClick(result)}
            />
          ))
        ) : searchQuery.trim() ? (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: '13px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
            未找到匹配的内容
          </div>
        ) : (
          <div style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: '12px',
          }}>
            <div style={{ marginBottom: '8px' }}>💡 提示</div>
            <div>支持搜索：</div>
            <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
              <span style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>📝 便签</span>
              <span style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>🔤 文本</span>
              <span style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>✅ 任务卡片</span>
              <span style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>📁 图层</span>
            </div>
          </div>
        )}
      </div>

      <div style={{
        padding: '8px 12px',
        fontSize: '11px',
        color: '#9ca3af',
        borderTop: '1px solid #f3f4f6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>⌘F 搜索 · ESC 关闭</span>
      </div>
    </div>
  );
};
