"use client"

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "./context/authContext";
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, login, logout } = useAuth();
  const [partyCode, setPartyCode] = useState("");
  const [username, setUsername] = useState("");
  const router = useRouter();

  const handleCreateParty = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/game/create-party`, {
        method: 'POST',
        credentials: 'include',
      });
      
      const data = await response.json();
      if (data.partyCode) {
        router.push(`/party/${data.partyCode}`);
      }
    } catch (error) {
      console.error('Failed to create party:', error);
    }
  };

  const handleJoinParty = () => {
    if (!partyCode) {
      return;
    }
    router.push(`/party/${partyCode}`);
  };

  const handleUsernameLogin = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username })
      });
      
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-night to-eerie-black p-4">
      <div className="w-full max-w-md">
        <div className="text-center space-y-8">
          {/* Logo Section */}
          <div className="space-y-4">
            <div className="relative w-48 h-48 mx-auto">
              <Image
                src="/logo_without_bg.png"
                alt="Cluevia Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="typing-text text-sm font-normal">
              A word guessing game for clever spies
            </div>
          </div>

          {/* Main Content */}
          <div className="glass-card p-8 space-y-6">
            {user ? (
              <>
                {/* User Profile */}
                <div className="profile-container flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-center gap-4">
                    <div className="avatar-container">
                      <Image
                        src={user.avatarUrl}
                        alt={user.username}
                        width={40}
                        height={40}
                        className="rounded-xl"
                      />
                      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-verdigris rounded-full border-2 border-night"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-base font-medium tracking-wider ${user.isHost ? 'text-yellow-500' : ''}`}>
                        {user.username}
                      </span>
                      {user.isHost && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-5 h-5 text-yellow-500"
                        >
                          <path d="M12 1l3.22 6.966 7.78.533-5.78 5.133 1.76 7.368-6.98-3.912-6.98 3.912 1.76-7.368-5.78-5.133 7.78-.533z"/>
                        </svg>
                      )}
                    </div>
                  </div>
                  <button onClick={logout} className="icon-button">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="18" 
                      height="18" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="transform transition-transform duration-200 hover:rotate-180"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </button>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                  {user && user.authType === 'discord' && (
                    <button
                      onClick={handleCreateParty}
                      className="glow-button-primary w-full"
                    >
                      Create Party
                    </button>
                  )}
                  
                  <div className="relative">
                    <input
                      type="text"
                      value={partyCode}
                      onChange={(e) => setPartyCode(e.target.value.toUpperCase())}
                      placeholder="Enter party code"
                      className="glass-input w-full"
                      maxLength={6}
                    />
                    <button
                      onClick={handleJoinParty}
                      className="glow-button-secondary w-full mt-2"
                    >
                      Join Party
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username to play"
                  className="glass-input w-full"
                />
                <button
                  onClick={handleUsernameLogin}
                  className="glow-button-primary w-full"
                >
                  Play as Guest
                </button>
                <div className="text-center text-sm">- or -</div>
                <button
                  onClick={login}
                  className="glow-button-discord w-full flex items-center justify-center gap-3"
                >
                  <Image
                    src="/discord-logo.svg"
                    alt="Discord"
                    width={24}
                    height={24}
                  />
                  <span>Login with Discord</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
