import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Game from './components/Game';

const ENDPOINT = import.meta.env.VITE_ENDPOINT;

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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-purple-900 text-white">
      <div className="container mx-auto px-4 py-12 lg:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Welcome Text */}
            <div className="text-center lg:text-left space-y-8">
              <h1 className="text-5xl lg:text-7xl font-bold">
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
                  Skribbid Together
                </span>
              </h1>
              <p className="text-xl text-gray-300 leading-relaxed max-w-2xl">
                Draw, guess, and have fun with friends in this multiplayer drawing and guessing game. 
                Create a room or join one to start playing!
              </p>
              
              {/* Features Grid */}
              <div className="pt-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 to-transparent"></div>
                  <span className="text-gray-400 font-medium">Game Features</span>
                  <div className="flex-1 h-px bg-gradient-to-l from-purple-500/50 to-transparent"></div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { icon: '🎨', title: 'Real-time Drawing', desc: 'Draw and watch others draw in real-time' },
                    { icon: '🎯', title: 'Score Points', desc: 'Earn points by guessing correctly' },
                    { icon: '💬', title: 'Live Chat', desc: 'Chat and guess with other players' },
                    { icon: '🏆', title: 'Leaderboard', desc: 'Compete to reach the top' },
                  ].map((feature, index) => (
                    <div 
                      key={index}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all"
                    >
                      <div className="text-2xl mb-2">{feature.icon}</div>
                      <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                      <p className="text-sm text-gray-400">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Join Form */}
            <div className="w-full max-w-md mx-auto">
              <div className="backdrop-blur-xl bg-white/5 p-8 rounded-2xl shadow-2xl border border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
                <div className="relative">
                  <h2 className="text-3xl font-bold text-center mb-8">
                    Join the Fun
                  </h2>
                  
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 backdrop-blur-sm">
                      <p className="text-sm">{error}</p>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Room ID
                      </label>
                      <input
                        type="text"
                        placeholder="Enter room ID (optional)"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                      />
                    </div>

                    <div className="space-y-4 pt-4">
                      <button
                        onClick={handleJoin}
                        disabled={!username || !roomId}
                        className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg disabled:shadow-none"
                      >
                        Join Room
                      </button>
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-gray-900/50 text-gray-400 backdrop-blur-sm">
                            or
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleCreateRoom}
                        disabled={!username}
                        className="w-full px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        Create New Room
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
