export interface GameSettings {
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

export interface TeamMember {
    userId: string;
    username: string;
    avatar: string;
    role: 'spymaster' | 'operative' | 'unassigned';
    ready: boolean;
}

export interface TeamState {
    spymasters: TeamMember[];
    operatives: TeamMember[];
}

export type TeamColor = 'red' | 'blue';
export type TileTeam = TeamColor | 'neutral' | 'assassin';
export type TurnRole = 'spymaster' | 'operative';

// Represents an individual tile in the game board
export interface BoardTile {
    word: string;
    team: TileTeam;
    revealed: boolean;
    // CrazyMode specific
    isLucky?: boolean; // Marks the Lucky Card
    luckyFor?: TeamColor; // Which team found the Lucky Card
    bonusTile?: { word: string; team: TileTeam }; // The extra tile revealed only for them
}

// Represents the game board itself
export interface GameBoard {
    tiles: BoardTile[];
}

// Represents the current turn state
export interface TurnState {
    team: TeamColor;
    role: TurnRole;
    hint?: {
        word: string;
        number: number;
        remainingGuesses: number;
    };
    suspectedWords?: {
        userId: string;
        username: string;
        avatar: string;
        wordIndex: number;
    }[];
}

// Represents the current game state
export interface GameState {
    board: GameBoard; // Changed from fullBoard to board to match backend
    turn: TurnState;
    remainingWords: {
        red: number;
        blue: number;
    };
    winner?: TeamColor;
    //CrazyMode specific
    revealedBoard: {
        red: GameBoard;  // What Red Team sees
        blue: GameBoard; // What Blue Team sees
    };
    hiddenInfo: {
        red: { luckyCard?: string; bonusTile?: { word: string; team: TileTeam } };
        blue: { luckyCard?: string; bonusTile?: { word: string; team: TileTeam } };
    };
    usedAbilities: {
        red: {
            spymasterSwapped?: boolean;
            operativePeekUsed?: boolean;
        };
        blue: {
            spymasterSwapped?: boolean;
            operativePeekUsed?: boolean;
        };
    };
}

export interface PartyState {
    partyCode: string;
    host: string;
    settings: GameSettings;
    teams: {
        red: TeamState;
        blue: TeamState;
    };
    unassignedPlayers: TeamMember[];
    status: 'lobby' | 'in-game';
    gameState?: GameState;
}
