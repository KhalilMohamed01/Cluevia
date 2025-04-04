"use client"

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/authContext';
import Image from 'next/image';
import { io } from 'socket.io-client';
import SettingsPanel from '../../components/SettingsPanel';
import { useRouter } from 'next/navigation';
import TeamPanel from '../../components/TeamPanel';
import GameBoard from '@/app/components/GameBoard';
import { PartyState } from '@/app/types/game';
import LogPanel from '@/app/components/LogPanel';
import AbilitiesPanel from '@/app/components/AbilitiesPanel';

interface GameSettings {
  boardSize: 5 | 6 | 7;
  maxSpymasters: number;
  timer: {
    enabled: boolean;
    spymasterTime: number;
    operativeTime: number;
  };
  dictionary: {
    type: 'english' | 'french' | 'custom';
    customWords?: string[];
  };
  assassinCards: number;
  gameMode: 'classic' | 'crazy';
}

interface TeamMember {
  userId: string;
  username: string;
  avatar: string;
  role: 'spymaster' | 'operative' | 'unassigned';
  ready: boolean;
}

interface PartyState {
  partyCode: string;
  host: string;
  settings: GameSettings;
  teams: {
    red: { spymasters: TeamMember[]; operatives: TeamMember[]; };
    blue: { spymasters: TeamMember[]; operatives: TeamMember[]; };
  };
  unassignedPlayers: TeamMember[]; 
  status: 'lobby' | 'in-game';
}

