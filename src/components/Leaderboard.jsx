const Leaderboard = ({ players, onPlayAgain, onExit }) => {
  // Sort players by score in descending order
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Game Over!</h1>
            <p className="text-gray-400">Here's how everyone did</p>
          </div>

          {/* Leaderboard */}
          <div className="mb-8">
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`p-4 rounded ${
                    index === 0
                      ? 'bg-yellow-500/20 border border-yellow-500'
                      : index === 1
                      ? 'bg-gray-400/20 border border-gray-400'
                      : index === 2
                      ? 'bg-orange-700/20 border border-orange-700'
                      : 'bg-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold">#{index + 1}</span>
                      <span className="font-medium">{player.username}</span>
                    </div>
                    <span className="text-xl font-bold">{player.score} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={onPlayAgain}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition-colors"
            >
              Play Again
            </button>
            <button
              onClick={onExit}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded transition-colors"
            >
              Exit to Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
