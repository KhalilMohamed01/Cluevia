const prisma = require("../db");
const { PARTY_CODE_LENGTH } = require("../config");
const englishWords = require("../data/english.json");
const frenchWords = require("../data/french.json");

const DEFAULT_SETTINGS = {
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
};

class PartyService {
  constructor() {
    this.partyStates = new Map(); // Stores PartyState objects
  }

  generatePartyCode(length = PARTY_CODE_LENGTH) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  async createParty(hostUser) {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: parseInt(hostUser.id)
        }
      });

      if (!user) {
        throw new Error("Host user not found");
      }

      const partyCode = this.generatePartyCode();
      const party = await prisma.party.create({
        data: {
          hostId: user.id,
          joinCode: partyCode
        }
      });

      const initialState = {
        partyCode,
        host: hostUser.id,
        settings: DEFAULT_SETTINGS,
        teams: {
          red: { spymasters: [], operatives: [] },
          blue: { spymasters: [], operatives: [] }
        },
        unassignedPlayers: [{
          userId: hostUser.id,
          username: hostUser.username,
          avatar: hostUser.avatarUrl,
          role: 'unassigned',
          ready: false
        }],
        status: 'lobby'
      };

      this.partyStates.set(partyCode, initialState);
      return { partyCode, hostId: hostUser.id };
    } catch (error) {
      console.error("Failed to create party:", error);
      throw error;
    }
  }

  async joinParty(partyCode, user, socketId) {
    let partyState = this.partyStates.get(partyCode);
    console.log("Party state:", partyState);
    
    if (!partyState) {
      const dbParty = await this.checkPartyExists(partyCode);
      if (!dbParty) return { success: false, error: "Party not found" };
      console.log("DB Party:", dbParty);
      partyState = {
        partyCode,
        host: dbParty.hostId,
        settings: DEFAULT_SETTINGS,
        teams: {
          red: { spymasters: [], operatives: [] },
          blue: { spymasters: [], operatives: [] }
        },
        unassignedPlayers: [],
        status: 'lobby'
      };
      this.partyStates.set(partyCode, partyState);
      console.log("Party state:", partyState);
    }

    // Add user to unassigned players if not already in party
    console.log("isPlayerInParty:", this.isPlayerInParty(partyState, user.id));
    if (!this.isPlayerInParty(partyState, user.id)) {
      const newPlayer = {
        userId: user.id,
        username: user.username,
        avatar: user.avatarUrl,
        role: 'unassigned',
        ready: false
      };
      partyState.unassignedPlayers.push(newPlayer);
      console.log("Added new player:", partyState.unassignedPlayers);
    }
    console.log("============== PartyState after join_party event ===============", partyState);
    return {
      success: true,
      state: partyState
    };
  }

  joinTeam(partyCode, user, team, role) {
    const partyState = this.partyStates.get(partyCode);
    if (!partyState) {
      return { success: false, error: "Party not found" };
    }

    // Remove player from current position
    partyState.unassignedPlayers = partyState.unassignedPlayers.filter(p => p.userId !== user.id);
    partyState.teams.red.spymasters = partyState.teams.red.spymasters.filter(p => p.userId !== user.id);
    partyState.teams.red.operatives = partyState.teams.red.operatives.filter(p => p.userId !== user.id);
    partyState.teams.blue.spymasters = partyState.teams.blue.spymasters.filter(p => p.userId !== user.id);
    partyState.teams.blue.operatives = partyState.teams.blue.operatives.filter(p => p.userId !== user.id);

    // Create new player object
    const newPlayer = {
      userId: user.id,
      username: user.username,
      avatar: user.avatarUrl,
      role: `${team}_${role}`,
      ready: false
    };

    // Add player to new team
    partyState.teams[team][`${role}s`].push(newPlayer);

    return { success: true, state: partyState };
  }

  unassignPlayer(partyCode, user) {
    const partyState = this.partyStates.get(partyCode);
    if (!partyState) {
      return { success: false, error: "Party not found" };
    }

    // Remove player from teams
    partyState.teams.red.spymasters = partyState.teams.red.spymasters.filter(p => p.userId !== user.id);
    partyState.teams.red.operatives = partyState.teams.red.operatives.filter(p => p.userId !== user.id);
    partyState.teams.blue.spymasters = partyState.teams.blue.spymasters.filter(p => p.userId !== user.id);
    partyState.teams.blue.operatives = partyState.teams.blue.operatives.filter(p => p.userId !== user.id);

    // Add to unassigned if not already there
    if (!partyState.unassignedPlayers.some(p => p.userId === user.id)) {
      partyState.unassignedPlayers.push({
        userId: user.id,
        username: user.username,
        avatar: user.avatarUrl,
        role: 'unassigned',
        ready: false
      });
    }

    return { success: true, state: partyState };
  }

  async checkPartyExists(code) {
    return prisma.party.findUnique({
      where: { joinCode: code }
    });
  }

  updatePartySettings(partyCode, settings) {
    const partyState = this.partyStates.get(partyCode);
    if (!partyState) {
      return { success: false, error: "Party not found" };
    }

    partyState.settings = settings;
    return { success: true, state: partyState };
  }

  startGame(partyCode) {
    const partyState = this.partyStates.get(partyCode);
    if (!partyState) {
      return { success: false, error: "Party not found" };
    }

    const boardSize = partyState.settings.boardSize;
    const totalCards = boardSize * boardSize;
    const redCards = Math.floor(totalCards * 0.35);
    const blueCards = Math.floor(totalCards * 0.35);
    const assassinCards = partyState.settings.assassinCards;
    const neutralCards = totalCards - redCards - blueCards - assassinCards;

    // Get words based on dictionary settings
    let words = this.getWordsFromDictionary(partyState.settings.dictionary);
    if (!words) {
      return { success: false, error: "No words available" };
    }

    // Initialize base game state
    let tiles;
    if (partyState.settings.gameMode === 'crazy') {
      // For crazy mode, ensure one neutral card is marked as lucky
      const selectedWords = this.shuffleArray(words).slice(0, totalCards);
      const cardTypes = [
        ...Array(redCards).fill('red'),
        ...Array(blueCards).fill('blue'),
        ...Array(assassinCards).fill('assassin'),
        ...Array(neutralCards).fill('neutral')
      ];
      
      const shuffledTypes = this.shuffleArray(cardTypes);
      
      // Create tiles and pick a random neutral tile to be lucky
      tiles = selectedWords.map((word, index) => ({
        word,
        team: shuffledTypes[index],
        revealed: false
      }));

      const neutralTiles = tiles.filter(t => t.team === 'neutral');
      const luckyTile = neutralTiles[Math.floor(Math.random() * neutralTiles.length)];
      luckyTile.isLucky = true;

      console.log('=== CRAZY MODE BOARD ===');
      console.log('Lucky Card:', { word: luckyTile.word });
      console.log('=====================');
    } else {
      // Classic mode board generation
      const selectedWords = this.shuffleArray(words).slice(0, totalCards);
      const cardTypes = [
        ...Array(redCards).fill('red'),
        ...Array(blueCards).fill('blue'),
        ...Array(assassinCards).fill('assassin'),
        ...Array(neutralCards).fill('neutral')
      ];
      
      tiles = selectedWords.map((word, index) => ({
        word,
        team: this.shuffleArray(cardTypes)[index],
        revealed: false
      }));
    }

    partyState.status = 'in-game';
    partyState.gameState = {
      board: { tiles },
      turn: {
        team: 'red',
        role: 'spymaster'
      },
      remainingWords: {
        red: redCards,
        blue: blueCards
      },
      logs: [],
      crazyMode: partyState.settings.gameMode === 'crazy' ? {
        usedAbilities: {
          red: { 
            spymasterSwapped: false,
            operativePeekUsed: false,
            peekResult: null
          },
          blue: { 
            spymasterSwapped: false,
            operativePeekUsed: false,
            peekResult: null
          }
        },
        hiddenInfo: {
          red: {},
          blue: {}
        }
      } : undefined
    };

    // Start timer if enabled
    if (partyState.settings.timer.enabled) {
      const currentTime = partyState.settings.timer.spymasterTime;
      partyState.gameState.timer = {
        endTime: Date.now() + (currentTime * 1000),
        timeLeft: currentTime
      };
    }

    console.log("Game state initialized:", partyState.gameState);
    return { success: true, state: partyState };
  }

  startTimer(partyCode) {
    const partyState = this.partyStates.get(partyCode);
    if (!partyState?.gameState || !partyState.settings.timer.enabled) {
      return { success: false, error: "Timer not enabled" };
    }

    const currentTime = partyState.gameState.turn.role === 'spymaster' 
      ? partyState.settings.timer.spymasterTime 
      : partyState.settings.timer.operativeTime;

    partyState.gameState.timer = {
      endTime: Date.now() + (currentTime * 1000),
      timeLeft: currentTime
    };

    return { success: true, state: partyState };
  }

  updateTimer(partyCode) {
    const partyState = this.partyStates.get(partyCode);
    if (!partyState?.gameState?.timer) return null;

    const timeLeft = Math.ceil((partyState.gameState.timer.endTime - Date.now()) / 1000);
    partyState.gameState.timer.timeLeft = Math.max(0, timeLeft);

    if (timeLeft <= 0) {
      // End turn when timer runs out
      this.endTurn(partyCode);
    }

    return partyState;
  }

  endTurn(partyCode) {
    const partyState = this.partyStates.get(partyCode);
    if (!partyState?.gameState) {
      return { success: false, error: "Game not found" };
    }

    // Switch turns
    partyState.gameState.turn = {
      team: partyState.gameState.turn.team === 'red' ? 'blue' : 'red',
      role: 'spymaster'
    };

    // Start new timer if enabled
    if (partyState.settings.timer.enabled) {
      const currentTime = partyState.settings.timer.spymasterTime;
      partyState.gameState.timer = {
        endTime: Date.now() + (currentTime * 1000),
        timeLeft: currentTime
      };
    }

    return { success: true, state: partyState };
  }

  giveHint(partyCode, hint, player) {
    const partyState = this.partyStates.get(partyCode);
    if (!partyState) {
      return { success: false, error: "Party not found" };
    }

    if (partyState.gameState.turn.role !== 'spymaster') {
      return { success: false, error: "Not spymaster's turn" };
    }

    // Add log entry
    partyState.gameState.logs.push({
      type: 'hint',
      player: player,
      team: partyState.gameState.turn.team,
      word: hint.word,
      number: hint.number
    });

    partyState.gameState.turn = {
      ...partyState.gameState.turn,
      role: 'operative',
      hint: {
        ...hint,
        remainingGuesses: hint.number + 1
      }
    };

    // Start new timer for operatives if enabled
    if (partyState.settings.timer.enabled) {
      const currentTime = partyState.settings.timer.operativeTime;
      partyState.gameState.timer = {
        endTime: Date.now() + (currentTime * 1000),
        timeLeft: currentTime
      };
    }

    return { success: true, state: partyState };
  }

  revealTile(partyCode, tileIndex, player) {
    const partyState = this.partyStates.get(partyCode);
    if (!partyState?.gameState) return { success: false, error: "Game not found" };

    const tile = partyState.gameState.board.tiles[tileIndex];
    const currentTeam = partyState.gameState.turn.team;
    let bonusReveal = null;
    let diceRoll = null;

    // Roll dice for neutral cards in crazy mode
    if (partyState.settings.gameMode === 'crazy' && tile.team === 'neutral') {
      diceRoll = {
        dice1: Math.floor(Math.random() * 6) + 1,
        dice2: Math.floor(Math.random() * 6) + 1
      };
    }

    // Handle lucky card in crazy mode
    if (partyState.settings.gameMode === 'crazy' && tile.isLucky) {
      const availableTiles = partyState.gameState.board.tiles
        .map((t, index) => ({ ...t, index }))
        .filter(t => !t.revealed && t.team !== currentTeam);

      if (availableTiles.length > 0) {
        const bonusTileInfo = availableTiles[Math.floor(Math.random() * availableTiles.length)];
        // Store bonus reveal but don't mark as revealed yet
        bonusReveal = {
          index: bonusTileInfo.index,
          word: bonusTileInfo.word,
          team: bonusTileInfo.team
        };
        // Only store the revealed information for the finding team
        partyState.gameState.crazyMode.hiddenInfo[currentTeam].bonusTile = bonusReveal;
      }
    }

    // Add log entry with dice roll
    partyState.gameState.logs.push({
      type: 'guess',
      player,
      team: currentTeam,
      word: tile.word,
      success: tile.team === currentTeam,
      actualTeam: tile.team,
      diceRoll,  // Add dice roll to log
      luckyCard: tile.isLucky ? {
        word: tile.word,
        bonusReveal: bonusReveal ? {
          word: bonusReveal.word,
          team: bonusReveal.team
        } : undefined
      } : undefined
    });

    // Reveal the tile
    tile.revealed = true;

    // Update remaining words count
    if (tile.team === 'red' || tile.team === 'blue') {
      partyState.gameState.remainingWords[tile.team]--;
    }

    // Check if game is over
    if (tile.team === 'assassin') {
      partyState.gameState.winner = partyState.gameState.turn.team === 'red' ? 'blue' : 'red';
      partyState.status = 'game-over';
      return { success: true, state: partyState };
    }

    // Handle turn changes based on dice roll
    if (partyState.settings.gameMode === 'crazy' && tile.team === 'neutral') {
      if (diceRoll && diceRoll.dice1 === diceRoll.dice2) {
        return { success: true, state: partyState, diceRoll };
      }
    }

    // Normal turn handling
    if (tile.team !== partyState.gameState.turn.team) {
      this.switchTurn(partyState);
    } else if (partyState.gameState.turn.hint) {
      partyState.gameState.turn.hint.remainingGuesses--;
      if (partyState.gameState.turn.hint.remainingGuesses <= 0) {
        this.switchTurn(partyState);
      }
    }

    return { success: true, state: partyState, bonusReveal };
  }

  switchTurn(partyState) {
    partyState.gameState.turn = {
      team: partyState.gameState.turn.team === 'red' ? 'blue' : 'red',
      role: 'spymaster'
    };

    if (partyState.settings.timer.enabled) {
      const currentTime = partyState.settings.timer.spymasterTime;
      partyState.gameState.timer = {
        endTime: Date.now() + (currentTime * 1000),
        timeLeft: currentTime
      };
    }
  }

  suspectWord(partyCode, userId, username, avatar, wordIndex) {
    const partyState = this.partyStates.get(partyCode);
    if (!partyState?.gameState) {
      return { success: false, error: "Game not found" };
    }

    if (!partyState.gameState.turn.suspectedWords) {
      partyState.gameState.turn.suspectedWords = [];
    }

    // Find if user already suspected this specific word
    const existingSuspicion = partyState.gameState.turn.suspectedWords.findIndex(
      s => s.username === username && s.wordIndex === wordIndex
    );

    if (existingSuspicion >= 0) {
      // Remove this specific suspicion
      partyState.gameState.turn.suspectedWords.splice(existingSuspicion, 1);
    } else {
      // Add new suspicion
      partyState.gameState.turn.suspectedWords.push({
        userId,
        username,
        avatar,
        wordIndex
      });
    }

    return { success: true, state: partyState };
  }

  resetGame(partyCode) {
    const partyState = this.partyStates.get(partyCode);
    if (!partyState) {
      return { success: false, error: "Party not found" };
    }

    // Reset to lobby state
    partyState.status = 'lobby';
    delete partyState.gameState;

    // Reset player ready states
    const resetPlayers = (players) => {
      players.forEach(p => p.ready = false);
    };

    resetPlayers(partyState.unassignedPlayers);
    resetPlayers(partyState.teams.red.spymasters);
    resetPlayers(partyState.teams.red.operatives);
    resetPlayers(partyState.teams.blue.spymasters);
    resetPlayers(partyState.teams.blue.operatives);

    if (partyState.gameState?.turn) {
      delete partyState.gameState.turn.suspectedWords;
    }

    return { success: true, state: partyState };
  }

  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  getWordsFromDictionary(dictionary) {
    switch (dictionary.type) {
      case 'french':
        return frenchWords.words;
      case 'custom':
        return dictionary.customWords?.length ? dictionary.customWords : null;
      default:
        return englishWords.words;
    }
  }

  isPlayerInParty(partyState, userId) {
    // Check unassigned players
    if (partyState.unassignedPlayers.some(p => p.userId === userId)) {
      return true;
    }

    // Check both teams
    const teams = ['red', 'blue'];
    const roles = ['spymasters', 'operatives'];

    return teams.some(team =>
      roles.some(role =>
        partyState.teams[team][role].some(p => p.userId === userId)
      )
    );
  }

  handleSpymasterAbility(partyCode, team, swap) {
    const partyState = this.partyStates.get(partyCode);
    if (!partyState?.gameState) {
      return { success: false, error: "Game not found" };
    }

    // Log the current state before swap
    console.log('Before swap:', {
      teamWord: partyState.gameState.board.tiles[swap.teamWordIndex],
      neutralWord: partyState.gameState.board.tiles[swap.neutralWordIndex]
    });

    if (partyState.gameState.turn.team !== team || 
        partyState.gameState.turn.role !== 'spymaster') {
      return { success: false, error: "Not your turn" };
    }

    if (partyState.gameState.crazyMode.usedAbilities[team].spymasterSwapped) {
      return { success: false, error: "Ability already used" };
    }

    const { teamWordIndex, neutralWordIndex } = swap;
    const tiles = partyState.gameState.board.tiles;
    
    // Store if the neutral card was lucky before swap
    const wasLuckyCard = tiles[neutralWordIndex].isLucky;

    // Perform the swap
    [tiles[teamWordIndex].team, tiles[neutralWordIndex].team] = 
    [tiles[neutralWordIndex].team, tiles[teamWordIndex].team];

    // If we swapped with a lucky card, we need to pick a new one
    if (wasLuckyCard) {
      // Remove lucky status from the swapped card
      delete tiles[neutralWordIndex].isLucky;

      // Find remaining unrevealed neutral cards
      const unrevealedNeutralTiles = tiles.filter(t => 
        !t.revealed && 
        t.team === 'neutral' && 
        !t.isLucky
      );

      if (unrevealedNeutralTiles.length > 0) {
        // Pick a random neutral tile to be the new lucky card
        const newLuckyTile = unrevealedNeutralTiles[
          Math.floor(Math.random() * unrevealedNeutralTiles.length)
        ];
        newLuckyTile.isLucky = true;

        console.log('New lucky card:', { word: newLuckyTile.word });
      }
    }

    // Find the spymaster's username
    const spymaster = partyState.teams[team].spymasters[0];
    
    // Log the ability use with player name
    partyState.gameState.logs.push({
      type: 'ability',
      action: 'swap',
      team,
      player: spymaster.username
    });

    partyState.gameState.crazyMode.usedAbilities[team].spymasterSwapped = true;

    return { success: true, state: partyState };
  }

  handleOperativeAbility(partyCode, team, row) {
    const partyState = this.partyStates.get(partyCode);
    if (!partyState?.gameState) {
      return { success: false, error: "Game not found" };
    }

    if (partyState.gameState.turn.team !== team || 
        partyState.gameState.turn.role !== 'operative') {
      return { success: false, error: "Not your turn" };
    }

    if (partyState.gameState.crazyMode.usedAbilities[team].operativePeekUsed) {
      return { success: false, error: "Ability already used" };
    }

    const size = Math.sqrt(partyState.gameState.board.tiles.length);
    const rowTiles = partyState.gameState.board.tiles.slice(row * size, (row + 1) * size);
    // Modified to check only unrevealed team words
    const hasTeamWord = rowTiles.some(tile => tile.team === team && !tile.revealed);

    // Store the peek result in party state
    partyState.gameState.crazyMode.usedAbilities[team].peekResult = {
      row,
      hasTeamWord
    };

    // Find the operative's username
    const operative = partyState.teams[team].operatives.find(
      p => partyState.gameState.turn.team === team
    );

    // Log the ability use with player name
    partyState.gameState.logs.push({
      type: 'ability',
      action: 'peek',
      team,
      player: operative.username
    });

    // Mark ability as used
    partyState.gameState.crazyMode.usedAbilities[team].operativePeekUsed = true;

    return { 
      success: true, 
      state: partyState,
      hasTeamWord
    };
  }
}

module.exports = new PartyService();
