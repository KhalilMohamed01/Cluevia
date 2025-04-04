import { TeamColor, PartyState } from '../types/game';

interface GameInfoProps {
  partyState: PartyState;
  socket: any;
  partyCode: string;
}

export default function GameInfo({ partyState, socket, partyCode }: GameInfoProps) {
  const gameState = partyState.gameState!;
  const timerEnabled = partyState.settings.timer.enabled;

  const getTimerColor = () => {
    const timeLeft = gameState.timer?.timeLeft || 0;
    if (timeLeft <= 10) return 'text-[#D21D37]';
    if (timeLeft <= 30) return 'text-yellow-500';
    return 'text-verdigris';
  };

  const getTeamColor = (team: TeamColor) => {
    return team === 'red' ? 'text-[#D21D37]' : 'text-[#02A8B0]';
  };

  return (
    <div className="glass-card p-4 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        {/* Current Turn */}
        <div>
          <span className="text-gray-400 text-sm">Current Turn:</span>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${getTeamColor(gameState.turn.team)}`}>
              {gameState.turn.team.toUpperCase()}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-verdigris font-medium">
              {gameState.turn.role === 'spymaster' ? 'Spymaster' : 'Operatives'}
            </span>
          </div>
        </div>

        {/* Current Hint */}
        {gameState.turn.hint && (
          <div>
            <span className="text-gray-400 text-sm">Hint:</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-verdigris">
                {gameState.turn.hint.word}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-verdigris font-medium">
                {gameState.turn.hint.remainingGuesses} guesses left
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Timer */}
      {timerEnabled && gameState.timer && (
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Time Left:</span>
          <span className={`text-lg font-bold ${getTimerColor()}`}>
            {Math.floor(gameState.timer.timeLeft / 60)}:{String(gameState.timer.timeLeft % 60).padStart(2, '0')}
          </span>
        </div>
      )}
    </div>
  );
}
