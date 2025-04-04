import { useEffect } from 'react';
import Image from 'next/image';
import { TeamMember, TeamState } from '../types/game';
import { io } from 'socket.io-client';

interface TeamPanelProps {
  team: 'red' | 'blue';
  teamState: TeamState;
  partyCode: string;
  user: any;
  socket: any;
  settings: {
    maxSpymasters: number;
    // ...other settings
  };
  gameStatus: 'lobby' | 'in-game';
}

export default function TeamPanel({ team, teamState, partyCode, user, socket, settings, gameStatus }: TeamPanelProps) {
  const handleJoinTeam = (role: 'spymaster' | 'operative') => {
    socket.emit('join_team', {
      team,
      role,
      partyCode,
      user
    });
  };

  return (
    <div className={`p-6 w-full rounded-xl backdrop-blur-sm ${
      team === 'red' 
        ? 'bg-gradient-to-br from-[#D21D37]/10 to-[#D21D37]/5 border border-[#D21D37]/20' 
        : 'bg-gradient-to-br from-[#02A8B0]/10 to-[#02A8B0]/5 border border-[#02A8B0]/20'
    }`}>
      {/* Team Header */}
      <div className={`flex items-center gap-4 mb-6 pb-3 border-b ${
        team === 'red' ? 'border-[#D21D37]/20' : 'border-[#02A8B0]/20'
      }`}>
        <div className="relative w-10 h-10">
          <Image
            src={`/${team}_team.png`}
            alt={`${team} team`}
            fill
            className="object-contain"
          />
        </div>
        <div>
          <h3 className={`text-xl font-bold ${
            team === 'red' ? 'text-[#D21D37]' : 'text-[#02A8B0]'
          }`}>
            {team.charAt(0).toUpperCase() + team.slice(1)} Team
          </h3>
          <span className="text-sm text-gray-400">
            {teamState.spymasters.length + teamState.operatives.length} Members
          </span>
        </div>
      </div>

      <div className="space-y-8">
        {/* Spymasters Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-gray-400">Spymasters</h4>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                teamState.spymasters.length === settings.maxSpymasters
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-yellow-500/10 text-yellow-500'
              }`}>
                {teamState.spymasters.length}/{settings.maxSpymasters}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 min-h-[40px]">
            {teamState.spymasters.map(member => (
              <div key={member.userId} className="relative group">
                <div className={`w-10 h-10 rounded-xl overflow-hidden ring-2 transition-all duration-200 ${
                  team === 'red' ? 'ring-[#D21D37]' : 'ring-[#02A8B0]'
                } group-hover:scale-110 shadow-lg`}>
                  <Image
                    src={member.avatar}
                    alt={member.username}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Username Tooltip */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-max px-2 py-1 rounded bg-gray-900/90 text-xs
                             opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
                  <span className="text-gray-200">{member.username}</span>
                  {member.isHost && <span className="ml-1 text-yellow-500">👑</span>}
                </div>

                {/* Unassign Button */}
                {member.userId === user.id && gameStatus === 'lobby' && (
                  <button 
                    onClick={() => socket.emit('unassign_player', { partyCode, user })}
                    className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center 
                      transition-all hover:scale-110 cursor-pointer bg-gray-900/90 shadow-lg
                      ${team === 'red' 
                        ? 'border border-[#D21D37] text-[#D21D37] hover:bg-[#D21D37]/20' 
                        : 'border border-[#02A8B0] text-[#02A8B0] hover:bg-[#02A8B0]/20'
                      } active:scale-95`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}

            {/* Join Button */}
            {gameStatus === 'lobby' && teamState.spymasters.length < settings.maxSpymasters && (
              <button 
                onClick={() => handleJoinTeam('spymaster')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105 cursor-pointer
                  shadow-lg backdrop-blur-sm
                  ${team === 'red' 
                    ? 'border-2 border-dashed border-[#D21D37]/50 text-[#D21D37]/50 hover:border-[#D21D37] hover:text-[#D21D37] hover:bg-[#D21D37]/10' 
                    : 'border-2 border-dashed border-[#02A8B0]/50 text-[#02A8B0]/50 hover:border-[#02A8B0] hover:text-[#02A8B0] hover:bg-[#02A8B0]/10'
                  } active:scale-95`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Operatives Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-gray-400">Operatives</h4>
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-500/10 text-gray-400">
                {teamState.operatives.length}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 min-h-[40px]">
            {teamState.operatives.map(member => (
              <div key={member.userId} className="relative group">
                <div className={`w-10 h-10 rounded-xl overflow-hidden ring-1 transition-all duration-200 ${
                  team === 'red' ? 'ring-[#D21D37]/50' : 'ring-[#02A8B0]/50'
                } group-hover:scale-110 shadow-lg`}>
                  <Image
                    src={member.avatar}
                    alt={member.username}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Username Tooltip */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-max px-2 py-1 rounded bg-gray-900/90 text-xs
                             opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
                  <span className="text-gray-200">{member.username}</span>
                </div>

                {/* Unassign Button */}
                {member.userId === user.id && gameStatus === 'lobby' && (
                  <button 
                    onClick={() => socket.emit('unassign_player', { partyCode, user })}
                    className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center 
                      transition-all hover:scale-110 cursor-pointer bg-gray-900/90 shadow-lg
                      ${team === 'red' 
                        ? 'border border-[#D21D37] text-[#D21D37] hover:bg-[#D21D37]/20' 
                        : 'border border-[#02A8B0] text-[#02A8B0] hover:bg-[#02A8B0]/20'
                      } active:scale-95`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}

            {/* Join Button */}
            {gameStatus === 'lobby' && (
              <button 
                onClick={() => handleJoinTeam('operative')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105 cursor-pointer
                  shadow-lg backdrop-blur-sm
                  ${team === 'red' 
                    ? 'border-2 border-dashed border-[#D21D37]/30 text-[#D21D37]/30 hover:border-[#D21D37] hover:text-[#D21D37] hover:bg-[#D21D37]/10' 
                    : 'border-2 border-dashed border-[#02A8B0]/30 text-[#02A8B0]/30 hover:border-[#02A8B0] hover:text-[#02A8B0] hover:bg-[#02A8B0]/10'
                  } active:scale-95`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
