"use client";

import React, { useState, useEffect, useRef } from 'react';
import { GeminiTextService } from '../services/geminiTextService';
import { LeetCodeProblem } from '../models/leetcode';

interface GeminiTextChatProps {
  problem?: LeetCodeProblem;
}

export default function GeminiTextChat({ problem }: GeminiTextChatProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const geminiTextServiceRef = useRef<GeminiTextService | null>(null);

  // Initialize the GeminiTextService
  useEffect(() => {
    try {
      // Create the GeminiTextService instance
      const handleMessage = (text: string) => {
        console.log('Received message from Gemini:', text.substring(0, 50) + '...');
        setMessages(prev => [...prev, { role: 'assistant', content: text }]);
        setIsLoading(false);
      };

      const handleSetupComplete = () => {
        console.log('Gemini Text Service setup complete');
        setIsConnected(true);
        setIsLoading(false);
        
        // Add initial system message
        setMessages([{ 
          role: 'assistant', 
          content: 'Connected to Gemini. How can I help you with coding problems today?' 
        }]);
        
        // If a problem is provided, send it to Gemini
        if (problem) {
          console.log('Problem provided on setup complete, sending to Gemini:', problem.title);
          setTimeout(() => {
            try {
              geminiTextServiceRef.current?.sendProblemContext(problem);
              setIsLoading(true);
              setMessages(prev => [...prev, { 
                role: 'user', 
                content: `Let's discuss this problem: ${problem.title}` 
              }]);
            } catch (error) {
              console.error('Error sending problem context:', error);
              setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'Sorry, I had trouble processing that problem. Please try sending a message directly.' 
              }]);
              setIsLoading(false);
            }
          }, 1500); // Slightly longer delay to ensure connection is fully established
        }
      };

      const handleError = (error: Error) => {
        console.error('Gemini Text Service error:', error);
        setIsConnected(false);
        setIsLoading(false);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Connection error: ' + error.message + '. Please try refreshing the page.' 
        }]);
      };

      console.log('Creating new GeminiTextService instance');
      geminiTextServiceRef.current = new GeminiTextService(handleMessage, handleSetupComplete, handleError);
      geminiTextServiceRef.current.connect();
      setIsLoading(true);

      // Cleanup on unmount
      return () => {
        console.log('Cleaning up GeminiTextService');
        if (geminiTextServiceRef.current) {
          geminiTextServiceRef.current.disconnect();
        }
      };
    } catch (error) {
      console.error('Error initializing GeminiTextService:', error);
      setIsConnected(false);
      setIsLoading(false);
      setMessages([{ 
        role: 'assistant', 
        content: 'Failed to initialize Gemini service. Please try refreshing the page.' 
      }]);
    }
  }, []);

  // Handle problem change
  useEffect(() => {
    if (problem && geminiTextServiceRef.current && isConnected) {
      console.log('Problem changed, sending to Gemini:', problem.title);
      geminiTextServiceRef.current.sendProblemContext(problem);
      setIsLoading(true);
      setMessages(prev => [...prev, { 
        role: 'user', 
        content: `Let's discuss this problem: ${problem.title}` 
      }]);
    }
  }, [problem?.id, isConnected]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = () => {
    if (!input.trim() || !isConnected) return;

    // Add user message to the chat
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    
    // Send message to Gemini
    if (geminiTextServiceRef.current) {
      geminiTextServiceRef.current.sendTextMessage(input);
      setIsLoading(true);
    }
    
    // Clear input
    setInput('');
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white rounded-lg overflow-hidden border border-gray-700">
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Gemini Text Chat</h2>
        <p className="text-sm text-gray-400">
          {isConnected 
            ? 'Connected to Gemini' 
            : 'Connecting to Gemini...'}
        </p>
      </div>
      
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-white'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 p-3 rounded-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex">
          <textarea
            className="flex-1 bg-gray-700 text-white rounded-l-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type your message..."
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={!isConnected}
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSendMessage}
            disabled={!isConnected || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
