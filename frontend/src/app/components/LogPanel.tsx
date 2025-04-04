interface LogEntry {
  type: 'hint' | 'guess' | 'ability';  // Added 'ability' type
  player: string;
  team: 'red' | 'blue';
  word?: string;
  number?: number;
  success?: boolean;
  actualTeam?: 'red' | 'blue' | 'neutral' | 'assassin';
  action?: 'swap' | 'peek';  // Added for ability logs
  diceRoll?: {
    dice1: number;
    dice2: number;
  };
  luckyCard?: {
    index: number;
    word: string;
    team: string;
    bonusReveal?: {
      word: string;
    };
  };
}

interface LogPanelProps {
  logs: LogEntry[];
  currentTeam?: TeamColor; // Add this prop
}

export default function LogPanel({ logs = [], currentTeam }: LogPanelProps) {
  const getTeamColor = (team: 'red' | 'blue') => {
    return {
      text: team === 'red' ? 'text-[#D21D37]' : 'text-[#02A8B0]',
      bg: team === 'red' ? 'bg-[#D21D37]/10' : 'bg-[#02A8B0]/10'
    };
  };

  const getRevealedWordColor = (success: boolean, team: 'red' | 'blue', actualTeam?: string) => {
    if (actualTeam === 'neutral') return { text: 'text-gray-400', bg: 'bg-gray-400/10' };
    if (actualTeam === 'assassin') return { text: 'text-white', bg: 'bg-black' };
    
    return success 
      ? team === 'red' 
        ? { text: 'text-[#D21D37]', bg: 'bg-[#D21D37]/10' }
        : { text: 'text-[#02A8B0]', bg: 'bg-[#02A8B0]/10' }
      : team === 'red'
        ? { text: 'text-[#02A8B0]', bg: 'bg-[#02A8B0]/10' }
        : { text: 'text-[#D21D37]', bg: 'bg-[#D21D37]/10' };
  };

  return (
    <div className="glass-card p-4 h-full overflow-y-auto">
      <h3 className="text-lg font-bold text-verdigris mb-4">Game Log</h3>
      <div className="space-y-2">
        {logs.map((log, index) => (
          <div key={index} className="text-sm">
            {log.type === 'ability' ? (
              <p>
                <span className={`font-bold ${getTeamColor(log.team).text}`}>{log.player}</span>
                <span className="text-gray-400"> used </span>
                <span className={`font-bold ${getTeamColor(log.team).text} ${getTeamColor(log.team).bg} px-1.5 py-0.5 rounded`}>
                  {log.action === 'swap' ? 'Word Swap' : 'Row Peek'}
                </span>
              </p>
            ) : log.type === 'hint' ? (
              <p>
                <span className={`font-bold ${getTeamColor(log.team).text}`}>{log.player}</span>
                <span className="text-gray-400"> gave the hint </span>
                <span className={`font-bold ${getTeamColor(log.team).text} ${getTeamColor(log.team).bg} px-1.5 py-0.5 rounded`}>
                  {log.word}
                </span>
                <span className="text-gray-400"> for </span>
                <span className={`font-bold ${getTeamColor(log.team).text} ${getTeamColor(log.team).bg} px-1.5 py-0.5 rounded`}>
                  {log.number}
                </span>
                <span className="text-gray-400"> words</span>
              </p>
            ) : log.type === 'guess' ? (
              <div className="space-y-1">
                <p>
                  <span className={`font-bold ${getTeamColor(log.team).text}`}>{log.player}</span>
                  <span className="text-gray-400"> revealed </span>
                  <span className={`font-bold ${getRevealedWordColor(log.success || false, log.team, log.actualTeam).text} 
                    ${getRevealedWordColor(log.success || false, log.team, log.actualTeam).bg} px-1.5 py-0.5 rounded`}>
                    {log.word}
                  </span>
                  {log.diceRoll && (
                    <>
                      <span className="text-gray-400 mx-1">→</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                        log.diceRoll.dice1 === log.diceRoll.dice2 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}>
                        <span className="font-mono">🎲 {log.diceRoll.dice1} • {log.diceRoll.dice2}</span>
                        {log.diceRoll.dice1 === log.diceRoll.dice2 && (
                          <span className="text-xs ml-1">Doubles!</span>
                        )}
                      </span>
                    </>
                  )}
                </p>
                {log.luckyCard && (
                  <p className="text-green-400 text-xs ml-4">
                    🍀 Found Lucky Card! 
                    {currentTeam === log.team && log.luckyCard.bonusReveal && (
                      <span> Revealed bonus word: {log.luckyCard.bonusReveal.word}</span>
                    )}
                  </p>
                )}
              </div>
            ) : (
              <p>
                <span className={`font-bold ${getTeamColor(log.team).text}`}>{log.player}</span>
                <span className="text-gray-400"> guessed </span>
                {log.actualTeam === 'assassin' ? (
                  <span className="font-bold text-white bg-black px-1.5 py-0.5 rounded">
                    {log.word}
                  </span>
                ) : (
                  <span className={`font-bold ${getRevealedWordColor(log.success || false, log.team, log.actualTeam).text} 
                    ${getRevealedWordColor(log.success || false, log.team, log.actualTeam).bg} px-1.5 py-0.5 rounded`}>
                    {log.word}
                  </span>
                )}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
