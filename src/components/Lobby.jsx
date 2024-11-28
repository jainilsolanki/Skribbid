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
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Game Lobby</h1>
            <div className="bg-blue-600/20 border border-blue-500 px-4 py-2 rounded-lg inline-flex items-baseline gap-2 mb-6">
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

          {/* Game Settings */}
          {isHost && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Game Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Round Time</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[60, 120, 180].map((time) => (
                      <button
                        key={time}
                        onClick={() => setSettings(prev => ({ ...prev, roundTime: time }))}
                        className={`p-2 rounded ${
                          settings.roundTime === time
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        {time / 60} {time === 60 ? 'minute' : 'minutes'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Number of Rounds</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[5, 7, 9].map((rounds) => (
                      <button
                        key={rounds}
                        onClick={() => setSettings(prev => ({ ...prev, maxRounds: rounds }))}
                        className={`p-2 rounded ${
                          settings.maxRounds === rounds
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        {rounds} rounds
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Players List */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Players ({players.length})</h2>
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`p-3 rounded bg-gray-700 flex justify-between items-center ${
                    player.isHost ? 'border border-yellow-500' : ''
                  }`}
                >
                  <span>{player.username}</span>
                  {player.isHost && (
                    <span className="text-yellow-500 text-sm">Host</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Start Game Button */}
          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={players.length < 2}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {players.length < 2 ? 'Waiting for more players...' : 'Start Game'}
            </button>
          )}
          {!isHost && (
            <div className="text-center text-gray-400">
              Waiting for host to start the game...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lobby;