export default function PartyPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const [partyState, setPartyState] = useState<PartyState | null>(null);
  const router = useRouter();
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
    setSocket(newSocket);

    // Reestablish game state when reconnecting
    newSocket.on('connect', () => {
      newSocket.emit('join_party', {
        partyCode: code,
        user: {
          id: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl
        }
      });
    });

    newSocket.on('join_error', (error) => {
      console.error('Failed to join party:', error.message);
      router.push('/');
    });

    newSocket.on('party_state', (newState: PartyState) => {
      console.log('Party state updated:', newState);
      setPartyState(newState);
    });

    return () => {
      newSocket.off('connect');
      newSocket.disconnect();
    };
  }, [code, user, router]);

  const isHost = user?.id === partyState?.host;
  const allPlayers = partyState ? [
    ...partyState.unassignedPlayers,
    ...partyState.teams.red.spymasters,
    ...partyState.teams.red.operatives,
    ...partyState.teams.blue.spymasters,
    ...partyState.teams.blue.operatives,
  ] : [];

  const GameSettings = () => (
    <div className="glass-card p-6">
      <h3 className="text-xl font-medium text-verdigris mb-6">Game Settings</h3>
      
      {/* Basic Settings */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#151718] rounded-lg p-3">
          <h4 className="text-gray-400 text-xs mb-1">Game Mode</h4>
          <p className="text-verdigris font-medium capitalize">
            {partyState?.settings.gameMode}
          </p>
        </div>
        <div className="bg-[#151718] rounded-lg p-3">
          <h4 className="text-gray-400 text-xs mb-1">Board</h4>
          <p className="text-verdigris font-medium">
            {partyState?.settings.boardSize}×{partyState?.settings.boardSize}
          </p>
        </div>
        <div className="bg-[#151718] rounded-lg p-3">
          <h4 className="text-gray-400 text-xs mb-1">Dictionary</h4>
          <p className="text-verdigris font-medium capitalize">
            {partyState?.settings.dictionary.type}
          </p>
        </div>
        <div className="bg-[#151718] rounded-lg p-3">
          <h4 className="text-gray-400 text-xs mb-1">Assassins</h4>
          <p className="text-verdigris font-medium">
            {partyState?.settings.assassinCards} Card{partyState?.settings.assassinCards > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Timer Settings */}
      {partyState?.settings.timer.enabled && (
        <div className="bg-[#151718] rounded-lg p-3 mb-6">
          <h4 className="text-gray-400 text-xs mb-2">Timer Settings</h4>
          <div className="flex justify-between text-verdigris">
            <div>
              <span className="text-xs text-gray-400">Spymaster</span>
              <p className="font-medium">{partyState.settings.timer.spymasterTime}s</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400">Operative</span>
              <p className="font-medium">{partyState.settings.timer.operativeTime}s</p>
            </div>
          </div>
        </div>
      )}

      {/* Team Settings */}
      <div className="flex gap-3">
        <div className="flex-1 bg-[#D21D37]/10 rounded-lg p-3 border border-[#D21D37]/20">
          <h4 className="text-[#D21D37] text-xs mb-1">Red Team</h4>
          <p className="text-[#D21D37] font-medium">
            Max {partyState?.settings.maxSpymasters} Spymaster{partyState?.settings.maxSpymasters > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex-1 bg-[#02A8B0]/10 rounded-lg p-3 border border-[#02A8B0]/20">
          <h4 className="text-[#02A8B0] text-xs mb-1">Blue Team</h4>
          <p className="text-[#02A8B0] font-medium">
            Max {partyState?.settings.maxSpymasters} Spymaster{partyState?.settings.maxSpymasters > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-400">
          Waiting for host to start the game...
        </p>
      </div>
    </div>
  );

  // Loading state component
  if (!partyState || !user || !socket) {
    return (
      <div className="min-h-screen flex flex-col bg-[#101114]">
        <header className="flex items-center justify-between px-4 sm:px-8 py-4 bg-[#1C1F20] border-b border-verdigris/10">
          <h1 className="text-xl sm:text-2xl font-bold text-verdigris">
            Loading...
          </h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-verdigris">Loading party...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#101114]">
      <header className="flex items-center justify-between px-6 py-4 bg-[#101114]/80 backdrop-blur-sm">
        {/* Left Side - Party Code */}
        <div className="flex items-center gap-6 w-1/3">
          <div className="flex flex-col">
            <span className="text-sm text-gray-400 mb-1">Party Code</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-bold text-verdigris tracking-wider">
                {code}
              </span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(code as string);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md 
                           border border-yellow-500/30 bg-yellow-500/10 
                           text-yellow-500 hover:bg-yellow-500/20 
                           transition-colors text-sm font-medium"
              >
                <span>Copy Invite</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                  <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Center - Logo */}
        <div className="flex justify-center items-center w-1/3">
            <div className="relative w-48 h-12">
            <Image
              src="/logo.png"
              alt="Cluevia Logo"
              fill
              className="object-cover"
              priority
            />
            </div>
        </div>

        {/* Right Side - Game Status */}
        <div className="flex justify-end w-1/3">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#1C1F20]/50">
            <span className={`h-2 w-2 rounded-full ${
              partyState?.status === 'in-game' 
                ? 'bg-green-500 animate-pulse' 
                : 'bg-yellow-500'
            }`} />
            <span className={`text-sm font-medium ${
              partyState?.status === 'in-game' 
                ? 'text-green-500' 
                : 'text-yellow-500'
            }`}>
              {partyState?.status === 'in-game' ? 'Game in Progress' : 'In Lobby'}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1">
        <div className="w-full">
          {partyState.status === 'lobby' ? (
            <div className="p-4 flex justify-center">
              <div className="w-full max-w-7xl">
                <div className="flex flex-col gap-6">
                  {/* Unassigned Players */}
                  <div className="glass-card p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-medium text-verdigris flex items-center gap-2">
                        Lobby
                        <span className="text-sm text-gray-400">({partyState?.unassignedPlayers.length || 0})</span>
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {partyState?.unassignedPlayers.map((member) => (
                        <div 
                          key={member.userId} 
                          className={`relative group flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-105
                            ${member.userId === partyState.host 
                              ? 'bg-yellow-500/10 border border-yellow-500/20' 
                              : 'bg-[#151718] border border-gray-800/50'}`}
                        >
                          <div className="relative">
                            <Image
                              src={member.avatar}
                              alt={member.username}
                              width={32}
                              height={32}
                              className="rounded-lg"
                            />
                            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-verdigris rounded-full border-2 border-night"></div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${
                              member.userId === partyState.host ? 'text-yellow-500' : 'text-gray-200'
                            }`}>
                              {member.username}
                            </span>
                            {member.userId === partyState.host && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-4 h-4 text-yellow-500"
                              >
                                <path d="M12 1l3.22 6.966 7.78.533-5.78 5.133 1.76 7.368-6.98-3.912-6.98 3.912 1.76-7.368-5.78-5.133 7.78-.533z"/>
                              </svg>
                            )}
                          </div>
                          
                          {/* Tooltip for host */}
                          {member.userId === partyState.host && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 rounded text-xs text-yellow-500
                                          opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Party Host
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Main Content Grid */}
                  <div className="grid grid-cols-[1fr_2fr_1fr] gap-6">
                    {/* Left Team */}
                    <TeamPanel 
                      team="red" 
                      teamState={partyState.teams.red}
                      partyCode={partyState.partyCode}
                      user={user}
                      socket={socket}
                      settings={partyState.settings}
                      gameStatus={partyState.status}
                    />

                    {/* Center - Settings or Info */}
                    <div>
                      {isHost ? (
                        <SettingsPanel 
                          partyCode={partyState.partyCode}
                          socket={socket}
                        />
                      ) : (
                        <GameSettings />
                      )}
                    </div>

                    {/* Right Team */}
                    <TeamPanel 
                      team="blue" 
                      teamState={partyState.teams.blue}
                      partyCode={partyState.partyCode}
                      user={user}
                      socket={socket}
                      settings={partyState.settings}
                      gameStatus={partyState.status}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Mobile Layout (stacked) */}
              <div className="lg:hidden flex flex-col gap-4 p-4">
                {/* Game Board */}
                <div className="w-full">
                  {partyState?.gameState && (
                    <GameBoard 
                      gameState={partyState.gameState}
                      partyState={partyState}
                      team={getUserTeam(partyState, user?.id)}
                      role={getUserRole(partyState, user?.id)}
                      socket={socket}
                      partyCode={code as string}
                      username={user?.username}
                      user={user}
                    />
                  )}
                </div>

                {/* Game Log */}
                <div className="w-full h-[200px]">
                  <LogPanel 
                    logs={partyState.gameState?.logs || []} 
                    currentTeam={getUserTeam(partyState, user?.id)} // Add this prop
                  />
                </div>

                {/* Team Panels */}
                <div className="flex flex-col gap-4">
                  <div className="glass-card border-2 border-[#D21D37]/20">
                    <TeamPanel 
                      team="red" 
                      teamState={partyState.teams.red}
                      partyCode={partyState.partyCode}
                      user={user}
                      socket={socket}
                      settings={partyState.settings}
                      gameStatus={partyState.status}
                    />
                  </div>
                  <div className="glass-card border-2 border-[#02A8B0]/20">
                    <TeamPanel 
                      team="blue" 
                      teamState={partyState.teams.blue}
                      partyCode={partyState.partyCode}
                      user={user}
                      socket={socket}
                      settings={partyState.settings}
                      gameStatus={partyState.status}
                    />
                  </div>
                </div>

                {/* Game Info */}
                <div className="glass-card p-4 space-y-4 text-sm flex-1">
                  <h3 className={`text-lg font-bold ${
                    partyState?.gameState?.turn.team === 'red' ? 'text-[#D21D37]' : 'text-[#02A8B0]'
                  } mb-4`}>
                    Game Info
                  </h3>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#151718] rounded-lg p-3">
                      <h4 className="text-gray-400 text-xs mb-1">Game Mode</h4>
                      <p className="text-verdigris font-medium capitalize">
                        {partyState?.settings.gameMode}
                      </p>
                    </div>
                    <div className="bg-[#151718] rounded-lg p-3">
                      <h4 className="text-gray-400 text-xs mb-1">Board</h4>
                      <p className="text-verdigris font-medium">
                        {partyState?.settings.boardSize}×{partyState?.settings.boardSize}
                      </p>
                    </div>
                    <div className="bg-[#151718] rounded-lg p-3">
                      <h4 className="text-gray-400 text-xs mb-1">Dictionary</h4>
                      <p className="text-verdigris font-medium capitalize">
                        {partyState?.settings.dictionary.type}
                      </p>
                    </div>
                    <div className="bg-[#151718] rounded-lg p-3">
                      <h4 className="text-gray-400 text-xs mb-1">Assassins</h4>
                      <p className="text-verdigris font-medium">
                        {partyState?.settings.assassinCards} Card{partyState?.settings.assassinCards > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Timer Settings */}
                  {partyState?.settings.timer.enabled && (
                    <div className="bg-[#151718] rounded-lg p-3 mt-2">
                      <h4 className="text-gray-400 text-xs mb-2">Timer Settings</h4>
                      <div className="flex justify-between text-verdigris">
                        <div>
                          <span className="text-xs text-gray-400">Spymaster</span>
                          <p className="font-medium">{partyState.settings.timer.spymasterTime}s</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-400">Operative</span>
                          <p className="font-medium">{partyState.settings.timer.operativeTime}s</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Team Stats */}
                  <div className="flex gap-3 mt-2">
                    <div className="flex-1 bg-[#D21D37]/10 rounded-lg p-3 border border-[#D21D37]/20">
                      <h4 className="text-[#D21D37] text-xs mb-1">Red Team</h4>
                      <p className="text-[#D21D37] font-medium">
                        {partyState.teams.red.spymasters.length} SM, {partyState.teams.red.operatives.length} OP
                      </p>
                    </div>
                    <div className="flex-1 bg-[#02A8B0]/10 rounded-lg p-3 border border-[#02A8B0]/20">
                      <h4 className="text-[#02A8B0] text-xs mb-1">Blue Team</h4>
                      <p className="text-[#02A8B0] font-medium">
                        {partyState.teams.blue.spymasters.length} SM, {partyState.teams.blue.operatives.length} OP
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Layout (remains the same) */}
              <div className="hidden lg:flex items-start justify-center min-h-[calc(100vh-64px)] gap-6 p-4">
                {/* Left Column - Red Team & Settings */}
                <div className="w-[360px] flex flex-col gap-4">
                  <div className="glass-card border-2 border-[#D21D37]/20">
                    <TeamPanel 
                      team="red" 
                      teamState={partyState.teams.red}
                      partyCode={partyState.partyCode}
                      user={user}
                      socket={socket}
                      settings={partyState.settings}
                      gameStatus={partyState.status}
                    />
                  </div>
                  
                  {/* Add AbilitiesPanel here if game mode is crazy */}
                  {partyState.settings.gameMode === 'crazy' && partyState?.gameState && (
                    <AbilitiesPanel
                      gameState={partyState.gameState}
                      team={getUserTeam(partyState, user?.id)}
                      role={getUserRole(partyState, user?.id)}
                      socket={socket}
                      partyCode={code}
                    />
                  )}

                  <div className="glass-card p-4 space-y-4 text-sm flex-1">
                    <h3 className={`text-lg font-bold ${
                      partyState?.gameState?.turn.team === 'red' ? 'text-[#D21D37]' : 'text-[#02A8B0]'
                    } mb-4`}>
                      Game Info
                    </h3>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#151718] rounded-lg p-3">
                        <h4 className="text-gray-400 text-xs mb-1">Game Mode</h4>
                        <p className="text-verdigris font-medium capitalize">
                          {partyState?.settings.gameMode}
                        </p>
                      </div>
                      <div className="bg-[#151718] rounded-lg p-3">
                        <h4 className="text-gray-400 text-xs mb-1">Board</h4>
                        <p className="text-verdigris font-medium">
                          {partyState?.settings.boardSize}×{partyState?.settings.boardSize}
                        </p>
                      </div>
                      <div className="bg-[#151718] rounded-lg p-3">
                        <h4 className="text-gray-400 text-xs mb-1">Dictionary</h4>
                        <p className="text-verdigris font-medium capitalize">
                          {partyState?.settings.dictionary.type}
                        </p>
                      </div>
                      <div className="bg-[#151718] rounded-lg p-3">
                        <h4 className="text-gray-400 text-xs mb-1">Assassins</h4>
                        <p className="text-verdigris font-medium">
                          {partyState?.settings.assassinCards} Card{partyState?.settings.assassinCards > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Timer Settings */}
                    {partyState?.settings.timer.enabled && (
                      <div className="bg-[#151718] rounded-lg p-3 mt-2">
                        <h4 className="text-gray-400 text-xs mb-2">Timer Settings</h4>
                        <div className="flex justify-between text-verdigris">
                          <div>
                            <span className="text-xs text-gray-400">Spymaster</span>
                            <p className="font-medium">{partyState.settings.timer.spymasterTime}s</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gray-400">Operative</span>
                            <p className="font-medium">{partyState.settings.timer.operativeTime}s</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Team Stats */}
                    <div className="flex gap-3 mt-2">
                      <div className="flex-1 bg-[#D21D37]/10 rounded-lg p-3 border border-[#D21D37]/20">
                        <h4 className="text-[#D21D37] text-xs mb-1">Red Team</h4>
                        <p className="text-[#D21D37] font-medium">
                          {partyState.teams.red.spymasters.length} SM, {partyState.teams.red.operatives.length} OP
                        </p>
                      </div>
                      <div className="flex-1 bg-[#02A8B0]/10 rounded-lg p-3 border border-[#02A8B0]/20">
                        <h4 className="text-[#02A8B0] text-xs mb-1">Blue Team</h4>
                        <p className="text-[#02A8B0] font-medium">
                          {partyState.teams.blue.spymasters.length} SM, {partyState.teams.blue.operatives.length} OP
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Center Column - Game Board */}
                <div className="w-[900px]">
                  {partyState?.gameState && (
                    <GameBoard 
                      gameState={partyState.gameState}
                      partyState={partyState}
                      team={getUserTeam(partyState, user?.id)}
                      role={getUserRole(partyState, user?.id)}
                      socket={socket}
                      partyCode={code as string}
                      username={user?.username}
                      user={user}
                    />
                  )}
                </div>

                {/* Right Column - Blue Team & Log */}
                <div className="w-[360px] flex flex-col gap-4">
                  <div className="glass-card border-2 border-[#02A8B0]/20">
                    <TeamPanel 
                      team="blue" 
                      teamState={partyState.teams.blue}
                      partyCode={partyState.partyCode}
                      user={user}
                      socket={socket}
                      settings={partyState.settings}
                      gameStatus={partyState.status}
                    />
                  </div>
                  <div className="glass-card flex-1 h-[calc(100vh-400px)]">
                    <LogPanel 
                      logs={partyState.gameState?.logs || []} 
                      currentTeam={getUserTeam(partyState, user?.id)} // Add this prop
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions to determine user's team and role
function getUserTeam(partyState: PartyState, userId?: string): 'red' | 'blue' | undefined {
  if (!userId) return undefined;
  if (partyState.teams.red.spymasters.some(p => p.userId === userId) ||
      partyState.teams.red.operatives.some(p => p.userId === userId)) {
    return 'red';
  }
  if (partyState.teams.blue.spymasters.some(p => p.userId === userId) ||
      partyState.teams.blue.operatives.some(p => p.userId === userId)) {
    return 'blue';
  }
  return undefined;
}

function getUserRole(partyState: PartyState, userId?: string): 'spymaster' | 'operative' | undefined {
  if (!userId) return undefined;
  if (partyState.teams.red.spymasters.some(p => p.userId === userId) ||
      partyState.teams.blue.spymasters.some(p => p.userId === userId)) {
    return 'spymaster';
  }
  if (partyState.teams.red.operatives.some(p => p.userId === userId) ||
      partyState.teams.blue.operatives.some(p => p.userId === userId)) {
    return 'operative';
  }
  return undefined;
}
