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

export const useEditorSync = ({ socket, roomCode, socketId, lockedPlayers = [] }: UseEditorSyncProps) => {
  const [remoteCode, setRemoteCode] = useState<string>('');
  const [remoteCursors, setRemoteCursors] = useState<Record<string, CursorData>>({});
  const [error, setError] = useState<string>('');
  
  // Debounce timer for code updates
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasRequestedCode = useRef(false);
  
  // Check if player is locked out (read-only)
  const isReadOnly = lockedPlayers.includes(socketId);
  
  // Request current code on mount (only once)
  useEffect(() => {
    if (socket && roomCode && !hasRequestedCode.current) {
      hasRequestedCode.current = true;
      console.log('📥 Requesting current code for room:', roomCode);
      socket.emit('request_current_code', { code: roomCode });
    }
  }, [socket, roomCode]);
  
  // Listen for code sync events
  useEffect(() => {
    if (!socket) return;
    
    const handleCodeSynced = (data: any) => {
      console.log('📡 Code synced:', { updatedBy: data.updatedBy, codeLength: data.code?.length });
      console.log('🔒 Current player locked status:', lockedPlayers.includes(socketId));
      
      // Ignore echo from self and null (initial sync)
      if (!data.updatedBy || data.updatedBy === socketId) {
        console.log('🔇 Ignoring echo from self or null updatedBy');
        return;
      }
      
      const cursors = { ...(data.cursors || {}) };
      delete cursors[socketId];
      
      setRemoteCode(data.code || '');
      setRemoteCursors(cursors);
    };
    
    const handleCursorSynced = (data: any) => {
      console.log('👆 Cursor synced:', Object.keys(data.cursors || {}).length, 'cursors');
      
      // Filter out own cursor
      const cursors = { ...data.cursors };
      delete cursors[socketId];
      setRemoteCursors(cursors);
    };
    
    const handleEditorError = (data: any) => {
      console.error('❌ Editor error:', data);
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
  
  // Re-request current code when player becomes locked
  useEffect(() => {
    if (socket && roomCode && lockedPlayers.includes(socketId)) {
      console.log('💀 Player is now dead, re-requesting current code')
      socket.emit('request_current_code', { code: roomCode })
    }
  }, [lockedPlayers, socketId, socket, roomCode])
  
  // Debug: Log when lockedPlayers changes
  useEffect(() => {
    console.log('🔒 LockedPlayers updated:', lockedPlayers, 'Current player locked:', lockedPlayers.includes(socketId))
  }, [lockedPlayers])
  
  // Emit code update with debounce
  const emitCodeUpdate = useCallback((code: string, cursor: CursorPosition) => {
    if (!socket || !roomCode || isReadOnly) return;
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer for debounce
    debounceTimerRef.current = setTimeout(() => {
      console.log('📝 Emitting code update:', { codeLength: code.length, cursor });
      socket.emit('code_update', {
        code,
        cursorOffset: cursor.cursorOffset,
        selection: cursor.selection
      });
    }, 50); // 50ms debounce
  }, [socket, roomCode, isReadOnly]);
  
  // Emit cursor update (no debounce)
  const emitCursorUpdate = useCallback((cursor: CursorPosition) => {
    if (!socket || !roomCode || isReadOnly) return;
    
    console.log('👆 Emitting cursor update:', cursor);
    socket.emit('cursor_update', {
      cursorOffset: cursor.cursorOffset,
      selection: cursor.selection
    });
  }, [socket, roomCode, isReadOnly]);
  
  // Cleanup debounce timer on unmount
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
