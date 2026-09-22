"use client";

import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatModal } from './chat-modal';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ChatFABProps {
  chatId: string;
  chatName?: string;
  welcomeMessage?: string;
  placeholder?: string;
  primaryColor?: string;
  sessionId?: string;
  // Optional test execution fallbacks/metadata
  workflowId?: string;
  userId?: string;
  workflowSnapshot?: {
    id: string;
    name?: string;
    status?: string;
    nodes?: any[];
    connections?: any[];
  };
  onTestMessage?: (message: string, files?: File[]) => Promise<string>;
}

export function ChatFAB({
  chatId,
  chatName = 'Assistant',
  welcomeMessage = 'Hello! How can I help you today?',
  placeholder = 'Type your message...',
  primaryColor = '#8B5CF6',
  sessionId = 'default',
  workflowId,
  userId,
  workflowSnapshot,
  onTestMessage,
}: ChatFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasBottomNavbar, setHasBottomNavbar] = useState(false);

  // Detectar si hay un bottom navbar flotante en la página
  useEffect(() => {
    const checkBottomNavbar = () => {
      // Buscar cualquier navbar en la parte inferior que pueda colisionar con el FAB
      const navbars = document.querySelectorAll('.fixed[class*="bottom"], [class*="fixed bottom"]');
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Verificar si alguno de los navbars está visible y en posición baja
      let hasVisibleNavbar = false;
      navbars.forEach((navbar) => {
        const rect = navbar.getBoundingClientRect();
        // Si el navbar está en los últimos 120px de la pantalla y es visible
        // y no es el propio FAB
        if (rect.top > windowHeight - 120 &&
            rect.height > 0 &&
            rect.width > 100 && // Asegurarse de que sea un navbar, no un botón
            !navbar.querySelector('.rounded-full')) { // Excluir el FAB mismo
          hasVisibleNavbar = true;
        }
      });

      // Activar solo en móvil/tablet
      setHasBottomNavbar(hasVisibleNavbar && windowWidth < 768);
    };

    // Delay inicial para asegurar que el DOM esté listo
    const timeoutId = setTimeout(checkBottomNavbar, 100);

    // Usar MutationObserver para detectar cuando se agrega/quita el navbar
    const observer = new MutationObserver(checkBottomNavbar);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });

    window.addEventListener('resize', checkBottomNavbar);
    window.addEventListener('scroll', checkBottomNavbar);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      window.removeEventListener('resize', checkBottomNavbar);
      window.removeEventListener('scroll', checkBottomNavbar);
    };
  }, []);

  if (!chatId || chatId === 'not_generated') {
    return null;
  }

  return (
    <>
      {/* Floating Action Button - Solo visible en desktop (>= 768px) */}
      <AnimatePresence>
        <motion.div
          className="hidden md:block fixed bottom-6 right-6 z-50"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
            style={{
              backgroundColor: primaryColor,
              color: 'white'
            }}
            onClick={() => setIsOpen(true)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <motion.div
              animate={{
                rotate: isHovered ? 12 : 0,
                scale: isHovered ? 1.1 : 1
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            >
              <MessageCircle className="h-6 w-6" />
            </motion.div>
          </Button>

          {/* Tooltip */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap shadow-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                Test Chat
                <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pulse Animation */}
          {!isOpen && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                backgroundColor: primaryColor,
                opacity: 0.3
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0, 0.3]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Chat Modal */}
      <ChatModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        chatId={chatId}
        chatName={chatName}
        welcomeMessage={welcomeMessage}
        placeholder={placeholder}
        primaryColor={primaryColor}
        mode="test"
        sessionId={sessionId}
        workflowId={workflowId}
        userId={userId}
        workflowSnapshot={workflowSnapshot}
        onTestMessage={onTestMessage}
      />
    </>
  );
}
