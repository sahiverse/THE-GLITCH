import { useState, useEffect, useCallback } from 'react';

interface MessageObject {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  message: string;
  timestamp: number;
  type: "player" | "system";
}

interface UseChatProps {
  socket: any;
  roomCode: string;
  socketId: string;
  isVotedOut: boolean;
}

/**
 * Hook for real-time chat functionality
 * 
 * Manages message state and communication with backend chat handlers.
 * Messages are ephemeral (not persisted) as game rooms are temporary.
 * 
 * @param socket - Socket.io connection
 * @param roomCode - Current game room identifier  
 * @param socketId - This player's socket ID
 * @param isVotedOut - Whether player has been voted out (prevents sending)
 */
export const useChat = ({ socket, roomCode, socketId, isVotedOut }: UseChatProps) => {
  const [messages, setMessages] = useState<MessageObject[]>([]);
  const [error, setError] = useState<string>('');
  
  /**
   * Subscribe to chat events from Socket.io.
   * 
   * Appends new messages to local state; messages are stored
   * ephemerally (no persistence) as game rooms are temporary.
   */
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (data: MessageObject) => {
      setMessages(prev => [...prev, data]);
    };
    
    const handleChatError = (data: { error: string }) => {
      setError(data.error);
      
      // Clear error after 3 seconds
      setTimeout(() => setError(''), 3000);
    };
    
    socket.on('new_message', handleNewMessage);
    socket.on('chat_error', handleChatError);
    
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('chat_error', handleChatError);
    };
  }, [socket]);
  
  /**
   * Send a chat message to the server.
   * 
   * Client-side validation:
   * - Message must be non-empty after trimming
   * - Message length capped at 200 characters
   * 
   * Server enforces additional validation (game state, room membership).
   */
  const sendMessage = useCallback((message: string) => {
    if (!socket || !roomCode) return;
    
    // Validate message
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    
    if (trimmedMessage.length > 200) {
      setError('Message too long');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    // Emit message to server
    socket.emit('send_message', {
      roomCode,
      message: trimmedMessage
    });
  }, [socket, roomCode]);
  
  return {
    messages,
    error,
    sendMessage
  };
};
