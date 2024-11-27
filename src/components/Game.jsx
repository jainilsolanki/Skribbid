import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Canvas from './Canvas';

const Game = () => {
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [currentDrawer, setCurrentDrawer] = useState(null);
  const [word, setWord] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [guess, setGuess] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [error, setError] = useState('');
  const [roundActive, setRoundActive] = useState(false);
  const [systemMessage, setSystemMessage] = useState('');

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('room_created', ({ roomId }) => {
      console.log('Room created:', roomId);
      setRoomId(roomId);
      setIsJoined(true);
      setError('');
    });

    socket.on('join_success', ({ roomId }) => {
      console.log('Successfully joined room:', roomId);
      setRoomId(roomId);
      setIsJoined(true);
      setError('');
    });

    socket.on('room_error', ({ message }) => {
      console.log('Room error:', message);
      setError(message);
    });

    socket.on('player_joined', ({ players, scores, currentDrawer }) => {
      console.log('Player joined:', { players, scores, currentDrawer });
      setPlayers(players);
      setScores(scores);
      setCurrentDrawer(currentDrawer);
      setError('');
    });

    socket.on('chat_message', ({ player, message }) => {
      console.log('Chat message received:', { player, message });
      setChatMessages(prev => [...prev, { player, message, type: 'guess' }]);
    });

    socket.on('round_started', ({ drawer, timeLeft }) => {
      setCurrentDrawer(drawer);
      setTimeLeft(timeLeft);
      setRoundActive(true);
      setSystemMessage(`New round started! ${drawer === socket.id ? 'You are' : 'Someone else is'} drawing.`);
    });

    socket.on('round_ended', ({ word, scores, nextDrawer }) => {
      setRoundActive(false);
      setSystemMessage(`Round ended! The word was: ${word}`);
      setScores(scores);
      setTimeLeft(0);
    });

    socket.on('timer_update', (time) => {
      setTimeLeft(time);
    });

    socket.on('word_to_draw', (word) => {
      setWord(word);
      setSystemMessage(`Your word to draw is: ${word}`);
    });

    socket.on('correct_guess', ({ player, scores }) => {
      console.log('Correct guess:', { player, scores });
      setScores(scores);
      const playerName = players.find(p => p.id === player)?.username;
      setChatMessages(prev => [...prev, {
        player: 'System',
        message: `${playerName} guessed the word correctly!`,
        type: 'system'
      }]);
    });

    return () => {
      socket.off('room_created');
      socket.off('join_success');
      socket.off('room_error');
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('round_started');
      socket.off('round_ended');
      socket.off('timer_update');
      socket.off('word_to_draw');
      socket.off('correct_guess');
      socket.off('chat_message');
    };
  }, [socket, players]);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    console.log('Creating room with username:', username);
    socket.emit('create_room', { username });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();    
    if (!roomId.trim() || !username.trim()) return;

    const upperRoomId = roomId.toUpperCase();
    console.log('Joining room:', { roomId: upperRoomId, username });
    socket.emit('join_room', { roomId: upperRoomId, username });
  };

  const handleGuess = (e) => {
    e.preventDefault();
    if (!guess.trim()) return;

    console.log('Sending guess:', { roomId, guess });
    socket.emit('guess', { roomId, guess });
    setGuess('');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {!isJoined ? (
        <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg">
          <h1 className="text-2xl font-bold mb-6 text-center">Join Skribble Game</h1>
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
              >
                Create New Room
              </button>
              <button
                type="button"
                onClick={handleJoinRoom}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
              >
                Join Room
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Room ID</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter room ID to join"
              />
            </div>
          </form>
        </div>
      ) : (
        <div className="container mx-auto">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="text-xl font-bold">Room: {roomId}</div>
                <div className="bg-blue-600 px-3 py-1 rounded">
                  Time: {timeLeft}s
                </div>
              </div>
              <div className="flex items-center gap-4">
                {currentDrawer === socket.id ? (
                  <div className="bg-green-600 px-3 py-1 rounded">
                    Your turn to draw: {word}
                  </div>
                ) : (
                  <div className="bg-purple-600 px-3 py-1 rounded">
                    {players.find(p => p.id === currentDrawer)?.username}'s turn
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-9">
                <Canvas
                  socket={socket}
                  roomId={roomId}
                  isDrawer={currentDrawer === socket.id}
                />
              </div>

              <div className="col-span-3 space-y-4">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h2 className="text-xl font-semibold mb-3">Players</h2>
                  <div className="space-y-2">
                    {players.map((player) => (
                      <div
                        key={player.id}
                        className={`p-2 rounded ${
                          player.id === currentDrawer
                            ? 'bg-green-600/20 border border-green-500'
                            : 'bg-gray-700'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{player.username}</span>
                          <span className="font-medium">
                            {scores[player.id] || 0}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-800 p-4 rounded-lg">
                  <h2 className="text-xl font-semibold mb-3">Chat & Guesses</h2>
                  <div className="h-[calc(100vh-24rem)] overflow-y-auto border border-gray-700 rounded p-2 mb-4 bg-gray-900/50">
                    {chatMessages.map((message, index) => (
                      <div
                        key={index}
                        className={`mb-2 p-2 rounded ${
                          message.type === 'system'
                            ? 'bg-yellow-900/30 text-yellow-200'
                            : 'bg-gray-800'
                        }`}
                      >
                        {message.player && <span className="font-medium text-blue-400">{message.player}: </span>}
                        {message.message}
                      </div>
                    ))}
                    {systemMessage && (
                      <div className="mb-2 p-2 rounded bg-yellow-900/30 text-yellow-200">
                        {systemMessage}
                      </div>
                    )}
                  </div>
                  {currentDrawer !== socket.id && (
                    <form onSubmit={handleGuess} className="flex gap-2">
                      <input
                        type="text"
                        value={guess}
                        onChange={(e) => setGuess(e.target.value)}
                        className="flex-1 p-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Type your guess..."
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                      >
                        Guess
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
