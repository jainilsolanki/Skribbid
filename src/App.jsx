import { useState } from 'react';
import { io } from 'socket.io-client';
import Game from './components/Game';

const ENDPOINT = 'http://localhost:3001';

function App() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);

  const handleJoin = () => {
    if (!username || !roomId) return;
    
    const newSocket = io(ENDPOINT);
    setSocket(newSocket);
    
    newSocket.emit('join_room', { username, roomId });
    setJoined(true);
  };

  const handleCreateRoom = () => {
    if (!username) return;
    
    const newSocket = io(ENDPOINT);
    setSocket(newSocket);
    
    newSocket.emit('create_room', { username });
    setJoined(true);
  };

  if (joined && socket) {
    return <Game socket={socket} username={username} roomId={roomId} />;
  }

  return (
    <div className="h-full w-full grid grid-cols-1 md:grid-cols-2">
      {/* Left Column - Form */}
      <div className="bg-black flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="backdrop-blur-lg bg-white/5 p-8 rounded-2xl shadow-2xl border border-white/10">
            <h1 className="text-4xl font-bold text-white mb-8 text-center">Skribble Game</h1>
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

      {/* Right Column - Image */}
      <div 
        className="hidden md:block h-full w-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1671955101204-42ea9a352cdb?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`
        }}
      />
    </div>
  );
}

export default App;
