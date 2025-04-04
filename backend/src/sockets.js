const partyService = require('./services/PartyService');

module.exports = (io) => {
  const timers = new Map(); // Store timer intervals by party code

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join_party", async (data) => {
      const { partyCode, user } = data;
      console.log(`User ${user.username} attempting to join party ${partyCode}`);
      
      const result = await partyService.joinParty(partyCode, user, socket.id);
      
      if (!result.success) {
        socket.emit("join_error", { message: result.error });
        return;
      }

      socket.join(partyCode);

      // Restart timer if game is in progress and timer is enabled
      if (result.state.status === 'in-game' && result.state.settings.timer.enabled) {
        // Clear existing timer if any
        if (timers.has(partyCode)) {
          clearInterval(timers.get(partyCode));
        }

        const timerInterval = setInterval(() => {
          const updatedState = partyService.updateTimer(partyCode);
          if (updatedState) {
            io.to(partyCode).emit("party_state", updatedState);
          } else {
            clearInterval(timerInterval);
            timers.delete(partyCode);
          }
        }, 1000);

        timers.set(partyCode, timerInterval);
      }

      io.to(partyCode).emit("party_state", result.state);
    });

    socket.on("join_team", async (data) => {
      const { team, role, partyCode, user } = data;
      const result = await partyService.joinTeam(partyCode, user, team, role);
      
      if (result.success) {
        io.to(partyCode).emit("party_state", result.state);
      } else {
        socket.emit("team_join_error", { message: result.error });
      }
    });

    socket.on("unassign_player", async (data) => {
      const { partyCode, user } = data;
      const result = await partyService.unassignPlayer(partyCode, user);
      
      if (result.success) {
        io.to(partyCode).emit("party_state", result.state);
      } else {
        socket.emit("unassign_error", { message: result.error });
      }
    });

    socket.on("party_update", (data) => {
      const { partyCode, settings } = data;
      const result = partyService.updatePartySettings(partyCode, settings);
      console.log(`Party settings updated for ${partyCode}:`, settings);
      if (result.success) {
        io.to(partyCode).emit("party_state", result.state);
      } else {
        socket.emit("settings_error", { message: result.error });
      }
    });

    socket.on("start_game", (data) => {
      const { partyCode } = data;
      console.log(`Starting game for party: ${partyCode}`);
      const result = partyService.startGame(partyCode);
      
      if (result.success) {
        // Clear any existing timer
        if (timers.has(partyCode)) {
          clearInterval(timers.get(partyCode));
        }

        // Set up timer if enabled
        if (result.state.settings.timer.enabled) {
          const timerInterval = setInterval(() => {
            const updatedState = partyService.updateTimer(partyCode);
            if (updatedState) {
              io.to(partyCode).emit("party_state", updatedState);
            } else {
              clearInterval(timerInterval);
              timers.delete(partyCode);
            }
          }, 1000);

          timers.set(partyCode, timerInterval);
        }

        io.to(partyCode).emit("party_state", result.state);
      } else {
        socket.emit("game_error", { message: result.error });
      }
    });

    socket.on("give_hint", (data) => {
      const { partyCode, hint, player } = data;
      console.log('data',data)
      console.log(`Hint given in party ${partyCode}:`, hint);
      
      const result = partyService.giveHint(partyCode, hint, player);
      console.log(`Hint result for party ${partyCode}:`, result);
      if (result.success) {
        io.to(partyCode).emit("party_state", result.state);
      } else {
        socket.emit("hint_error", { message: result.error });
      }
    });

    socket.on("reveal_tile", (data) => {
      const { partyCode, tileIndex, player } = data;
      console.log(`Revealing tile ${tileIndex} in party ${partyCode}`);
      
      const result = partyService.revealTile(partyCode, tileIndex, player);
      console.log(`Revealing result for party ${partyCode}:`, result);

      if (result.success) {
        io.to(partyCode).emit("party_state", result.state);
      } else {
        socket.emit("reveal_error", { message: result.error });
      }
    });

    socket.on("reset_game", (data) => {
      const { partyCode } = data;
      console.log(`Resetting game for party: ${partyCode}`);
      
      // Clear timer if exists
      if (timers.has(partyCode)) {
        clearInterval(timers.get(partyCode));
        timers.delete(partyCode);
      }

      const result = partyService.resetGame(partyCode);
      
      if (result.success) {
        io.to(partyCode).emit("party_state", result.state);
      } else {
        socket.emit("reset_error", { message: result.error });
      }
    });

    socket.on("suspect_word", (data) => {
      const { partyCode, userId, username, avatar, wordIndex } = data;
      const result = partyService.suspectWord(partyCode, userId, username, avatar, wordIndex);
      
      if (result.success) {
        io.to(partyCode).emit("party_state", result.state);
      }
    });

    socket.on("use_spymaster_ability", (data) => {
      const { partyCode, team, swap } = data;
      console.log(`[Spymaster Ability] Team ${team} using swap ability:`, swap);
      
      const result = partyService.handleSpymasterAbility(partyCode, team, swap);
      
      if (result.success) {
        io.to(partyCode).emit("party_state", result.state);
        console.log(`[Spymaster Ability] Swap successful for team ${team}`);
      } else {
        socket.emit("ability_error", { message: result.error });
        console.log(`[Spymaster Ability] Error:`, result.error);
      }
    });

    socket.on("use_operative_ability", (data) => {
      const { partyCode, team, row } = data;
      console.log(`[Operative Ability] Team ${team} peeking at row ${row}`);
      
      const result = partyService.handleOperativeAbility(partyCode, team, row);
      
      if (result.success) {
        // Send peek result only to the team that used it
        const teamSockets = Array.from(socket.adapter.rooms.get(partyCode) || []);
        teamSockets.forEach(socketId => {
          const clientSocket = io.sockets.sockets.get(socketId);
          if (clientSocket) {
            clientSocket.emit("peek_result", {
              row,
              hasTeamWord: result.hasTeamWord,
              peekingTeam: team  // Add the team info
            });
          }
        });
        io.to(partyCode).emit("party_state", result.state);
        console.log(`[Operative Ability] Peek result for team ${team}: ${result.hasTeamWord ? 'Found team word' : 'No team word'}`);
      } else {
        socket.emit("ability_error", { message: result.error });
        console.log(`[Operative Ability] Error:`, result.error);
      }
    });

    socket.on("disconnect", () => {      
      // Cleanup any timers for parties this socket was in
      timers.forEach((timer, code) => {
        clearInterval(timer);
      });
      console.log("User disconnected:", socket.id);
    });
  });
};
