import { useState, useEffect, useRef } from 'react';
import Canvas from './Canvas';
import Lobby from './Lobby';
import Leaderboard from './Leaderboard';

const Game = ({ socket, username, roomId }) => {
  const [gameState, setGameState] = useState('lobby'); // lobby, playing, ended
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [currentDrawer, setCurrentDrawer] = useState(null);
  const [word, setWord] = useState('');
  const [wordChoices, setWordChoices] = useState(null);
  const [wordLengths, setWordLengths] = useState([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [guess, setGuess] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [systemMessage, setSystemMessage] = useState('');
  const [roundActive, setRoundActive] = useState(false);
  const [gameSettings, setGameSettings] = useState({
    roundTime: 60,
    maxRounds: 5
  });
  const [currentRound, setCurrentRound] = useState(1);
  const [isDrawer, setIsDrawer] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState([]);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('player_joined', ({ players, scores, currentDrawer }) => {
      console.log('Player joined:', { players, scores, currentDrawer });
      setPlayers(players);
      setScores(scores);
      setCurrentDrawer(currentDrawer);
    });

    socket.on('game_started', (settings) => {
      console.log('Game started with settings:', settings);
      setGameSettings(settings);
      setGameState('playing');
    });

    socket.on('game_ended', ({ finalPlayers }) => {
      console.log('Game ended with final players:', finalPlayers);
      setPlayers(finalPlayers);
      setGameState('ended');
    });

    socket.on('chat_message', ({ player, message }) => {
      console.log('Chat message received:', { player, message });
      setChatMessages(prev => [...prev, { player, message, type: 'guess' }]);
    });

    socket.on('round_started', ({ drawer, timeLeft, roundNumber }) => {
      setCurrentDrawer(drawer);
      setTimeLeft(timeLeft);
      setRoundActive(true);
      setCurrentRound(roundNumber);
      setWord(''); // Reset word at round start
      setSystemMessage(`New round started! ${drawer === socket.id ? 'You are' : players.find(p => p.id === drawer)?.username + ' is'} drawing.`);
    });

    socket.on('round_ended', ({ word, scores, nextDrawer }) => {
      setRoundActive(false);
      setSystemMessage(`Round ended! The word was: ${word}`);
      setScores(scores);
      setTimeLeft(0);
      setWord(''); // Clear word at round end
    });

    socket.on('timer_update', (time) => {
      setTimeLeft(time);
    });

    socket.on('word_to_draw', ({ word, isDrawer, revealedIndices }) => {
      setWord(word);
      setIsDrawer(isDrawer);
      setRevealedIndices(revealedIndices);
      if (isDrawer) {
        setSystemMessage(`Your word to draw is: ${word}`);
      }
    });

    socket.on('letter_revealed', ({ revealedIndices }) => {
      setRevealedIndices(revealedIndices);
    });

    socket.on('word_lengths', (lengths) => {
      setWordLengths(lengths);
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

    socket.on('choose_word', ({ words, timeLeft }) => {
      setWordChoices(words);
      // Start a timer for word selection
      setTimeout(() => {
        if (words.length > 0) {
          // If no word was chosen, automatically choose the first one
          socket.emit('choose_word', { roomId, wordIndex: 0 });
        }
      }, timeLeft * 1000);
    });

    return () => {
      socket.off('player_joined');
      socket.off('game_started');
      socket.off('game_ended');
      socket.off('chat_message');
      socket.off('round_started');
      socket.off('round_ended');
      socket.off('timer_update');
      socket.off('word_to_draw');
      socket.off('letter_revealed');
      socket.off('word_lengths');
      socket.off('correct_guess');
      socket.off('choose_word');
    };
  }, [socket, players, roomId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, systemMessage]);

  const handleStartGame = (settings) => {
    socket.emit('start_game', { roomId, settings });
  };

  const handlePlayAgain = () => {
    setGameState('lobby');
    socket.emit('play_again', { roomId });
  };

  const handleExitToMenu = () => {
    window.location.reload();
  };

  const handleGuess = (e) => {
    e.preventDefault();
    if (!guess.trim()) return;

    socket.emit('guess', { roomId, guess: guess.trim() });
    setGuess('');
  };

  const WordChoiceOverlay = ({ words, onChoose }) => {
    if (!words) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-xl font-bold mb-4">Choose a word to draw:</h2>
          <div className="space-y-3">
            {words.map((word, index) => (
              <button
                key={index}
                onClick={() => onChoose(index)}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-lg"
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (gameState === 'lobby') {
    return (
      <Lobby
        socket={socket}
        username={username}
        roomId={roomId}
        onStartGame={handleStartGame}
        players={players}
      />
    );
  }

  if (gameState === 'ended') {
    return (
      <Leaderboard
        players={players}
        onPlayAgain={handlePlayAgain}
        onExit={handleExitToMenu}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <WordChoiceOverlay
        words={wordChoices}
        onChoose={(index) => {
          socket.emit('choose_word', { roomId, wordIndex: index });
          setWordChoices(null);
        }}
      />
      <div className="max-w-6xl mx-auto">
        {/* Header with Room Info */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">Skribbid Together</h1>
            <div className="bg-blue-600/20 border border-blue-500 px-4 py-2 rounded-lg flex items-baseline gap-2">
              Room ID: <span className="font-mono font-bold">{roomId}</span>
              <button
                onClick={() => navigator.clipboard.writeText(roomId)}
                className="ml-2 px-2 py-1 bg-blue-500 hover:bg-blue-600 rounded text-sm transition-colors"
                title="Copy Room ID"
              >
                Copy
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-purple-600/20 border border-purple-500 px-4 py-2 rounded-lg">
              Round {currentRound}/{gameSettings.maxRounds}
            </div>
            <div className="text-gray-400">
              Playing as: <span className="font-semibold text-white">{username}</span>
            </div>
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
                  {!isDrawer ? (
                    <div className="bg-gray-600 px-3 py-2 rounded flex items-center justify-center min-w-[150px]">
                      <div className="flex gap-4">
                        {word ? word.split(' ').map((wordPart, wordIndex) => (
                          <div key={wordIndex} className="flex gap-[2px] items-end">
                            {wordPart.split('').map((letter, letterIndex) => {
                              const adjustedIndex = wordPart.length * wordIndex + letterIndex;
                              const isRevealed = revealedIndices.includes(adjustedIndex);
                              return isRevealed ? (
                                <div key={letterIndex} className="w-6 text-center border-b-2 border-white">
                                  {letter}
                                </div>
                              ) : (
                                <div key={letterIndex} className="w-6 h-[2px] bg-white" />
                              );
                            })}{/* Add word length */}
                            {wordPart.length}
                          </div>
                        )) : <div className="text-gray-400">Waiting for word...</div>}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-600 px-3 py-1 rounded">
                      Word to draw: {word || 'Waiting...'}
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
                    className={`p-2 rounded ${player.id === currentDrawer
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
              <div 
                ref={chatContainerRef}
                className="h-[calc(100vh-24rem)] overflow-y-auto border border-gray-700 rounded p-2 mb-4 bg-gray-900/50 scroll-smooth"
              >
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`mb-2 p-2 rounded ${message.type === 'system'
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
