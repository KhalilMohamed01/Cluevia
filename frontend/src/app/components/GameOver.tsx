import { TeamColor } from '../types/game';

interface GameOverProps {
  winner: TeamColor;
  onPlayAgain: () => void;
}

export default function GameOver({ winner, onPlayAgain }: GameOverProps) {
  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="glass-card p-8 text-center max-w-md">
        <h2 className="text-3xl font-bold mb-6">
          Game Over!
        </h2>
        <p className="text-xl mb-8">
          <span className={`font-bold ${winner === 'red' ? 'text-[#D21D37]' : 'text-[#02A8B0]'}`}>
            {winner.toUpperCase()} Team
          </span>
          {' '}wins!
        </p>
        <button 
          onClick={onPlayAgain}
          className="bg-verdigris/20 hover:bg-verdigris/30 text-verdigris px-8 py-3 rounded-lg font-medium transition-colors"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
