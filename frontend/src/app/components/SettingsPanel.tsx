import { useState } from 'react';

interface SettingsPanelProps {
  partyCode: string;
  socket: any;
}

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

export default function SettingsPanel({ partyCode, socket }: SettingsPanelProps) {
  const [settings, setSettings] = useState<GameSettings>({
    boardSize: 5,
    maxSpymasters: 1,
    timer: {
      enabled: false,
      spymasterTime: 120,
      operativeTime: 60
    },
    dictionary: {
      type: 'english'
    },
    assassinCards: 1,
    gameMode: 'classic'
  });

  const handleSettingChange = (key: string, value: any) => {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      setSettings(prev => {
        const newSettings = {
          ...prev,
          [parent]: {
            ...prev[parent as keyof GameSettings],
            [child]: value
          }
        };
        socket.emit('party_update', { partyCode, settings: newSettings });
        console.log('Updated settings:', newSettings);
        return newSettings;
      });
    } else {
      setSettings(prev => {
        const newSettings = {
          ...prev,
          [key]: value
        };
        socket.emit('party_update', { partyCode, settings: newSettings });
        console.log('Updated settings:', newSettings);
        return newSettings;
      });
    }
  };

  const inputClasses = "w-full bg-[#151718] text-gray-200 rounded-lg p-2.5 border border-gray-700/50 focus:border-verdigris/50 focus:outline-none transition-colors";
  const labelClasses = "block text-sm font-medium text-gray-400 mb-1.5";

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-verdigris">Game Setup</h2>
        <button 
          onClick={() => socket.emit('start_game', { partyCode })}
          className="px-4 py-2 rounded-lg bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 
                   hover:bg-yellow-500/20 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          Start Game
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M3.288 4.818A1.5 1.5 0 0 0 1 6.095v7.81a1.5 1.5 0 0 0 2.288 1.277l6.323-3.905c.155-.096.285-.213.389-.344v2.973a1.5 1.5 0 0 0 2.288 1.277l6.323-3.905a1.5 1.5 0 0 0 0-2.555L12.288 4.818A1.5 1.5 0 0 0 10 6.095v2.973a1.5 1.5 0 0 0-.389-.344L3.288 4.818Z" />
          </svg>
        </button>
      </div>

      <div className="space-y-6">
        {/* Game Mode & Board Size */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Game Mode</label>
            <select 
              value={settings.gameMode}
              onChange={(e) => handleSettingChange('gameMode', e.target.value)}
              className={inputClasses}
            >
              <option value="classic">Classic</option>
              <option value="crazy">Crazy Mode</option>
            </select>
          </div>
          <div>
            <label className={labelClasses}>Board Size</label>
            <select 
              value={settings.boardSize}
              onChange={(e) => handleSettingChange('boardSize', parseInt(e.target.value))}
              className={inputClasses}
            >
              <option value={5}>5×5 (25 Cards)</option>
              <option value={6}>6×6 (36 Cards)</option>
              <option value={7}>7×7 (49 Cards)</option>
            </select>
          </div>
        </div>

        {/* Timer Toggle & Settings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-400">Timer Settings</label>
            <button
              onClick={() => handleSettingChange('timer.enabled', !settings.timer.enabled)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                settings.timer.enabled
                  ? 'bg-verdigris/10 text-verdigris border border-verdigris/20'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              {settings.timer.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          
          {settings.timer.enabled && (
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label className={labelClasses}>Spymaster (sec)</label>
                <input 
                  type="number"
                  value={settings.timer.spymasterTime}
                  onChange={(e) => handleSettingChange('timer.spymasterTime', parseInt(e.target.value))}
                  className={inputClasses}
                  min={30}
                  max={300}
                  step={30}
                />
              </div>
              <div>
                <label className={labelClasses}>Operative (sec)</label>
                <input 
                  type="number"
                  value={settings.timer.operativeTime}
                  onChange={(e) => handleSettingChange('timer.operativeTime', parseInt(e.target.value))}
                  className={inputClasses}
                  min={30}
                  max={300}
                  step={30}
                />
              </div>
            </div>
          )}
        </div>

        {/* Dictionary Settings */}
        <div>
          <label className={labelClasses}>Dictionary</label>
          <select 
            value={settings.dictionary.type}
            onChange={(e) => handleSettingChange('dictionary.type', e.target.value)}
            className={inputClasses}
          >
            <option value="english">English Words</option>
            <option value="french">French Words</option>
            <option value="custom">Custom Words</option>
          </select>
          
          {settings.dictionary.type === 'custom' && (
            <textarea
              placeholder="Enter words separated by commas..."
              value={settings.dictionary.customWords?.join(', ') || ''}
              onChange={(e) => handleSettingChange('dictionary.customWords', 
                e.target.value.split(',').map(word => word.trim()))}
              className={`${inputClasses} mt-3 h-24 resize-none`}
            />
          )}
        </div>

        {/* Team Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Spymasters per Team</label>
            <select
              value={settings.maxSpymasters}
              onChange={(e) => handleSettingChange('maxSpymasters', parseInt(e.target.value))}
              className={inputClasses}
            >
              <option value={1}>1 Spymaster</option>
              <option value={2}>2 Spymasters</option>
              <option value={3}>3 Spymasters</option>
            </select>
          </div>
          <div>
            <label className={labelClasses}>Assassin Cards</label>
            <select
              value={settings.assassinCards}
              onChange={(e) => handleSettingChange('assassinCards', parseInt(e.target.value))}
              className={inputClasses}
            >
              <option value={1}>1 Card</option>
              <option value={2}>2 Cards</option>
              <option value={3}>3 Cards</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
