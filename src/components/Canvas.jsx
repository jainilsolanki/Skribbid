import { useEffect, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';

const Canvas = ({ socket, roomId, isDrawer }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState(null);
  const [color, setColor] = useState('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Initialize canvas and context
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set initial drawing styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    setContext(ctx);

    // Fix for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }, []); // Only run once on mount

  // Socket event listeners
  useEffect(() => {
    if (!socket || !context) return;

    socket.on('draw', (drawData) => {
      const { x, y, color, drawing } = drawData;
      context.strokeStyle = color;
      if (!drawing) {
        context.beginPath();
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
        context.stroke();
      }
    });

    socket.on('clear_canvas', () => {
      console.log('Received clear canvas event');
      const canvas = canvasRef.current;
      if (canvas && context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.beginPath();
        // Reset color to black
        setColor('#000000');
        context.strokeStyle = '#000000';
      }
    });

    return () => {
      socket.off('draw');
      socket.off('clear_canvas');
    };
  }, [socket, context]);

  // Update context color when color changes
  useEffect(() => {
    if (context) {
      context.strokeStyle = color;
    }
  }, [color, context]);

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * (1 / scaleX),
      y: (e.clientY - rect.top) * (1 / scaleY)
    };
  };

  const startDrawing = (e) => {
    if (!isDrawer || !context) return;

    const pos = getMousePos(e);
    context.beginPath();
    context.moveTo(pos.x, pos.y);
    setIsDrawing(true);

    socket?.emit('draw', {
      roomId,
      x: pos.x,
      y: pos.y,
      color,
      drawing: false
    });
  };

  const draw = (e) => {
    if (!isDrawing || !isDrawer || !context) return;

    const pos = getMousePos(e);
    context.lineTo(pos.x, pos.y);
    context.stroke();

    socket?.emit('draw', {
      roomId,
      x: pos.x,
      y: pos.y,
      color,
      drawing: true
    });
  };

  const stopDrawing = () => {
    if (!isDrawer || !context) return;
    context.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.beginPath();
      setColor('#000000');
      context.strokeStyle = '#000000';
    }
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
          className="w-full h-[600px] border-2 border-gray-300 rounded-lg bg-white cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            startDrawing({ clientX: touch.clientX, clientY: touch.clientY });
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            draw({ clientX: touch.clientX, clientY: touch.clientY });
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stopDrawing();
          }}
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
