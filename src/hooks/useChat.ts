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

export const useChat = ({ socket, roomCode, socketId, isVotedOut }: UseChatProps) => {
  const [messages, setMessages] = useState<MessageObject[]>([]);
  const [error, setError] = useState<string>('');
  
  // Listen for new messages
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (data: MessageObject) => {
      console.log('💬 New message received:', data);
      setMessages(prev => [...prev, data]);
    };
    
    const handleChatError = (data: { error: string }) => {
      console.error('❌ Chat error:', data);
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
  
  // Send message function
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
    
    console.log('💬 Sending message:', trimmedMessage);
  }, [socket, roomCode]);
  
  return {
    messages,
    error,
    sendMessage
  };
};
