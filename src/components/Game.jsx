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
  const [wordChoiceTimer, setWordChoiceTimer] = useState(0);
  const chatContainerRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const theme = {
    bg: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
    text: isDarkMode ? 'text-white' : 'text-gray-900',
    card: isDarkMode ? 'bg-gray-800' : 'bg-white',
    border: isDarkMode ? 'border-gray-700' : 'border-gray-200',
    button: isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600',
    buttonText: 'text-white',
    accent: isDarkMode ? 'bg-blue-600/20' : 'bg-blue-50',
    accentBorder: isDarkMode ? 'border-blue-500' : 'border-blue-400',
    input: isDarkMode ? 'bg-gray-700' : 'bg-gray-100',
    chat: isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100/50',
    system: isDarkMode ? 'bg-yellow-900/30 text-yellow-200' : 'bg-yellow-50 text-yellow-800'
  };

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
      setWordChoiceTimer(timeLeft);

      // Start countdown timer
      const countdownInterval = setInterval(() => {
        setWordChoiceTimer(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start a timer for word selection
      const timer = setTimeout(() => {
        if (words.length > 0) {
          // If no word was chosen, automatically choose the first one
          socket.emit('choose_word', { roomId, wordIndex: 0 });
          setWordChoices(null); // Clear word choices after auto-selection
          setWordChoiceTimer(0);
        }
        clearInterval(countdownInterval);
      }, timeLeft * 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(countdownInterval);
      };
    });

    socket.on('word_selected', () => {
      setWordChoices(null);
      setWordChoiceTimer(0);
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
      socket.off('word_selected');
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
    const isDrawer = currentDrawer === socket.id;
    if (isDrawer && !words) return null;
    if (!isDrawer && !wordChoiceTimer) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className={`${theme.card} p-8 rounded-2xl shadow-xl max-w-lg w-full mx-4 border ${theme.border}`}>
          {currentDrawer === socket.id ? (
            words && (
              <>
                <h2 className={`text-2xl font-bold ${theme.text} mb-6 flex items-center justify-between`}>
                  Choose a word to draw!
                  <div className='relative flex items-center justify-center w-16 h-16'>
                    <div className="absolute w-16 h-16 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    <span className="text-2xl font-bold text-blue-500">{wordChoiceTimer}s</span>
                  </div>
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {words?.map((word, index) => (
                    <button
                      key={index}
                      onClick={() => onChoose(index)}
                      className={`${theme.button} ${theme.buttonText} px-6 py-4 rounded-xl text-lg font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98]`}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </>
            )
          ) : (
            <div className="text-center py-4">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className={`w-24 h-24 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin`}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-blue-500">{wordChoiceTimer}s</span>
                </div>
              </div>
              <h2 className={`text-2xl font-bold ${theme.text} mb-4`}>Waiting for drawer...</h2>
              <p className="text-gray-400 text-lg mb-2">
                {players.find(p => p.id === currentDrawer)?.username} is choosing a word
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const Menu = ({ onCreateRoom, onJoinRoom, theme }) => {
    const [username, setUsername] = useState('');
    const [roomToJoin, setRoomToJoin] = useState('');
    const [showJoinForm, setShowJoinForm] = useState(false);

    const handleCreateSubmit = (e) => {
      e.preventDefault();
      if (username.trim()) {
        onCreateRoom(username.trim());
      }
    };

    const handleJoinSubmit = (e) => {
      e.preventDefault();
      if (username.trim() && roomToJoin.trim()) {
        onJoinRoom(username.trim(), roomToJoin.trim());
      }
    };

    return (
      <div className={`min-h-screen ${theme.bg} ${theme.text} flex items-center justify-center p-4`}>
        <div className={`${theme.card} max-w-md w-full p-8 rounded-2xl shadow-xl border ${theme.border}`}>
          <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
            Skribbid Together
          </h1>
          <p className="text-center text-gray-400 mb-8">Draw, Guess, and Have Fun!</p>

          <div className="space-y-6">
            {!showJoinForm ? (
              <form onSubmit={handleCreateSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Your Name</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your name"
                    className={`w-full ${theme.input} ${theme.text} px-4 py-3 rounded-xl border ${theme.border} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className={`w-full ${theme.button} ${theme.buttonText} py-3 rounded-xl font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98]`}
                >
                  Create New Room
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoinForm(true)}
                  className={`w-full bg-transparent border ${theme.border} ${theme.text} py-3 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-all`}
                >
                  Join Existing Room
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoinSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Your Name</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your name"
                    className={`w-full ${theme.input} ${theme.text} px-4 py-3 rounded-xl border ${theme.border} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Room Code</label>
                  <input
                    type="text"
                    value={roomToJoin}
                    onChange={(e) => setRoomToJoin(e.target.value)}
                    placeholder="Enter room code"
                    className={`w-full ${theme.input} ${theme.text} px-4 py-3 rounded-xl border ${theme.border} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className={`w-full ${theme.button} ${theme.buttonText} py-3 rounded-xl font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98]`}
                >
                  Join Room
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoinForm(false)}
                  className={`w-full bg-transparent border ${theme.border} ${theme.text} py-3 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-all`}
                >
                  Back to Create Room
                </button>
              </form>
            )}
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
    <div className={`min-h-screen ${theme.bg} ${theme.text} p-4`}>
      <WordChoiceOverlay
        words={wordChoices}
        onChoose={(index) => {
          socket.emit('choose_word', { roomId, wordIndex: index });
          setWordChoices(null);
          setWordChoiceTimer(0);
        }}
      />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`${theme.card} rounded-2xl p-6 mb-6 border ${theme.border} flex justify-between items-center`}>
          <div className="flex items-center space-x-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">Skribbid Together</h1>
            <div className={`${theme.accent} ${theme.accentBorder} border px-4 py-2 rounded-xl`}>
              Room: {roomId}
            </div>
            {/* Score Display */}
            <div className={`${theme.accent} ${theme.accentBorder} border px-4 py-2 rounded-xl`}>
              Score: {scores[socket.id] || 0}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-lg ${theme.input} transition-colors`}
            >
              {isDarkMode ? '🌞' : '🌙'}
            </button>
            <button
              onClick={handleExitToMenu}
              className={`${theme.button} ${theme.buttonText} px-4 py-2 rounded-xl`}
            >
              Exit Game
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Game Info Bar */}
            <div className={`${theme.card} p-4 rounded-2xl border ${theme.border}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Timer */}
                  <div className={`${theme.accent} ${theme.accentBorder} border px-4 py-2 rounded-xl font-medium`}>
                    Time: {timeLeft}s
                  </div>
                  
                  {/* Round Counter */}
                  <div className={`${theme.accent} ${theme.accentBorder} border px-4 py-2 rounded-xl font-medium`}>
                    Round {currentRound}/{gameSettings.maxRounds}
                  </div>

                  {/* Word Display */}
                  {!isDrawer ? (
                    <div className={`${theme.input} px-4 py-2 rounded-xl min-w-[200px] text-center`}>
                      {word ? (
                        <div className="flex gap-4">
                          {word.split(' ').map((wordPart, wordIndex) => (
                            <div key={wordIndex} className="flex gap-[2px] items-end">
                              {wordPart.split('').map((letter, letterIndex) => {
                                const adjustedIndex = wordPart.length * wordIndex + letterIndex;
                                const isRevealed = revealedIndices.includes(adjustedIndex);
                                return isRevealed ? (
                                  <div key={letterIndex} className={`w-6 text-center border-b-2 ${theme.border}`}>
                                    {letter}
                                  </div>
                                ) : (
                                  <div key={letterIndex} className="relative w-6">
                                    <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDarkMode ? 'bg-white' : 'bg-gray-900'}`} />
                                  </div>
                                );
                              })}
                              <span className="text-xs text-gray-400 ml-1">{wordPart.length}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">Waiting for word...</span>
                      )}
                    </div>
                  ) : (
                    <div className={`${theme.accent} ${theme.accentBorder} border px-4 py-2 rounded-xl font-medium`}>
                      Word to draw: {word || 'Waiting...'}
                    </div>
                  )}
                </div>

                {/* Current Drawer */}
                {currentDrawer !== socket.id && (
                  <div className={`${theme.accent} ${theme.accentBorder} border px-4 py-2 rounded-xl font-medium`}>
                    {players.find(p => p.id === currentDrawer)?.username}'s turn
                  </div>
                )}
              </div>
            </div>

            {/* Canvas */}
            <div className={`${theme.card} p-6 rounded-2xl border ${theme.border}`}>
              <Canvas
                isDrawer={currentDrawer === socket.id}
                socket={socket}
                roomId={roomId}
                theme={theme}
              />
            </div>

            {/* Chat Input */}
            {currentDrawer !== socket.id && (
              <form onSubmit={handleGuess} className="flex gap-4">
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Type your guess here..."
                  className={`flex-1 ${theme.input} ${theme.text} px-4 py-3 rounded-xl border ${theme.border} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  disabled={!roundActive}
                />
                <button
                  type="submit"
                  className={`${theme.button} ${theme.buttonText} px-6 py-3 rounded-xl font-medium`}
                  disabled={!roundActive}
                >
                  Guess
                </button>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Players */}
            <div className={`${theme.card} p-6 rounded-2xl border ${theme.border}`}>
              <h2 className="text-xl font-bold mb-4">Players</h2>
              <div className="space-y-3">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className={`p-3 rounded-xl ${
                      player.id === currentDrawer
                        ? `${theme.accent} border ${theme.accentBorder}`
                        : theme.input
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        {player.username}
                        {player.id === socket.id && (
                          <span className="ml-1 text-sm text-gray-400">(You)</span>
                        )}
                      </span>
                      <span className="font-bold text-blue-500">{scores[player.id] || 0} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Messages */}
            <div className={`${theme.card} p-6 rounded-2xl border ${theme.border}`}>
              <h2 className="text-xl font-bold mb-4">Chat & Guesses</h2>
              <div
                ref={chatContainerRef}
                className={`h-[calc(100vh-32rem)] overflow-y-auto border ${theme.border} rounded-xl p-4 ${theme.chat} scroll-smooth`}
              >
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`mb-3 p-3 rounded-xl ${
                      message.type === 'system'
                        ? theme.system
                        : theme.input
                    }`}
                  >
                    {message.player && (
                      <span className="font-medium text-blue-500">{message.player}: </span>
                    )}
                    {message.message}
                  </div>
                ))}
                {systemMessage && (
                  <div className={`mb-3 p-3 rounded-xl ${theme.system}`}>
                    {systemMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
