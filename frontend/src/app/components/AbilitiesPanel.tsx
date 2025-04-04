import { TeamColor, TurnRole, GameState, BoardTile } from '../types/game';
import { useState, useEffect } from 'react';

interface AbilitiesPanelProps {
  gameState: GameState;
  team?: TeamColor;
  role?: TurnRole;
  socket: any;
  partyCode: string;
}

export default function AbilitiesPanel({ gameState, team, role, socket, partyCode }: AbilitiesPanelProps) {
  const [swapWords, setSwapWords] = useState({ teamWord: '', neutralWord: '' });
  const [selectedRow, setSelectedRow] = useState<number>(-1);

  // Modified to only check when tiles are revealed, not on every board change
  useEffect(() => {
    const tiles = gameState.board.tiles;
    const teamWordRevealed = swapWords.teamWord && tiles[parseInt(swapWords.teamWord)]?.revealed;
    const neutralWordRevealed = swapWords.neutralWord && tiles[parseInt(swapWords.neutralWord)]?.revealed;

    if (teamWordRevealed || neutralWordRevealed) {
      setSwapWords(prev => ({
        teamWord: teamWordRevealed ? '' : prev.teamWord,
        neutralWord: neutralWordRevealed ? '' : prev.neutralWord
      }));
    }
  }, [gameState.board.tiles.map(t => t.revealed).join(',')]); // Only depend on revealed status changes

  // Handle party state updates
  useEffect(() => {
    const handlePartyStateChange = () => {
      // Only reset if the ability was used (check usedAbilities)
      if (team && gameState.crazyMode?.usedAbilities[team].spymasterSwapped) {
        setSwapWords({ teamWord: '', neutralWord: '' });
      }
    };

    socket.on('party_state', handlePartyStateChange);
    return () => {
      socket.off('party_state', handlePartyStateChange);
    };
  }, [socket, team, gameState.crazyMode?.usedAbilities]);

  if (!team || !role || gameState.winner) return null;

  const abilities = gameState.crazyMode?.usedAbilities[team];
  const peekResult = abilities?.peekResult;

  const isCurrentTurn = gameState.turn.team === team && gameState.turn.role === role;

  const getTeamColors = () => ({
    bg: team === 'red' ? 'bg-[#D21D37]/10' : 'bg-[#02A8B0]/10',
    border: team === 'red' ? 'border-[#D21D37]/20' : 'border-[#02A8B0]/20',
    text: team === 'red' ? 'text-[#D21D37]' : 'text-[#02A8B0]',
    hoverBg: team === 'red' ? 'hover:bg-[#D21D37]/20' : 'hover:bg-[#02A8B0]/20',
  });

  const getFilteredWords = () => {
    const tiles = gameState.board.tiles;
    return {
      teamWords: tiles
        .map((t, i) => ({ word: t.word, index: i, team: t.team }))
        .filter(t => !tiles[t.index].revealed && t.team === team),
      neutralWords: tiles
        .map((t, i) => ({ word: t.word, index: i, team: t.team }))
        .filter(t => !tiles[t.index].revealed && t.team === 'neutral')
    };
  };

  const getBoardRows = () => {
    const size = Math.sqrt(gameState.board.tiles.length);
    const rows = [];
    for (let i = 0; i < size; i++) {
      rows.push(i);
    }
    return rows;
  };

  const handleSwap = () => {
    if (!swapWords.teamWord || !swapWords.neutralWord) return;
    
    socket.emit('use_spymaster_ability', { 
      partyCode, 
      team,
      swap: {
        teamWordIndex: parseInt(swapWords.teamWord),
        neutralWordIndex: parseInt(swapWords.neutralWord)
      }
    });
    setSwapWords({ teamWord: '', neutralWord: '' });
  };

  const handlePeek = () => {
    if (selectedRow === -1) return;
    socket.emit('use_operative_ability', { 
      partyCode, 
      team,
      row: selectedRow
    });
    setSelectedRow(-1);
  };

  const { teamWords, neutralWords } = getFilteredWords();
  const colors = getTeamColors();

  return (
    <div className={`glass-card p-4 border-2 ${colors.border}`}>
      <h3 className={`text-sm font-medium mb-3 ${colors.text}`}>Special Abilities</h3>
      
      <div className="space-y-3">
        {role === 'spymaster' && (
          <div className="space-y-2">
            <div className="text-sm text-gray-400">Swap Words</div>
            {!abilities?.spymasterSwapped ? (
              <>
                <select
                  value={swapWords.teamWord}
                  onChange={(e) => setSwapWords(prev => ({ ...prev, teamWord: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg text-sm bg-gray-800/50 border ${colors.border} ${colors.text}`}
                  disabled={!isCurrentTurn}
                >
                  <option value="">Select team word</option>
                  {teamWords.map(({ word, index }) => (
                    <option key={index} value={index}>{word}</option>
                  ))}
                </select>
                
                <select
                  value={swapWords.neutralWord}
                  onChange={(e) => setSwapWords(prev => ({ ...prev, neutralWord: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-gray-800/50 border border-gray-700/50 text-gray-300"
                  disabled={!isCurrentTurn}
                >
                  <option value="">Select neutral word</option>
                  {neutralWords.map(({ word, index }) => (
                    <option key={index} value={index}>{word}</option>
                  ))}
                </select>

                <button
                  onClick={handleSwap}
                  disabled={!swapWords.teamWord || !swapWords.neutralWord || !isCurrentTurn}
                  className={`w-full px-4 py-2 rounded-lg text-sm transition-colors
                    ${!swapWords.teamWord || !swapWords.neutralWord
                      ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                      : `${colors.bg} ${colors.text} ${colors.hoverBg}`}
                  `}
                >
                  Swap Words
                </button>
              </>
            ) : (
              <div className="text-gray-500 text-sm">Ability already used</div>
            )}
          </div>
        )}

        {role === 'operative' && (
          <div className="space-y-2">
            <div className="text-sm text-gray-400">Peek at Row</div>
            {!abilities?.operativePeekUsed ? (
              <>
                <select
                  value={selectedRow}
                  onChange={(e) => setSelectedRow(parseInt(e.target.value))}
                  className={`w-full px-3 py-2 rounded-lg text-sm bg-gray-800/50 border ${colors.border} ${colors.text}`}
                  disabled={!isCurrentTurn}
                >
                  <option value={-1}>Select a row</option>
                  {getBoardRows().map((row) => (
                    <option key={row} value={row}>Row {row + 1}</option>
                  ))}
                </select>

                <button
                  onClick={handlePeek}
                  disabled={selectedRow === -1 || !isCurrentTurn}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm transition-colors
                    ${selectedRow === -1
                      ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                      : `${colors.bg} ${colors.text} ${colors.hoverBg}`}
                  `}
                >
                  <div className="flex justify-between items-center">
                    <span>Peek at Row {selectedRow + 1}</span>
                    <span className="text-xs opacity-75">(Once per game)</span>
                  </div>
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <div className="text-gray-500 text-sm">Ability already used</div>
                {peekResult && (
                  <div className={`mt-2 p-3 rounded-lg ${
                    peekResult.hasTeamWord ? `${colors.bg} ${colors.text}` : 'bg-gray-800/50 text-gray-400'
                  }`}>
                    <div className="text-sm">
                      Row {peekResult.row + 1}:
                      {peekResult.hasTeamWord 
                        ? ' Contains unrevealed team word!'
                        : ' No unrevealed team words.'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
