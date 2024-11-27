import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Game from './components/Game';

const ENDPOINT = 'http://localhost:3001';

function App() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');
  const [gameRoomId, setGameRoomId] = useState('');

  useEffect(() => {
    if (!socket) return;

    socket.on('room_created', ({ roomId }) => {
      console.log('Room created with ID:', roomId);
      setGameRoomId(roomId);
      setJoined(true);
      setError('');
    });

    socket.on('join_success', ({ roomId }) => {
      console.log('Successfully joined room:', roomId);
      setGameRoomId(roomId);
      setJoined(true);
      setError('');
    });

    socket.on('room_error', ({ message }) => {
      console.log('Room error:', message);
      setError(message);
    });

    return () => {
      socket.off('room_created');
      socket.off('join_success');
      socket.off('room_error');
    };
  }, [socket]);

  const handleJoin = () => {
    if (!username || !roomId) return;
    
    const newSocket = io(ENDPOINT);
    setSocket(newSocket);
    
    const upperRoomId = roomId.toUpperCase();
    newSocket.emit('join_room', { username, roomId: upperRoomId });
  };

  const handleCreateRoom = () => {
    if (!username) return;
    
    const newSocket = io(ENDPOINT);
    setSocket(newSocket);
    
    newSocket.emit('create_room', { username });
  };

  if (joined && socket) {
    return <Game socket={socket} username={username} roomId={gameRoomId} />;
  }

  return (
    <div className="h-full w-full grid grid-cols-1 md:grid-cols-12">
      {/* Left Column - Form (4/12) */}
      <div className="md:col-span-4 bg-gray-900 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="backdrop-blur-lg bg-white/5 p-8 rounded-2xl shadow-2xl border border-white/10">
            <h1 className="text-4xl font-bold text-white mb-8 text-center">Skribble Game</h1>
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-4">
                {error}
              </div>
            )}
            <div className="space-y-6">
              <div>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/25"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Enter room ID (optional)"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/25"
                />
              </div>
              <div className="space-y-4">
                <button
                  onClick={handleJoin}
                  disabled={!username || !roomId}
                  className="w-full px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join Room
                </button>
                <button
                  onClick={handleCreateRoom}
                  disabled={!username}
                  className="w-full px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create New Room
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Image (8/12) */}
      <div 
        className="hidden md:block md:col-span-8 h-full w-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1671955101204-42ea9a352cdb?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`
        }}
      />
    </div>
  );
}

export default App;
