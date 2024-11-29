const Leaderboard = ({ players, onPlayAgain, onExit }) => {
  // Sort players by score in descending order
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const getPositionStyle = (index) => {
    switch (index) {
      case 0:
        return {
          bgColor: 'bg-yellow-500/10',
          border: 'border-yellow-500/50',
          text: 'text-yellow-300',
          gradient: 'from-yellow-500 to-amber-500'
        };
      case 1:
        return {
          bgColor: 'bg-gray-400/10',
          border: 'border-gray-400/50',
          text: 'text-gray-300',
          gradient: 'from-gray-400 to-gray-500'
        };
      case 2:
        return {
          bgColor: 'bg-orange-700/10',
          border: 'border-orange-700/50',
          text: 'text-orange-300',
          gradient: 'from-orange-700 to-orange-800'
        };
      default:
        return {
          bgColor: 'bg-gray-700/10',
          border: 'border-gray-700/50',
          text: 'text-gray-300',
          gradient: 'from-gray-600 to-gray-700'
        };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-purple-900 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-gray-700">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
              Game Over!
            </h1>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500/10 border border-blue-400/50">
              <span className="text-blue-300 text-lg">Final Standings</span>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="mb-12 space-y-4">
            {sortedPlayers.map((player, index) => {
              const style = getPositionStyle(index);
              return (
                <div
                  key={player.id}
                  className={`p-5 rounded-xl backdrop-blur-sm transition-all transform hover:scale-[1.02] ${style.bgColor} border ${style.border}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${style.gradient} flex items-center justify-center font-bold text-2xl shadow-lg`}>
                        #{index + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-lg">{player.username}</span>
                        <span className={`text-sm ${style.text}`}>
                          {index === 0 ? '👑 Champion' : index === 1 ? '🥈 Runner-up' : index === 2 ? '🥉 Third Place' : 'Participant'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-2xl font-bold ${style.text}`}>{player.score}</span>
                      <span className="text-sm text-gray-400">points</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={onPlayAgain}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            >
              Play Again
            </button>
            <button
              onClick={onExit}
              className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg border border-gray-600"
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
