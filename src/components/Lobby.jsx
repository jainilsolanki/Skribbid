import { useState } from 'react';

const Lobby = ({ socket, username, roomId, players, onStartGame }) => {
  const [settings, setSettings] = useState({
    roundTime: 60,
    maxRounds: 5
  });

  const isHost = players.find(p => p.id === socket.id)?.isHost;

  const handleStartGame = () => {
    onStartGame(settings);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-purple-900 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Main Container */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-gray-700">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
              Game Lobby
            </h1>
            <div className="inline-flex items-center gap-4 bg-blue-600/10 border border-blue-500/50 px-6 py-3 rounded-xl">
              <span className="text-blue-300">Room Code:</span>
              <span className="font-mono font-bold text-xl text-blue-200">{roomId}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(roomId)}
                className="ml-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50 rounded-lg text-blue-300 transition-all hover:scale-105 active:scale-95"
                title="Copy Room ID"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Game Settings */}
            {isHost && (
              <div className="space-y-8">
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
                    Game Settings
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-blue-300 mb-3 text-lg">Round Time</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[60, 120, 180].map((time) => (
                          <button
                            key={time}
                            onClick={() => setSettings(prev => ({ ...prev, roundTime: time }))}
                            className={`p-3 rounded-xl transition-all transform hover:scale-105 active:scale-95 ${
                              settings.roundTime === time
                                ? 'bg-blue-600/30 border-2 border-blue-500/50 text-blue-300'
                                : 'bg-gray-700/50 border border-gray-600 hover:bg-gray-700 text-gray-300'
                            }`}
                          >
                            {time / 60} {time === 60 ? 'minute' : 'minutes'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-blue-300 mb-3 text-lg">Number of Rounds</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[5, 7, 9].map((rounds) => (
                          <button
                            key={rounds}
                            onClick={() => setSettings(prev => ({ ...prev, maxRounds: rounds }))}
                            className={`p-3 rounded-xl transition-all transform hover:scale-105 active:scale-95 ${
                              settings.maxRounds === rounds
                                ? 'bg-blue-600/30 border-2 border-blue-500/50 text-blue-300'
                                : 'bg-gray-700/50 border border-gray-600 hover:bg-gray-700 text-gray-300'
                            }`}
                          >
                            {rounds} rounds
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Right Column: Players List */}
            <div className={`space-y-6 ${!isHost ? 'lg:col-span-2' : ''}`}>
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
                  Players ({players.length})
                </h2>
                <div className="space-y-3">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className={`p-4 rounded-xl backdrop-blur-sm transition-all ${
                        player.isHost 
                          ? 'bg-yellow-500/10 border border-yellow-500/50' 
                          : 'bg-gray-700/50 border border-gray-600 hover:bg-gray-700/70'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                            {player.username[0].toUpperCase()}
                          </div>
                          <span className="font-medium">{player.username}</span>
                        </div>
                        {player.isHost && (
                          <span className="px-3 py-1 rounded-full text-yellow-300 text-sm bg-yellow-500/10 border border-yellow-500/50">
                            Host
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Start Game Button or Waiting Message */}
              {isHost ? (
                <button
                  onClick={handleStartGame}
                  disabled={players.length < 2}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                >
                  {players.length < 2 ? 'Waiting for more players...' : 'Start Game'}
                </button>
              ) : (
                <div className="text-center">
                  <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-blue-500/10 border border-blue-400/50 text-blue-300">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Waiting for host to start the game...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
