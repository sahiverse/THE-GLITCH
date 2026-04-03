import { useState, useEffect, useRef, useCallback } from 'react';

interface CursorPosition {
  cursorOffset: number;
  selection: {
    startOffset: number;
    endOffset: number;
  };
}

interface CursorData {
  playerId: string;
  playerName: string;
  color: string;
  cursorOffset: number;
  selection: {
    startOffset: number;
    endOffset: number;
  };
}

interface UseEditorSyncProps {
  socket: any;
  roomCode: string;
  socketId: string;
  lockedPlayers?: string[];
}

/**
 * Hook for real-time collaborative editor synchronization
 * 
 * Manages:
 * - Remote code updates from other players (debounced)
 * - Remote cursor position tracking and rendering
 * - Read-only mode for voted-out players
 * 
 * @param socket - Socket.io connection
 * @param roomCode - Current game room identifier
 * @param socketId - This player's socket ID
 * @param lockedPlayers - Array of voted-out player IDs (read-only for them)
 */
export const useEditorSync = ({ socket, roomCode, socketId, lockedPlayers = [] }: UseEditorSyncProps) => {
  const [remoteCode, setRemoteCode] = useState<string>('');
  const [remoteCursors, setRemoteCursors] = useState<Record<string, CursorData>>({});
  const [error, setError] = useState<string>('');
  
  /**
   * Debounce timer for code update emissions.
   * Prevents excessive network traffic during rapid typing;
   * 50ms delay balances responsiveness with bandwidth.
   */
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  /** Tracks if initial code sync has been requested to prevent duplicate requests. */
  const hasRequestedCode = useRef(false);
  
  /** Player loses edit access when voted out (spectator mode). */
  const isReadOnly = lockedPlayers.includes(socketId);
  
  /**
   * Request current room code on component mount.
   * Edge case: If player joins mid-session, they need existing code
   * rather than starting from blank editor.
   */
  useEffect(() => {
    if (socket && roomCode && !hasRequestedCode.current) {
      hasRequestedCode.current = true;
      socket.emit('request_current_code', { code: roomCode });
    }
  }, [socket, roomCode]);
  
  /**
   * Subscribe to code and cursor sync events from Socket.io.
   * 
   * Events handled:
   * - code_synced: Remote code update from another player
   * - cursor_synced: Remote cursor position updates
   * - editor_error: Error notifications from server
   * 
   * Filters out echo from self to prevent local cursor jumping.
   */
  useEffect(() => {
    if (!socket) return;
    
    const handleCodeSynced = (data: any) => {
      // Ignore echo from self and null (initial sync)
      if (!data.updatedBy || data.updatedBy === socketId) {
        return;
      }
      
      const cursors = { ...(data.cursors || {}) };
      delete cursors[socketId];
      
      setRemoteCode(data.code || '');
      setRemoteCursors(cursors);
    };
    
    const handleCursorSynced = (data: any) => {
      // Filter out own cursor
      const cursors = { ...data.cursors };
      delete cursors[socketId];
      setRemoteCursors(cursors);
    };
    
    const handleEditorError = (data: any) => {
      setError(data.error || 'Unknown editor error');
    };
    
    socket.on('code_synced', handleCodeSynced);
    socket.on('cursor_synced', handleCursorSynced);
    socket.on('editor_error', handleEditorError);
    
    return () => {
      socket.off('code_synced', handleCodeSynced);
      socket.off('cursor_synced', handleCursorSynced);
      socket.off('editor_error', handleEditorError);
    };
  }, [socket, socketId]);
  
  /**
   * Re-request current code when player is voted out.
   * Ensures spectator sees the latest code state after being locked.
   */
  useEffect(() => {
    if (socket && roomCode && lockedPlayers.includes(socketId)) {
      socket.emit('request_current_code', { code: roomCode })
    }
  }, [lockedPlayers, socketId, socket, roomCode])
  
  // Debug: Log when lockedPlayers changes
  useEffect(() => {
    console.log('🔒 LockedPlayers updated:', lockedPlayers, 'Current player locked:', lockedPlayers.includes(socketId))
  }, [lockedPlayers])
  
  /**
   * Emit code update with debounce.
   * 
   * 50ms debounce prevents flooding network during rapid keystrokes
   * while maintaining real-time feel for collaborative editing.
   */
  const emitCodeUpdate = useCallback((code: string, cursor: CursorPosition) => {
    if (!socket || !roomCode || isReadOnly) return;
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer for debounce
    debounceTimerRef.current = setTimeout(() => {
      socket.emit('code_update', {
        code,
        cursorOffset: cursor.cursorOffset,
        selection: cursor.selection
      });
    }, 50); // 50ms debounce
  }, [socket, roomCode, isReadOnly]);
  
  /**
   * Emit cursor position update (no debounce).
   * 
   * Cursor updates need immediate transmission for real-time presence.
   * Socket.io's internal buffering handles network optimization.
   */
  const emitCursorUpdate = useCallback((cursor: CursorPosition) => {
    if (!socket || !roomCode || isReadOnly) return;
    
    socket.emit('cursor_update', {
      cursorOffset: cursor.cursorOffset,
      selection: cursor.selection
    });
  }, [socket, roomCode, isReadOnly]);
  
  /** Cleanup debounce timer on unmount to prevent memory leaks. */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  return {
    remoteCode,
    remoteCursors,
    isReadOnly,
    error,
    emitCodeUpdate,
    emitCursorUpdate
  };
};
