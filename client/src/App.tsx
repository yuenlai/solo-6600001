import React, { useEffect } from 'react';
import { WhiteboardCanvas } from './components/WhiteboardCanvas';
import { Toolbar } from './components/Toolbar';
import { LayerPanel } from './components/LayerPanel';
import { CursorOverlay } from './components/CursorOverlay';
import { useWhiteboardStore } from './store/whiteboard';
import { socketService } from './services/socket';
import { Board, BoardElement, CursorPosition, Layer, CanvasTransform } from './types';

const App: React.FC = () => {
  const {
    setBoard, updateCursor, removeCursor, setCursors, username
  } = useWhiteboardStore();

  useEffect(() => {
    // Create a default board for demo
    const defaultBoard: Board = {
      _id: 'demo-board-1',
      name: '协作白板 Demo',
      ownerId: 'user-1',
      collaborators: [],
      layers: [{ name: '图层 1', visible: true, locked: false, order: 0, elements: [] }],
      width: 3000,
      height: 2000,
      backgroundColor: '#f5f5f5'
    };
    setBoard(defaultBoard);

    // Connect to socket
    const socket = socketService.connect();
    socketService.joinBoard(defaultBoard._id, username);

    // Socket event listeners
    socketService.onUserJoined((data) => {
      console.log(`${data.username} 加入了白板`);
    });
    socketService.onUserLeft((data) => {
      removeCursor(data.socketId);
    });
    socketService.onActiveUsers((users) => {
      setCursors(users);
    });
    socketService.onCursorUpdate((data: CursorPosition) => {
      updateCursor(data);
    });
    socketService.onElementAdded((data: { element: BoardElement; layerIndex: number }) => {
      const { board } = useWhiteboardStore.getState();
      if (board) {
        const layers = [...board.layers];
        layers[data.layerIndex] = {
          ...layers[data.layerIndex],
          elements: [...layers[data.layerIndex].elements, data.element]
        };
        setBoard({ ...board, layers });
      }
    });
    socketService.onLayersUpdated((data: { layers: Layer[] }) => {
      const { board } = useWhiteboardStore.getState();
      if (board) {
        setBoard({ ...board, layers: data.layers });
      }
    });
    socketService.onCanvasTransformed((data: { transform: CanvasTransform }) => {
      useWhiteboardStore.getState().setCanvasTransform(data.transform);
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Toolbar />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <WhiteboardCanvas />
        <CursorOverlay />
      </div>
      <LayerPanel />
    </div>
  );
};

export default App;
