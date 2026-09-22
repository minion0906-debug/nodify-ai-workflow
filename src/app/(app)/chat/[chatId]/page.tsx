"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Bot, User, MessageCircle, Paperclip, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatFileRenderer } from '@/components/workflow/chat-file-renderer';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  files?: any[];
}

interface ChatConfig {
  name: string;
  welcomeMessage: string;
  placeholder: string;
  primaryColor: string;
  theme: 'light' | 'dark' | 'auto';
}

export default function ChatPage() {
  const params = useParams();
  const chatId = params.chatId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [chatConfig, setChatConfig] = useState<ChatConfig>({
    name: 'Assistant',
    welcomeMessage: 'Hello! How can I help you today?',
    placeholder: 'Type your message...',
    primaryColor: '#8B5CF6',
    theme: 'light'
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat with welcome message
  useEffect(() => {
    if (!isInitialized && chatConfig.welcomeMessage) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: chatConfig.welcomeMessage,
          timestamp: Date.now()
        }
      ]);
      setIsInitialized(true);
    }
  }, [isInitialized, chatConfig.welcomeMessage]);

  // Apply theme
  useEffect(() => {
    if (chatConfig.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (chatConfig.theme === 'light') {
      document.documentElement.classList.remove('dark');
    }
    // 'auto' uses system preference (default behavior)
  }, [chatConfig.theme]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if ((!inputValue.trim() && selectedFiles.length === 0) || isLoading) return;

    const userMessage: Message = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: inputValue.trim() || '📎 Sent files',
      timestamp: Date.now()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    const messageText = inputValue.trim();
    const filesToSend = [...selectedFiles];
    setInputValue('');
    setSelectedFiles([]);
    setIsLoading(true);

    try {
      let response;

      // Send with files if any
      if (filesToSend.length > 0) {
        const formData = new FormData();
        formData.append('message', messageText);
        formData.append('sessionId', sessionId);
        formData.append('metadata', JSON.stringify({}));

        filesToSend.forEach(file => {
          formData.append('files', file);
        });

        response = await fetch(`/api/chat/prod/${chatId}`, {
          method: 'POST',
          body: formData
        });
      } else {
        response = await fetch(`/api/chat/prod/${chatId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: messageText,
            sessionId,
            metadata: {}
          })
        });
      }

      if (!response.ok) {
        throw new Error('Failed to send message');
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
    } catch (error) {
      console.error('[ChatPage] Error sending message:', error);

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
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Header */}
      <header
        className="flex-shrink-0 border-b px-6 py-4"
        style={{
          borderBottomColor: `${chatConfig.primaryColor}20`
        }}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <motion.div
            className="p-3 rounded-xl shadow-sm"
            style={{ backgroundColor: `${chatConfig.primaryColor}15` }}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Bot className="h-6 w-6" style={{ color: chatConfig.primaryColor }} />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold">{chatConfig.name}</h1>
            <p className="text-sm text-muted-foreground">Online</p>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-6 py-6" ref={scrollAreaRef}>
        <div className="max-w-4xl mx-auto space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`flex gap-4 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                    message.role === 'user'
                      ? 'bg-secondary'
                      : ''
                  }`}
                  style={
                    message.role === 'assistant'
                      ? { backgroundColor: `${chatConfig.primaryColor}20` }
                      : undefined
                  }
                >
                  {message.role === 'user' ? (
                    <User className="h-5 w-5" />
                  ) : (
                    <Bot
                      className="h-5 w-5"
                      style={
                        message.role === 'assistant'
                          ? { color: chatConfig.primaryColor }
                          : undefined
                      }
                    />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`flex-1 max-w-[75%] ${
                    message.role === 'user' ? 'text-right' : ''
                  }`}
                >
                  <motion.div
                    className={`inline-block px-5 py-3 rounded-2xl shadow-sm ${
                      message.role === 'user'
                        ? 'text-primary-foreground'
                        : 'bg-secondary'
                    }`}
                    style={
                      message.role === 'user'
                        ? { backgroundColor: chatConfig.primaryColor }
                        : undefined
                    }
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    {/* Display files if any */}
                    {message.files && message.files.length > 0 && (
                      <ChatFileRenderer files={message.files} primaryColor={chatConfig.primaryColor} />
                    )}
                  </motion.div>
                  <p className="text-xs text-muted-foreground mt-2 px-2">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-4"
            >
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
                style={{ backgroundColor: `${chatConfig.primaryColor}20` }}
              >
                <Bot className="h-5 w-5" style={{ color: chatConfig.primaryColor }} />
              </div>
              <div className="flex-1">
                <div className="inline-block px-5 py-3 rounded-2xl bg-secondary shadow-sm">
                  <div className="flex gap-1.5">
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: chatConfig.primaryColor }}
                      animate={{ y: [0, -8, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 0
                      }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: chatConfig.primaryColor }}
                      animate={{ y: [0, -8, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 0.2
                      }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: chatConfig.primaryColor }}
                      animate={{ y: [0, -8, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 0.4
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t px-6 py-4 bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          {/* Selected Files Display */}
          {selectedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 flex flex-wrap gap-2"
            >
              {selectedFiles.map((file, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg text-sm shadow-sm"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  <span className="max-w-[150px] truncate font-medium">{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="hover:bg-background/50 rounded-full p-1 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}

          <div className="flex gap-3">
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
              disabled={isLoading}
              size="lg"
              variant="outline"
              className="h-12 px-4"
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={chatConfig.placeholder}
              disabled={isLoading}
              className="flex-1 h-12 text-base"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || (!inputValue.trim() && selectedFiles.length === 0)}
              size="lg"
              className="h-12 px-6"
              style={{ backgroundColor: chatConfig.primaryColor }}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Powered by{' '}
            <a
              href="https://nodify.app"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:underline"
              style={{ color: chatConfig.primaryColor }}
            >
              Nodify
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
