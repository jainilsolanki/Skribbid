import { useEffect, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { FaPaintBrush, FaTrash } from 'react-icons/fa';
import { RiPencilFill, RiEraserFill } from 'react-icons/ri';
import { IoArrowUndoSharp, IoArrowRedoSharp } from 'react-icons/io5';
import { TbArrowBackUp, TbArrowForwardUp } from 'react-icons/tb';
import { BsBrush } from 'react-icons/bs';
import { LuEraser } from 'react-icons/lu';
import { BsCircleFill } from 'react-icons/bs';

const Canvas = ({ socket, roomId, isDrawer }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState(null);
  const [color, setColor] = useState('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentTool, setCurrentTool] = useState('brush'); // 'brush' or 'eraser'
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [lineWidth, setLineWidth] = useState(2);

  
  // Initialize canvas and context
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set initial drawing styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = lineWidth;
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

    // Reset drawing properties after DPI scaling
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = '#000000';

    // Save initial blank canvas state
    const blankState = canvas.toDataURL();
    setUndoStack([blankState]);
  }, []); // Only run once on mount

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const newState = canvas.toDataURL();
    setUndoStack(prev => {
      // Don't add if it's the same as the last state
      if (prev[prev.length - 1] === newState) return prev;
      return [...prev, newState];
    });
    setRedoStack([]); // Clear redo stack when new action is performed
  };

  const handleUndo = () => {
    if (undoStack.length <= 1) return; // Keep at least one state
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Move current state to redo stack
    const currentState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, currentState]);
    
    // Load previous state
    const previousState = undoStack[undoStack.length - 2];
    const img = new Image();
    img.src = previousState;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Remove the current state from undo stack
      setUndoStack(prev => prev.slice(0, -1));
      
      // Emit the canvas state to other users
      socket?.emit('canvas_state', { roomId, state: previousState });
    };
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Get last redo state
    const redoState = redoStack[redoStack.length - 1];
    const img = new Image();
    img.src = redoState;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Update stacks
      setUndoStack(prev => [...prev, redoState]);
      setRedoStack(prev => prev.slice(0, -1));
      
      // Emit the canvas state to other users
      socket?.emit('canvas_state', { roomId, state: redoState });
    };
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket || !context) return;

    socket.on('draw', (drawData) => {
      const { x, y, color, drawing, tool, width } = drawData;
      
      if (!drawing) {
        context.beginPath();
        context.moveTo(x, y);
      }

      // Set drawing properties
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
      context.lineWidth = Number(width); // Ensure width is a number
      
      if (drawing) {
        context.lineTo(x, y);
        context.stroke();
        context.beginPath();
        context.moveTo(x, y);
      }
    });

    socket.on('width_change', ({ width, tool }) => {
      if (context) {
        context.lineWidth = tool === 'eraser' ? width * 2 : width;
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
        saveCanvasState();
      }
    });

    socket.on('canvas_state', ({ state }) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = state;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
    });

    return () => {
      socket.off('draw');
      socket.off('clear_canvas');
      socket.off('canvas_state');
      socket.off('width_change');
    };
  }, [socket, context]);

  // Update context color when color changes
  useEffect(() => {
    if (context && currentTool === 'brush') {
      context.strokeStyle = color;
    }
  }, [color, context, currentTool]);

  // Update line width when it changes
  useEffect(() => {
    if (context) {
      const newWidth = currentTool === 'eraser' ? lineWidth * 2 : lineWidth;
      context.lineWidth = newWidth;
      
      // Emit width change to other users
      socket?.emit('width_change', {
        roomId,
        width: lineWidth,
        tool: currentTool
      });
    }
  }, [lineWidth, currentTool, context, socket, roomId]);

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
    const currentWidth = currentTool === 'eraser' ? lineWidth * 2 : lineWidth;
    
    // Set drawing properties
    context.beginPath();
    context.moveTo(pos.x, pos.y);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = currentTool === 'eraser' ? '#FFFFFF' : color;
    context.lineWidth = currentWidth;
    
    setIsDrawing(true);

    socket?.emit('draw', {
      roomId,
      x: pos.x,
      y: pos.y,
      color,
      drawing: false,
      tool: currentTool,
      width: currentWidth
    });
  };

  const draw = (e) => {
    if (!isDrawing || !isDrawer || !context) return;

    const pos = getMousePos(e);
    const currentWidth = currentTool === 'eraser' ? lineWidth * 2 : lineWidth;
    
    // Ensure drawing properties are set
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = currentTool === 'eraser' ? '#FFFFFF' : color;
    context.lineWidth = currentWidth;
    
    context.lineTo(pos.x, pos.y);
    context.stroke();
    context.beginPath();
    context.moveTo(pos.x, pos.y);

    socket?.emit('draw', {
      roomId,
      x: pos.x,
      y: pos.y,
      color,
      drawing: true,
      tool: currentTool,
      width: currentWidth
    });
  };

  const stopDrawing = () => {
    if (!isDrawer || !context) return;
    context.closePath();
    setIsDrawing(false);
    saveCanvasState();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.beginPath();
      setColor('#000000');
      context.strokeStyle = '#000000';
      saveCanvasState();
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
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-gray-200">
          {/* Drawing Tools */}
          <div className="flex items-center gap-2 pr-4 border-r border-gray-300">
            {/* Brush Tool */}
            <button
              className={`w-10 h-10 contents text-gray-600 rounded-lg transition-all ${
                currentTool === 'brush' ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-100'
              }`}
              onClick={() => setCurrentTool('brush')}
              title="Brush"
            >
              <RiPencilFill className="w-6 h-6" />
            </button>

            {/* Eraser Tool */}
            <button
              className={`w-10 h-10 contents text-gray-600 rounded-lg transition-all ${
                currentTool === 'eraser' ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-100'
              }`}
              onClick={() => setCurrentTool('eraser')}
              title="Eraser"
            >
              <RiEraserFill className="w-6 h-6" />
            </button>
          </div>

          {/* Color Picker */}
          <div className="flex items-center gap-2 px-4 border-r border-gray-300">
            <div className="relative">
              <button
                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                  showColorPicker ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{ 
                  backgroundColor: color,
                  borderColor: color === '#FFFFFF' ? '#E5E7EB' : color
                }}
                onClick={() => setShowColorPicker(!showColorPicker)}
                title="Color Picker"
              >
                {currentTool === 'brush' && (
                  <FaPaintBrush className="w-5 h-5 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white mix-blend-difference" />
                )}
              </button>
              {showColorPicker && (
                <div className="absolute left-0 top-12 z-10 bg-white p-2 rounded-lg shadow-xl border border-gray-200">
                  <HexColorPicker color={color} onChange={setColor} />
                  <div className="grid grid-cols-5 gap-1 mt-2">
                    {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
                      '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000'].map((presetColor) => (
                      <button
                        key={presetColor}
                        className={`w-6 h-6 rounded-md border-2 transition-all hover:scale-110 ${
                          color === presetColor ? 'ring-2 ring-blue-500' : ''
                        }`}
                        style={{ 
                          backgroundColor: presetColor,
                          borderColor: presetColor === '#FFFFFF' ? '#E5E7EB' : presetColor
                        }}
                        onClick={() => {
                          setColor(presetColor);
                          setCurrentTool('brush');
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Line Width */}
            <div className="relative">
              <select
                className="h-10 px-3 appearance-none bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-gray-600 pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={lineWidth}
                onChange={(e) => {
                  const newWidth = Number(e.target.value);
                  setLineWidth(newWidth);
                }}
                title="Stroke Width"
              >
                <option value="2">Thin</option>
                <option value="4">Medium</option>
                <option value="6">Thick</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              </div>
            </div>

          {/* Undo/Redo */}
          <div className="flex items-center gap-2 px-4 border-r border-gray-300">
            <button
              className="w-10 h-10 contents text-blue-600 rounded-lg disabled:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-all"
              onClick={handleUndo}
              disabled={undoStack.length <= 1}
              title="Undo"
            >
              <IoArrowUndoSharp className="w-6 h-6" />
            </button>
            <button
              className="w-10 h-10 contents text-blue-600 rounded-lg disabled:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-all"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Redo"
            >
              <IoArrowRedoSharp className="w-6 h-6" />
            </button>
          </div>

          {/* Clear Canvas */}
          <button
            className="w-10 h-10 rounded-lg text-red-600 hover:bg-red-50 transition-all contents"
            onClick={handleClearCanvas}
            title="Clear Canvas"
          >
            <FaTrash className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Canvas;
