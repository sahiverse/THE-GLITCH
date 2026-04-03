const RoomManager = require('../rooms/roomManager');
const { getQuestion } = require('../game/questionService');
const { runAllTestCases } = require('../judge0/judge0Service');

function registerSubmitHandlers(socket, io) {

  /**
   * RUN handler: Private code execution for testing.
   * 
   * Unlike submit, this only returns results to the requesting player.
   * Used for iterative development without affecting game state.
   * Runs both real and sabotage test cases to give imposters full visibility.
   */
  socket.on('run_code', async (data) => {
    try {
      const { language } = data;

      // Get room from socket
      const roomCode = await RoomManager.getPlayerRoom(socket.id);
      if (!roomCode) {
        socket.emit('run_error', { error: 'Room not found' });
        return;
      }

      const room = await RoomManager.getRoom(roomCode);
      if (!room) {
        socket.emit('run_error', { error: 'Room not found' });
        return;
      }

      if (room.gameState !== 'in-game') {
        socket.emit('run_error', { error: 'Game not active' });
        return;
      }

      const player = room.players.find(p => p.id === socket.id);
      if (!player) {
        socket.emit('run_error', { error: 'Player not found' });
        return;
      }

      const code = room.sharedCode || '';
      if (!code.trim()) {
        socket.emit('run_error', { error: 'No code to run' });
        return;
      }

      const question = getQuestion(room.topic);
      const lang = language || 'python';

      // Run both real (visible only) and sabotage cases in parallel
      const visibleRealCases = question.realTestCases.filter(tc => !tc.isHidden);
      const sabotageCases = question.sabotageTestCases;

      // Notify only this player that run started
      socket.emit('run_started', { message: 'Running code...' });

      console.log(`🏃 ${player.name} running code in room ${roomCode} (${lang})`);

      // Run against both test case sets simultaneously
      const [realRunResults, sabotageRunResults] = await Promise.all([
        runAllTestCases(code, lang, visibleRealCases),
        runAllTestCases(code, lang, sabotageCases)
      ]);

      // Private result — player sees their own role's detailed output
      const privateResults = player.role === 'imposter'
        ? sabotageRunResults
        : realRunResults;

      socket.emit('run_result', {
        results: privateResults,
        role: player.role,
        isPrivate: true
      });

      // Public status-only broadcast — all players get tick mark updates
      // No actual output, no expected output, no stderr exposed
      io.to(roomCode).emit('run_status_update', {
        realResults: visibleRealCases.map((tc, i) => ({
          input: tc.input,
          passed: realRunResults[i]?.passed ?? false
        })),
        sabotageResults: sabotageCases.map((tc, i) => ({
          input: tc.input,
          passed: sabotageRunResults[i]?.passed ?? false
        })),
        runBy: player.name,
        runByColor: player.color
      });

      console.log(`✅ Run complete for ${player.name}: ${privateResults.filter(r => r.passed).length}/${privateResults.length} passed`);

    } catch (error) {
      console.error('❌ Error in run_code:', error);
      socket.emit('run_error', { error: 'Failed to run code. Please try again.' });
    }
  });


  /**
   * SUBMIT handler: Public code execution with win condition check.
   * 
   * Broadcasts results to all players and evaluates win conditions.
   * Civilians win if all real test cases pass; imposter wins if
   * all sabotage test cases pass (successful code corruption).
   */
  socket.on('submit_code', async (data) => {
    try {
      const { language } = data;

      // Get room from socket
      const roomCode = await RoomManager.getPlayerRoom(socket.id);
      if (!roomCode) {
        socket.emit('submit_error', { error: 'Room not found' });
        return;
      }

      const room = await RoomManager.getRoom(roomCode);
      if (!room) {
        socket.emit('submit_error', { error: 'Room not found' });
        return;
      }

      if (room.gameState !== 'in-game') {
        socket.emit('submit_error', { error: 'Game not active' });
        return;
      }

      const player = room.players.find(p => p.id === socket.id);
      if (!player) {
        socket.emit('submit_error', { error: 'Player not found' });
        return;
      }

      const code = room.sharedCode || '';
      if (!code.trim()) {
        socket.emit('submit_error', { error: 'No code to submit' });
        return;
      }

      const question = getQuestion(room.topic);
      const lang = language || 'python';

      // Notify ALL players that submission started
      io.to(roomCode).emit('submit_started', {
        submittedBy: player.name,
        submittedByColor: player.color
      });

      console.log(`📤 ${player.name} submitting code in room ${roomCode} (${lang})`);

      // Run against BOTH test case sets simultaneously
      const [realResults, sabotageResults] = await Promise.all([
        runAllTestCases(code, lang, question.realTestCases),
        runAllTestCases(code, lang, question.sabotageTestCases)
      ]);

      const allRealPassed = realResults.every(r => r.passed);
      const allSabotagePassed = sabotageResults.every(r => r.passed);

      // Debug: Calculate pass counts explicitly
      const sabotagePassedCount = sabotageResults.filter(r => r.passed).length;
      const realPassedCount = realResults.filter(r => r.passed).length;
      const sabotageTotal = sabotageResults.length;
      const realTotal = realResults.length;

      console.log(`📊 Sabotage: ${sabotagePassedCount}/${sabotageTotal} passed`);
      console.log(`📊 Real: ${realPassedCount}/${realTotal} passed`);
      console.log(`🏆 Win check: sabotage=${allSabotagePassed}, real=${allRealPassed}`);

      // Stats for feedback — never expose hidden case details
      const realVisible = question.realTestCases.filter(tc => !tc.isHidden);
      const realHidden = question.realTestCases.filter(tc => tc.isHidden);
      const sabotageVisible = question.sabotageTestCases.filter(tc => !tc.isHidden);
      const sabotageHidden = question.sabotageTestCases.filter(tc => tc.isHidden);

      const realVisibleResults = realResults.slice(0, realVisible.length);
      const realHiddenResults = realResults.slice(realVisible.length);
      const sabotageVisibleResults = sabotageResults.slice(0, sabotageVisible.length);
      const sabotageHiddenResults = sabotageResults.slice(sabotageVisible.length);

      const realTotalPassed = realResults.filter(r => r.passed).length;
      const realTotalFailed = realResults.length - realTotalPassed;
      const sabotageTotalPassed = sabotageResults.filter(r => r.passed).length;
      const sabotageTotalFailed = sabotageResults.length - sabotageTotalPassed;

      console.log(`📊 Real cases: ${realResults.filter(r=>r.passed).length}/${realResults.length} passed`);
      console.log(`📊 Sabotage cases: ${sabotageResults.filter(r=>r.passed).length}/${sabotageResults.length} passed`);

      /**
       * Win condition evaluation:
       * 
       * IMPOSTER VICTORY: All sabotage test cases pass
       *   → Code corruption succeeded; imposter injected working exploits
       * 
       * CIVILIAN VICTORY: All real test cases pass AND sabotage cases fail
       *   → Solution is correct and resilient to imposter's sabotage
       * 
       * NO WINNER: Real test cases fail
       *   → Code still buggy; continue collaborative debugging
       * 
       * This creates the core social deduction tension: civilians must
       * verify correctness while imposter subtly introduces bugs that
       * still appear to work on surface-level tests.
       */

      let winner = null;
      let winMessage = '';

      if (allSabotagePassed) {
        // Imposter wins — sabotage cases pass means code is corrupted
        winner = 'imposter';
        winMessage = 'The imposter successfully sabotaged the code! Imposter wins!';
        console.log(`🕵️ IMPOSTER WIN TRIGGERED: ${sabotagePassedCount}/${sabotageTotal} sabotage cases passed`);
      } else if (allRealPassed) {
        // Civilians win — real cases pass, sabotage cases fail
        winner = 'civilians';
        winMessage = 'All test cases passed! The code is correct. Civilians win!';
        console.log(`👨‍💼 CIVILIAN WIN TRIGGERED: ${realPassedCount}/${realTotal} real cases passed`);
      } else {
        // No winner — real cases fail, keep coding
        winner = null;
        winMessage = 'Some test cases failed. Keep working!';
      }

      // Send visible results with pass/fail detail, hidden results as pass/fail count only
      const privateVisibleResults = player.role === 'imposter'
        ? sabotageVisibleResults
        : realVisibleResults;

      const privateTotalPassed = player.role === 'imposter'
        ? sabotageTotalPassed
        : realTotalPassed;

      const privateTotalFailed = player.role === 'imposter'
        ? sabotageTotalFailed
        : realTotalFailed;

      const privateTotalCases = player.role === 'imposter'
        ? sabotageResults.length
        : realResults.length;

      socket.emit('submit_result', {
        results: privateVisibleResults,
        totalPassed: privateTotalPassed,
        totalFailed: privateTotalFailed,
        totalCases: privateTotalCases,
        role: player.role,
        winner,
        winMessage
      });

      // Broadcast public result to ALL players
      // Never expose expectedOutput or sabotage details publicly
      io.to(roomCode).emit('submission_broadcast', {
        submittedBy: player.name,
        submittedByColor: player.color,
        // Only expose visible real results publicly — hidden cases shown as count only
        publicResults: realVisibleResults.map(r => ({
          passed: r.passed,
          status: r.status,
          input: r.input,
          actualOutput: r.passed ? null : r.actualOutput,
          stderr: r.passed ? null : r.stderr
        })),
        totalPassed: realTotalPassed,
        totalFailed: realTotalFailed,
        totalCases: realResults.length,
        hiddenCaseCount: realHiddenResults.length,
        hiddenCasesPassed: realHiddenResults.filter(r => r.passed).length,
        allRealPassed,
        winner,
        winMessage,
        imposterId: winner ? room.imposterId : null,
        imposterName: winner
          ? room.players.find(p => p.id === room.imposterId)?.name || 'Unknown'
          : null
      });

      // If winner — end the game
      if (winner) {
        room.gameState = 'ended';
        await RoomManager.saveRoom(roomCode, room);

        // Stop round timer
        try {
          const roundManager = require('../game/roundManager');
          roundManager.cleanupTimer(roomCode);
        } catch (e) {
          console.log('Timer cleanup skipped:', e.message);
        }

        // Broadcast game over to all
        io.to(roomCode).emit('game_over', {
          winner,
          imposterId: room.imposterId,
          message: winMessage,
          triggeredBy: 'submission'
        });

        console.log(`🏆 Game over in room ${roomCode}: ${winner} wins via submission`);
      }

      console.log(`✅ Submit complete for ${player.name} — winner: ${winner || 'none yet'}`);

    } catch (error) {
      console.error('❌ Error in submit_code:', error);
      socket.emit('submit_error', { error: 'Failed to submit code. Please try again.' });
      // Notify all players that submission failed
      try {
        const roomCode = await RoomManager.getPlayerRoom(socket.id);
        if (roomCode) {
          io.to(roomCode).emit('submission_broadcast', {
            submittedBy: null,
            failed: true
          });
        }
      } catch (e) {}
    }
  });
}

module.exports = { registerSubmitHandlers };
