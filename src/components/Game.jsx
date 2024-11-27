import { useState, useEffect } from 'react';
import Canvas from './Canvas';

const Game = ({ socket, username, roomId }) => {
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [currentDrawer, setCurrentDrawer] = useState(null);
  const [word, setWord] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [guess, setGuess] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [systemMessage, setSystemMessage] = useState('');
  const [roundActive, setRoundActive] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on('player_joined', ({ players, scores, currentDrawer }) => {
      console.log('Player joined:', { players, scores, currentDrawer });
      setPlayers(players);
      setScores(scores);
      setCurrentDrawer(currentDrawer);
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
      socket.off('player_joined');
      socket.off('chat_message');
      socket.off('round_started');
      socket.off('round_ended');
      socket.off('timer_update');
      socket.off('word_to_draw');
      socket.off('correct_guess');
    };
  }, [socket, players]);

  const handleGuess = (e) => {
    e.preventDefault();
    if (!guess.trim()) return;

    socket.emit('guess', { roomId, guess: guess.trim() });
    setGuess('');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with Room Info */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">Skribble Game</h1>
            <div className="bg-blue-600/20 border border-blue-500 px-4 py-2 rounded-lg">
              Room ID: <span className="font-mono font-bold">{roomId}</span>
            </div>
          </div>
          <div className="text-gray-400">
            Playing as: <span className="font-semibold text-white">{username}</span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Main Canvas Area */}
          <div className="col-span-9">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 px-3 py-1 rounded">
                    Time: {timeLeft}s
                  </div>
                  {currentDrawer === socket.id && (
                    <div className="bg-green-600 px-3 py-1 rounded">
                      Word to draw: {word}
                    </div>
                  )}
                </div>
                {currentDrawer !== socket.id && (
                  <div className="bg-purple-600 px-3 py-1 rounded">
                    {players.find(p => p.id === currentDrawer)?.username}'s turn
                  </div>
                )}
              </div>
              <Canvas
                socket={socket}
                roomId={roomId}
                isDrawer={currentDrawer === socket.id}
              />
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="col-span-3 space-y-4">
            {/* Players List */}
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

            {/* Chat & Guesses */}
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
                    disabled={!roundActive}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
                    disabled={!roundActive}
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
  );
};

export default Game;
