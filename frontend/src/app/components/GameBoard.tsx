import { GameState, TeamColor, TurnRole, BoardTile, PartyState } from '../types/game';
import { useState } from 'react';
import GameInfo from './GameInfo';
import GameOver from './GameOver';
import Image from 'next/image';

interface GameBoardProps {
  gameState: GameState;
  partyState: PartyState;
  team?: TeamColor;
  role?: TurnRole;
  socket: any;
  partyCode: string;
  username: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string;
  };
}

export default function GameBoard({ gameState, partyState, team, role, socket, partyCode, username, user }: GameBoardProps) {
  const [hint, setHint] = useState({ word: '', number: 0 });

  const isCardRevealed = (tile: BoardTile) => {
    // Card is revealed if:
    // 1. It's revealed for everyone
    // 2. It's a bonus reveal for the team (both spymaster and operatives)
    return tile.revealed || 
           (team && gameState.crazyMode?.hiddenInfo[team]?.bonusTile?.word === tile.word);
  };

  const getLuckyCardIcon = (tile: BoardTile) => {
    if (!team || !gameState.crazyMode?.hiddenInfo[team]?.bonusTile) return null;
    if (gameState.crazyMode.hiddenInfo[team].bonusTile.word === tile.word) {
      return (
        <div className="absolute top-1 left-1 text-lg text-green-400 z-10">
          <span className="drop-shadow-lg">🍀</span>
        </div>
      );
    }
    return null;
  };

  const getBonusRevealBadge = (tile: BoardTile) => {
    if (!team || !gameState.crazyMode?.hiddenInfo[team]?.bonusTile) return null;
    if (gameState.crazyMode.hiddenInfo[team].bonusTile.word === tile.word) {
      return (
        <div className="absolute -top-3 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30">
          <span className="text-xs text-green-400">🍀 Lucky Reward</span>
        </div>
      );
    }
    return null;
  };

  const getTileColor = (tile: BoardTile, isSpymaster: boolean) => {
    // Check for bonus reveal for team members
    if (team && gameState.crazyMode?.hiddenInfo[team]?.bonusTile?.word === tile.word) {
      const bonusTile = gameState.crazyMode.hiddenInfo[team].bonusTile;
      switch(bonusTile.team) {
        case 'red': return 'bg-[#D21D37] text-white';
        case 'blue': return 'bg-[#02A8B0] text-white';
        case 'neutral': return 'bg-gray-600 text-white';
        default: return 'bg-gray-600 text-white';
      }
    }

    // Regular tile color logic
    if (isSpymaster) {
      switch(tile.team) {
        case 'red':
          return tile.revealed 
            ? 'bg-[#D21D37]/30 hover:bg-[#D21D37]/30' 
            : 'bg-[#D21D37] hover:bg-[#B01830]';
        case 'blue':
          return tile.revealed 
            ? 'bg-[#02A8B0]/30 hover:bg-[#02A8B0]/30' 
            : 'bg-[#02A8B0] hover:bg-[#028A90]';
        case 'neutral':
          return tile.revealed 
            ? 'bg-gray-600/30 hover:bg-gray-600/30' 
            : 'bg-gray-600 hover:bg-gray-500';
        case 'assassin':
          return tile.revealed 
            ? 'bg-black/30 hover:bg-black/30' 
            : 'bg-black hover:bg-[#0A0A0A]';
      }
    }

    // Operatives only see revealed cards
    if (tile.revealed) {
      switch(tile.team) {
        case 'red':
          return 'bg-[#D21D37] hover:bg-[#D21D37]';
        case 'blue':
          return 'bg-[#02A8B0] hover:bg-[#02A8B0]';
        case 'neutral':
          return 'bg-gray-600 hover:bg-gray-600';
        case 'assassin':
          return 'bg-black hover:bg-black';
      }
    }

    return 'bg-[#1C1F20] hover:bg-[#2A2F30]';
  };

  const handleTileClick = (index: number) => {
    if (role !== 'operative' || 
        gameState.turn.role !== 'operative' || 
        gameState.turn.team !== team ||
        gameState.board.tiles[index].revealed) {
      return;
    }

    // Toggle suspicion for this word
    socket.emit('suspect_word', {
      partyCode,
      userId: user.id,
      username,
      avatar: user.avatarUrl,
      wordIndex: index
    });
  };

  const handleRevealTile = (index: number) => {
    if (role !== 'operative' || 
        gameState.turn.role !== 'operative' || 
        gameState.turn.team !== team ||
        gameState.board.tiles[index].revealed) {
      return;
    }

    socket.on('reveal_result', (data: { bonusReveal?: { index: number, word: string, team: string } }) => {
      if (data.bonusReveal) {
        // Show bonus reveal notification
        alert(`Lucky card found! Bonus reveal: ${data.bonusReveal.word}`);
      }
    });

    socket.emit('reveal_tile', { 
      partyCode, 
      tileIndex: index,
      player: username
    });
  };

  const handleGiveHint = () => {
    if (!hint.word.trim() || hint.number < 1) return;
    console.log('data',username);
    socket.emit('give_hint', {
      partyCode,
      hint: {
        word: hint.word.trim(),
        number: hint.number
      },
      player: username
    });
    
    setHint({ word: '', number: 0 });
  };

  const handlePlayAgain = () => {
    socket.emit('reset_game', { partyCode });
  };

  const getBoardGridCols = () => {
    const size = gameState.board.tiles.length;
    if (size === 25) return 'grid-cols-5';
    if (size === 36) return 'grid-cols-6';
    return 'grid-cols-7';
  };

  const getTeamColors = (team: TeamColor) => ({
    bg: team === 'red' ? 'bg-[#D21D37]/10' : 'bg-[#02A8B0]/10',
    border: team === 'red' ? 'border-[#D21D37]/30' : 'border-[#02A8B0]/30',
    text: team === 'red' ? 'text-[#D21D37]' : 'text-[#02A8B0]',
    hoverBg: team === 'red' ? 'hover:bg-[#D21D37]/20' : 'hover:bg-[#02A8B0]/20',
  });

  return (
    <div className="flex gap-4">
      <div className="flex-1 glass-card p-6 relative">
        {gameState.winner && (
          <GameOver 
            winner={gameState.winner} 
            onPlayAgain={handlePlayAgain}
          />
        )}
        <GameInfo 
          partyState={partyState}
          socket={socket}
          partyCode={partyCode}
        />

        {/* Score Display */}
        <div className="mb-4 flex justify-end gap-4">
          <span className="text-[#D21D37]">Red: {gameState.remainingWords.red}</span>
          <span className="text-[#02A8B0]">Blue: {gameState.remainingWords.blue}</span>
        </div>

        {/* Updated board grid */}
        <div className={`grid ${getBoardGridCols()} gap-3`}>
          {gameState.board.tiles.map((tile, index) => {
            const isSuspectedByMe = gameState.turn.suspectedWords?.some(
              s => s.username === username && s.wordIndex === index
            );
            
            const cardClasses = `
              relative aspect-[3/2] rounded-lg p-2 sm:p-3
              flex flex-col items-center justify-center 
              text-center transition-all duration-200
              ${!isCardRevealed(tile) && gameState.turn.team === team && 
                gameState.turn.role === 'operative' ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'}
              ${role === 'spymaster' ? getTileColor(tile, true) : ''}
              ${isSuspectedByMe ? 'ring-2 ring-yellow-500/50' : ''}
              ${role === 'operative' ? 'card-flip' : ''}
              ${isCardRevealed(tile) && role === 'operative' ? 'card-revealed' : ''}
            `;

            return role === 'spymaster' ? (
              // Static view for spymaster
              <div key={index} className={cardClasses}>
                {getLuckyCardIcon(tile)}
                <span className="font-medium text-sm xs:text-base sm:text-lg text-gray-200">
                  {tile.word}
                </span>
                
                {/* Suspecting Indicators for Spymaster */}
                {gameState.turn.suspectedWords?.some(s => s.wordIndex === index) && !tile.revealed && (
                  <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 flex -space-x-1 sm:-space-x-2 items-center">
                    {gameState.turn.suspectedWords
                      .filter(s => s.wordIndex === index)
                      .map((suspect) => (
                        <div 
                          key={suspect.username}
                          className="relative group"
                        >
                          <Image
                            src={suspect.avatar}
                            alt={suspect.username}
                            width={16}
                            height={16}
                            className="rounded-full ring-2 ring-black sm:w-5 sm:h-5"
                          />
                          <div className="absolute -bottom-6 sm:-bottom-8 left-1/2 -translate-x-1/2 w-max px-2 py-1 
                                       bg-black/80 text-[10px] sm:text-xs text-white rounded 
                                       opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            {suspect.username}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              // Flipping card view for all operatives
              <div key={index} className={cardClasses}>
                <div className="card-inner">
                  <div className="card-front bg-[#1C1F20] hover:bg-[#2A2F30] rounded-lg flex items-center justify-center">
                    <div onClick={() => handleTileClick(index)}>
                      <span className="font-medium text-sm xs:text-base sm:text-lg text-gray-200">
                        {tile.word}
                      </span>
                    </div>

                    {/* Reveal Button and Suspecting Indicators */}
                    {gameState.turn.team === team && 
                     gameState.turn.role === 'operative' && 
                     !tile.revealed && 
                     isSuspectedByMe && (
                      <button
                        onClick={() => handleRevealTile(index)}
                        className="absolute bottom-1 right-1 p-1 bg-white/10 hover:bg-white/20 
                                 rounded text-[10px] xs:text-xs text-white/90 transition-colors"
                      >
                        Reveal
                      </button>
                    )}

                    {/* Suspecting Indicators */}
                    {gameState.turn.suspectedWords?.some(s => s.wordIndex === index) && !tile.revealed && (
                      <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 flex -space-x-1 sm:-space-x-2 items-center">
                        {gameState.turn.suspectedWords
                          .filter(s => s.wordIndex === index)
                          .map((suspect) => (
                            <div 
                              key={suspect.username}
                              className="relative group"
                            >
                              <Image
                                src={suspect.avatar}
                                alt={suspect.username}
                                width={16}
                                height={16}
                                className="rounded-full ring-2 ring-black sm:w-5 sm:h-5"
                              />
                              <div className="absolute -bottom-6 sm:-bottom-8 left-1/2 -translate-x-1/2 w-max px-2 py-1 
                                           bg-black/80 text-[10px] sm:text-xs text-white rounded 
                                           opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                {suspect.username}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className={`card-back rounded-lg flex items-center justify-center ${getTileColor(tile, false)}`}>
                    {getLuckyCardIcon(tile)}
                    <span className="font-medium text-sm xs:text-base sm:text-lg text-gray-200">
                      {tile.word}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {role === 'spymaster' && gameState.turn.role === 'spymaster' && gameState.turn.team === team && (
          <div className="mt-4 flex gap-4">
            <input 
              type="text" 
              value={hint.word}
              onChange={(e) => setHint(prev => ({ ...prev, word: e.target.value }))}
              placeholder="Enter hint word..."
              className={`flex-1 rounded-lg p-2.5 border ${getTeamColors(team).bg} ${getTeamColors(team).border} 
                         ${getTeamColors(team).text} placeholder:text-gray-500 focus:outline-none focus:ring-1 
                         focus:ring-opacity-50 focus:ring-current`}
            />
            <input 
              type="number" 
              value={hint.number || ''}
              onChange={(e) => setHint(prev => ({ ...prev, number: parseInt(e.target.value) || 0 }))}
              min="0" 
              max="9" 
              placeholder="#"
              className={`w-20 rounded-lg p-2.5 border ${getTeamColors(team).bg} ${getTeamColors(team).border} 
                         ${getTeamColors(team).text} placeholder:text-gray-500 focus:outline-none focus:ring-1 
                         focus:ring-opacity-50 focus:ring-current`}
            />
            <button 
              onClick={handleGiveHint}
              disabled={!hint.word.trim() || hint.number < 1}
              className={`px-6 rounded-lg font-medium transition-colors
                         ${getTeamColors(team).bg} ${getTeamColors(team).text} ${getTeamColors(team).border}
                         ${getTeamColors(team).hoverBg} disabled:opacity-50`}
            >
              Give Hint
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
