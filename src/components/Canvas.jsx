import { useEffect, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';

const Canvas = ({ socket, roomId, isDrawer }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState(null);
  const [color, setColor] = useState('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    setContext(ctx);

    // Listen for draw events from other players
    if (socket) {
      socket.on('draw', (drawData) => {
        console.log('Received draw event:', drawData);
        const { x, y, color, drawing } = drawData;
        ctx.strokeStyle = color;
        if (!drawing) {
          ctx.beginPath();
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      });

      socket.on('clear_canvas', () => {
        console.log('Received clear canvas event');
        clearCanvas();
      });
    }

    return () => {
      if (socket) {
        socket.off('draw');
        socket.off('clear_canvas');
      }
    };
  }, [socket]);

  useEffect(() => {
    if (context) {
      context.strokeStyle = color;
    }
  }, [color, context]);

  const startDrawing = (e) => {
    if (!isDrawer) return;

    const { offsetX, offsetY } = e.nativeEvent;
    context.beginPath();
    context.moveTo(offsetX, offsetY);
    setIsDrawing(true);

    // Emit draw start event
    console.log('Emitting draw start:', { x: offsetX, y: offsetY, color, drawing: false });
    socket?.emit('draw', {
      roomId,
      x: offsetX,
      y: offsetY,
      color,
      drawing: false
    });
  };

  const draw = (e) => {
    if (!isDrawing || !isDrawer) return;

    const { offsetX, offsetY } = e.nativeEvent;
    context.lineTo(offsetX, offsetY);
    context.stroke();

    // Emit draw event
    console.log('Emitting draw:', { x: offsetX, y: offsetY, color, drawing: true });
    socket?.emit('draw', {
      roomId,
      x: offsetX,
      y: offsetY,
      color,
      drawing: true
    });
  };

  const stopDrawing = () => {
    if (!isDrawer) return;
    
    context.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleClearCanvas = () => {
    if (!isDrawer) return;
    clearCanvas();
    socket?.emit('clear_canvas', { roomId });
  };

  return (
    <div className="relative w-full">
      <div className="flex justify-center items-center w-full">
        <canvas
          ref={canvasRef}
          width={1024}
          height={768}
          className="w-full border-2 border-gray-300 rounded-lg bg-white cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
        />
      </div>
      
      {isDrawer && (
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="relative">
            <button
              className="w-8 h-8 rounded border border-gray-300"
              style={{ backgroundColor: color }}
              onClick={() => setShowColorPicker(!showColorPicker)}
            />
            {showColorPicker && (
              <div className="absolute left-0 top-10 z-10">
                <HexColorPicker color={color} onChange={setColor} />
              </div>
            )}
          </div>
          <button
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={handleClearCanvas}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default Canvas;
