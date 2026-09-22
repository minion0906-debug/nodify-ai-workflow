"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Bot, User, Paperclip, X, RotateCcw } from 'lucide-react';
import { ChatFileRenderer } from './chat-file-renderer';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  files?: any[];
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatName?: string;
  welcomeMessage?: string;
  placeholder?: string;
  primaryColor?: string;
  mode?: 'test' | 'production';
  sessionId?: string;
  onTestMessage?: (message: string, files?: File[]) => Promise<string>; // For frontend execution in test mode
  // Optional identifiers to allow test API fallback when chat is not registered
  workflowId?: string;
  userId?: string;
  // Optional snapshot of the workflow (for test fallback without Firestore)
  workflowSnapshot?: {
    id: string;
    name?: string;
    status?: string;
    nodes?: any[];
    connections?: any[];
  };

  // New props for message limits
  enableMessageLimit?: boolean;
  maxMessages?: number;
  messageLimitExceededAction?: 'auto_restart' | 'predefined_response' | 'disable_input';
  predefinedResponseMessage?: string;
}

export function ChatModal({
  isOpen,
  onClose,
  chatId,
  chatName = 'Assistant',
  welcomeMessage = 'Hello! How can I help you today?',
  placeholder = 'Type your message...',
  primaryColor = '#8B5CF6',
  mode = 'test',
  sessionId = 'default',
  onTestMessage,
  workflowId,
  userId,
  workflowSnapshot,
  enableMessageLimit = false,
  maxMessages = 10,
  messageLimitExceededAction = 'auto_restart',
  predefinedResponseMessage = 'You have reached the message limit for this chat. Please restart the conversation or open a new chat.',
}: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [messageCount, setMessageCount] = useState(0);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleRestartConversation = useCallback(() => {
    setMessages([]);
    setInputValue('');
    setIsLoading(false);
    setSelectedFiles([]);
    setIsInputDisabled(false);
    setMessageCount(0);
    // Generate a new session ID for a fresh start
    setCurrentSessionId(`test_session_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
    // Re-add welcome message
    if (welcomeMessage) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: welcomeMessage,
          timestamp: Date.now()
        }
      ]);
      setMessageCount(1); // Welcome message counts as 1
    }
  }, [welcomeMessage]);

  // Load chat history when modal opens
  useEffect(() => {
    if (isOpen && chatId) {
      loadChatHistory();
    }
  }, [isOpen, chatId]);

  const loadChatHistory = async () => {
    try {
      console.log('[ChatModal] Loading chat history...');
      console.log('[ChatModal] chatId:', chatId);
      console.log('[ChatModal] sessionId:', currentSessionId);

      const endpoint = mode === 'test'
        ? `/api/chat/test/${chatId}?sessionId=${currentSessionId}`
        : `/api/chat/prod/${chatId}?sessionId=${currentSessionId}`;

      console.log('[ChatModal] Fetching from:', endpoint);

      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        console.log('[ChatModal] Received data:', data);

        if (data.messages && data.messages.length > 0) {
          console.log('[ChatModal] Loaded', data.messages.length, 'messages from history');
          setMessages(data.messages);
          setMessageCount(data.messages.filter((msg: Message) => msg.role !== 'system').length);
        } else {
          // No history found, initialize with welcome message
          console.log('[ChatModal] No history found, showing welcome message');
          if (welcomeMessage) {
            setMessages([
              {
                id: 'welcome',
                role: 'assistant',
                content: welcomeMessage,
                timestamp: Date.now()
              }
            ]);
            setMessageCount(1);
          }
        }
      } else {
        console.error('[ChatModal] Failed to load history:', response.status);
        // On error, show welcome message
        if (welcomeMessage) {
          setMessages([
            {
              id: 'welcome',
              role: 'assistant',
              content: welcomeMessage,
              timestamp: Date.now()
            }
          ]);
          setMessageCount(1);
        }
      }
    } catch (error) {
      console.error('[ChatModal] Error loading chat history:', error);
      // On error, show welcome message
      if (welcomeMessage) {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: welcomeMessage,
            timestamp: Date.now()
          }
        ]);
        setMessageCount(1);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if ((!inputValue.trim() && selectedFiles.length === 0) || isLoading || isInputDisabled) return;

    // Validate chatId
    if (!chatId || chatId === 'not_generated') {
      console.error('[ChatModal] Invalid chatId:', chatId);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Chat is not properly configured. Please save the workflow first.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    // Check message limit BEFORE sending
    if (enableMessageLimit && messageCount >= maxMessages) {
      if (messageLimitExceededAction === 'auto_restart') {
        handleRestartConversation();
        const limitMessage: Message = {
          id: `limit_restart_${Date.now()}`,
          role: 'assistant',
          content: 'Message limit reached. Starting a new conversation.',
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, limitMessage]);
        return;
      } else if (messageLimitExceededAction === 'predefined_response') {
        const limitMessage: Message = {
          id: `limit_predefined_${Date.now()}`,
          role: 'assistant',
          content: predefinedResponseMessage,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, limitMessage]);
        setIsInputDisabled(true);
        return;
      } else if (messageLimitExceededAction === 'disable_input') {
        const limitMessage: Message = {
          id: `limit_disabled_${Date.now()}`,
          role: 'assistant',
          content: 'You have reached the message limit for this chat. Input is disabled.',
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, limitMessage]);
        setIsInputDisabled(true);
        return;
      }
    }

    const userMessage: Message = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: inputValue.trim() || '📎 Sent files',
      timestamp: Date.now()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setMessageCount(prev => prev + 1); // Increment message count for user message
    const messageText = inputValue.trim();
    const filesToSend = [...selectedFiles];
    setInputValue('');
    setSelectedFiles([]);
    setIsLoading(true);

    try {
      // Build history from current messages (excluding the just-added user message)
      const historyMessages = messages.slice(0, -1);
      const history = {
        user: historyMessages
          .filter(m => m.role === 'user')
          .map(m => m.content),
        agent: historyMessages
          .filter(m => m.role === 'assistant')
          .map(m => m.content)
      };

      // Always use backend execution for better credential handling and persistence
      {
        // Backend execution (both test and production mode)
        const endpoint = mode === 'test'
          ? `/api/chat/test/${chatId}`
          : `/api/chat/prod/${chatId}`;

        console.log('[ChatModal] Sending message to:', endpoint);
        console.log('[ChatModal] chatId:', chatId);
        console.log('[ChatModal] mode:', mode);
        console.log('[ChatModal] message:', messageText);
        console.log('[ChatModal] Sending history:', history);

        let response;

        // Send with files if any
        if (filesToSend.length > 0) {
          const formData = new FormData();
          formData.append('message', messageText);
          formData.append('sessionId', currentSessionId);
          formData.append('history', JSON.stringify(history));
          formData.append('metadata', JSON.stringify({ workflowId, userId, workflowSnapshot }));

          filesToSend.forEach(file => {
            formData.append('files', file);
          });

          response = await fetch(endpoint, {
            method: 'POST',
            body: formData
          });
        } else {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: messageText,
              sessionId: currentSessionId,
              history,
              metadata: { workflowId, userId, workflowSnapshot }
            })
          });
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[ChatModal] Server error response:', errorText);
          console.error('[ChatModal] Status:', response.status);
          console.error('[ChatModal] Endpoint:', endpoint);

          // Fallback: in test mode, when backend fails and we have a local test handler, run locally
          if (mode === 'test' && typeof onTestMessage === 'function') {
            console.warn('[ChatModal] Falling back to onTestMessage (local test execution)');
            const localResult = await onTestMessage(messageText, filesToSend.length ? filesToSend : undefined);
            const assistantMessage: Message = {
              id: `local_${Date.now()}`,
              role: 'assistant',
              content: localResult || 'No response received',
              timestamp: Date.now()
            };
            setMessages(prev => [...prev, assistantMessage]);
            return;
          }

          throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Add assistant response
        const assistantMessage: Message = {
          id: data.messageId || `msg_${Date.now()}`,
          role: 'assistant',
          content: data.message || 'No response received',
          files: data.files || [],
          timestamp: data.timestamp || Date.now()
        };

        setMessages(prev => [...prev, assistantMessage]);
        setMessageCount(prev => prev + 1); // Increment message count for assistant message
      }
    } catch (error) {
      console.error('[ChatModal] Error sending message:', error);

      // Add error message
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <Bot className="h-5 w-5" style={{ color: primaryColor }} />
              </div>
              <div>
                <DialogTitle className="text-lg">{chatName}</DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {mode === 'test' ? 'Test Mode' : 'Live Chat'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {enableMessageLimit && (
                <span className="text-sm text-muted-foreground">
                  {messageCount}/{maxMessages}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestartConversation}
                className="h-8"
              >
                <RotateCcw className="h-4 w-4 mr-2" /> Restart
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-6 py-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-secondary'
                      : ''
                  }`}
                  style={
                    message.role === 'assistant'
                      ? { backgroundColor: `${primaryColor}20` }
                      : undefined
                  }
                >
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot
                      className="h-4 w-4"
                      style={
                        message.role === 'assistant'
                          ? { color: primaryColor }
                          : undefined
                      }
                    />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`flex-1 max-w-[80%] ${
                    message.role === 'user' ? 'text-right' : ''
                  }`}
                >
                  <div
                    className={`inline-block px-4 py-2 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    {/* Display files if any */}
                    {message.files && message.files.length > 0 && (
                      <ChatFileRenderer files={message.files} primaryColor={primaryColor} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 px-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-3">
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <Bot className="h-4 w-4" style={{ color: primaryColor }} />
                </div>
                <div className="flex-1">
                  <div className="inline-block px-4 py-2 rounded-2xl bg-secondary">
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{ backgroundColor: primaryColor, animationDelay: '0ms' }}
                      />
                      <div
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{ backgroundColor: primaryColor, animationDelay: '150ms' }}
                      />
                      <div
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{ backgroundColor: primaryColor, animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="px-6 py-4 border-t">
          {/* Selected Files Display */}
          {selectedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg text-sm"
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="hover:bg-background/50 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* File Upload Button */}
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isInputDisabled}
              size="icon"
              variant="outline"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              disabled={isLoading || isInputDisabled}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || isInputDisabled || (!inputValue.trim() && selectedFiles.length === 0)}
              size="icon"
              style={{ backgroundColor: primaryColor }}
              className="hover:opacity-90"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
