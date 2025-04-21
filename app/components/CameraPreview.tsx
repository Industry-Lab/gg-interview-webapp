// app/components/CameraPreview.tsx
"use client";

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Video, VideoOff, Monitor, Camera } from "lucide-react";
import { GeminiWebSocket } from '../services/geminiWebSocket';
import { Base64 } from 'js-base64';
import { Avatar, AvatarImage, AvatarFallback } from "../../components/ui/avatar";

interface CameraPreviewProps {
  onTranscription: (text: string) => void;
  onMessage?: (text: string) => void; // Added prop for message handling
  startWithoutStreaming?: boolean;
  className?: string; // Added prop for styling
  onAudioLevelChange?: (level: number) => void; // Add prop for audio level updates
}

// Convert to forwardRef to expose geminiWsRef to parent components
const CameraPreview = forwardRef<{ geminiWsRef: React.RefObject<GeminiWebSocket | null> }, CameraPreviewProps>(function CameraPreview(
  { 
    onTranscription, 
    onMessage, 
    startWithoutStreaming = false,
    className = "",
    onAudioLevelChange
  }, 
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const geminiWsRef = useRef<GeminiWebSocket | null>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const [isAudioSetup, setIsAudioSetup] = useState(false);
  const setupInProgressRef = useRef(false);
  const [isWebSocketReady, setIsWebSocketReady] = useState(false);
  const imageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [outputAudioLevel, setOutputAudioLevel] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [inputMode, setInputMode] = useState<'camera' | 'screen'>('camera');
  const [selectedVoice, setSelectedVoice] = useState<string | undefined>(undefined);

  const cleanupAudio = useCallback(() => {
    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const cleanupWebSocket = useCallback(() => {
    if (geminiWsRef.current) {
      geminiWsRef.current.disconnect();
      geminiWsRef.current = null;
    }
  }, []);

  // Simplify sendAudioData to just send continuously
  const sendAudioData = (b64Data: string) => {
    if (!geminiWsRef.current) return;
    geminiWsRef.current.sendMediaChunk(b64Data, "audio/pcm");
  };

  const startStreaming = async (mode: 'camera' | 'screen') => {
    // Set flag to prevent multiple simultaneous attempts
    if (setupInProgressRef.current) {
      console.log('Setup already in progress, ignoring duplicate request');
      return;
    }
    
    setupInProgressRef.current = true;
    
    if (isStreaming && stream) {
      // Stop the current stream first
      stopStreaming();
    }
    
    try {
      let videoStream;
      
      if (mode === 'camera') {
        // Get camera stream
        videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      } else { // mode === 'screen'
        // Get screen sharing stream with simpler options to maximize compatibility
        videoStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        
        console.log('Screen access granted successfully');
        
        // Add event listener for when user stops screen sharing
        videoStream.getVideoTracks()[0].addEventListener('ended', () => {
          stopStreaming();
        });
      }

      // Get audio stream (same for both modes)
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        }
      });

      audioContextRef.current = new AudioContext({
        sampleRate: 16000,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = videoStream;
        videoRef.current.muted = true;
      }

      const combinedStream = new MediaStream([
        ...videoStream.getTracks(),
        ...audioStream.getTracks()
      ]);

      setStream(combinedStream);
      setInputMode(mode);
      setIsStreaming(true);
    } catch (err) {
      console.error(`Error accessing ${mode === 'camera' ? 'camera' : 'screen'} media:`, err);
      
      // Show a more user-friendly error message
      if (err instanceof DOMException) {
        if (mode === 'screen' && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
          alert('Screen sharing permission was denied. Please allow screen sharing to continue with the interview.');
        } else if (mode === 'camera' && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
          alert('Camera access was denied. Please allow camera access to continue with the interview.');
        } else {
          alert(`Error accessing media: ${err.message}. Please try again.`);
        }
      } else {
        // For non-DOMException errors
        alert(`An error occurred while accessing media. Please try again.`);
      }
      
      cleanupAudio();
    }
    
    // Reset setup flag when done (either success or failure)
    setupInProgressRef.current = false;
  };
  
  const stopStreaming = () => {
    setIsStreaming(false);
    cleanupWebSocket();
    cleanupAudio();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
  };

  const toggleCamera = async () => {
    if (isStreaming) {
      stopStreaming();
    } else {
      await startStreaming('camera');
    }
  };
  
  const toggleScreenSharing = async () => {
    if (isStreaming && inputMode === 'screen') {
      stopStreaming();
    } else {
      await startStreaming('screen');
    }
  };

  // Create a function to reconnect the WebSocket
  const reconnectWebSocket = useCallback(async () => {
    console.log('%c RECONNECTING WEBSOCKET %c', 'background: #9900cc; color: white; font-weight: bold; font-size: 14px; padding: 3px;', '');
    
    // First cleanup any existing connection
    cleanupWebSocket();
    setIsWebSocketReady(false);
    setConnectionStatus('connecting');
    
    // Small delay to ensure cleanup completes
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Create a new WebSocket connection with all required parameters
    geminiWsRef.current = new GeminiWebSocket(
      // onMessage
      (text) => {
        console.log("Received from Gemini:", text);
        if (onMessage) {
          onMessage(text);
        }
      },
      // onSetupComplete
      () => {
        console.log("[Camera] WebSocket setup complete after reconnection");
        setIsWebSocketReady(true);
        setConnectionStatus('connected');
      },
      // onPlayingStateChange
      (isPlaying: boolean) => {
        // Update UI or state based on playing state if needed
      },
      // onAudioLevelChange
      (level: number) => {
        setOutputAudioLevel(level);
        setIsModelSpeaking(level > 0.01);
        if (onAudioLevelChange) {
          onAudioLevelChange(level);
        }
      },
      // onTranscription
      (text: string) => {
        onTranscription(text);
      }
    );
    
    // Connect and wait for connection to establish
    geminiWsRef.current.connect();
    
    // Wait for connection to be established (max 5 seconds)
    for (let i = 0; i < 50; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (geminiWsRef.current && geminiWsRef.current.isReadyToSend()) {
        console.log('%c WEBSOCKET RECONNECTED SUCCESSFULLY %c', 'background: #33cc33; color: white; font-weight: bold; font-size: 14px; padding: 3px;', '');
        return true;
      }
    }
    
    console.error('WebSocket reconnection failed after timeout');
    return false;
  }, [cleanupWebSocket, onMessage, onTranscription, selectedVoice]);

  // Expose geminiWsRef and reconnectWebSocket to parent component
  useImperativeHandle(ref, () => ({
    geminiWsRef,
    reconnectWebSocket
  }), [reconnectWebSocket]);
  
  // Auto-start screen sharing when component mounts, but only once
  useEffect(() => {
    // Prevent duplicate screen sharing requests by tracking if we've already requested
    const hasRequestedScreenSharing = sessionStorage.getItem('hasRequestedScreenSharing');
    
    // Only request screen sharing if:
    // 1. We're not already streaming
    // 2. We don't have an active setup in progress
    // 3. We haven't already requested in this session
    if (!isStreaming && !setupInProgressRef.current && !hasRequestedScreenSharing) {
      // Set flag to prevent duplicate requests
      sessionStorage.setItem('hasRequestedScreenSharing', 'true');
      console.log('Requesting screen sharing (first time)');
      
      // Add a small delay to ensure UI has fully rendered
      setTimeout(() => {
        startStreaming('screen');
      }, 500);
    }
    
    // Clear the flag when component is unmounted
    return () => {
      // Don't clear if we're just hiding the component temporarily
      if (!startWithoutStreaming) {
        sessionStorage.removeItem('hasRequestedScreenSharing');
      }
    };
  }, []);
  
  // Initialize WebSocket connection
  useEffect(() => {
    if (!isStreaming) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');
    geminiWsRef.current = new GeminiWebSocket(
      // onMessage callback
      (text) => {
        console.log("Received from Gemini:", text);
        // Forward message to parent if handler provided
        if (onMessage) {
          onMessage(text);
        }
      },
      // onSetupComplete callback
      () => {
        console.log("[Camera] WebSocket setup complete, starting media capture");
        setIsWebSocketReady(true);
        setConnectionStatus('connected');
      },
      // onPlayingStateChange callback
      (isPlaying) => {
        setIsModelSpeaking(isPlaying);
      },
      // onAudioLevelChange callback
      (level) => {
        setOutputAudioLevel(level);
        if (onAudioLevelChange) {
          onAudioLevelChange(level);
        }
      },
      // onTranscription callback
      onTranscription
    );
    geminiWsRef.current.connect();

    return () => {
      if (imageIntervalRef.current) {
        clearInterval(imageIntervalRef.current);
        imageIntervalRef.current = null;
      }
      cleanupWebSocket();
      setIsWebSocketReady(false);
      setConnectionStatus('disconnected');
    };
  }, [isStreaming, onTranscription, cleanupWebSocket]);

  // Start image capture only after WebSocket is ready
  useEffect(() => {
    if (!isStreaming || !isWebSocketReady) return;

    console.log("[Camera] Starting image capture interval");
    imageIntervalRef.current = setInterval(captureAndSendImage, 1000);

    return () => {
      if (imageIntervalRef.current) {
        clearInterval(imageIntervalRef.current);
        imageIntervalRef.current = null;
      }
    };
  }, [isStreaming, isWebSocketReady]);

  // Update audio processing setup
  useEffect(() => {
    if (!isStreaming || !stream || !audioContextRef.current || 
        !isWebSocketReady || isAudioSetup || setupInProgressRef.current) return;

    let isActive = true;
    setupInProgressRef.current = true;

    const setupAudioProcessing = async () => {
      try {
        const ctx = audioContextRef.current;
        if (!ctx || ctx.state === 'closed' || !isActive) {
          setupInProgressRef.current = false;
          return;
        }

        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        await ctx.audioWorklet.addModule('/worklets/audio-processor.js');

        if (!isActive) {
          setupInProgressRef.current = false;
          return;
        }

        audioWorkletNodeRef.current = new AudioWorkletNode(ctx, 'audio-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          processorOptions: {
            sampleRate: 16000,
            bufferSize: 4096,  // Larger buffer size like original
          },
          channelCount: 1,
          channelCountMode: 'explicit',
          channelInterpretation: 'speakers'
        });

        const source = ctx.createMediaStreamSource(stream);
        audioWorkletNodeRef.current.port.onmessage = (event) => {
          if (!isActive || isModelSpeaking) return;
          const { pcmData, level } = event.data;
          setAudioLevel(level);
          // Pass audio level back to parent component
          if (onAudioLevelChange) {
            onAudioLevelChange(level);
          }

          const pcmArray = new Uint8Array(pcmData);
          const b64Data = Base64.fromUint8Array(pcmArray);
          sendAudioData(b64Data);
        };

        source.connect(audioWorkletNodeRef.current);
        setIsAudioSetup(true);
        setupInProgressRef.current = false;

        return () => {
          source.disconnect();
          if (audioWorkletNodeRef.current) {
            audioWorkletNodeRef.current.disconnect();
          }
          setIsAudioSetup(false);
        };
      } catch (error) {
        if (isActive) {
          cleanupAudio();
          setIsAudioSetup(false);
        }
        setupInProgressRef.current = false;
      }
    };

    console.log("[Camera] Starting audio processing setup");
    setupAudioProcessing();

    return () => {
      isActive = false;
      setIsAudioSetup(false);
      setupInProgressRef.current = false;
      if (audioWorkletNodeRef.current) {
        audioWorkletNodeRef.current.disconnect();
        audioWorkletNodeRef.current = null;
      }
    };
  }, [isStreaming, stream, isWebSocketReady, isModelSpeaking]);

  // Capture and send image
  const captureAndSendImage = () => {
    if (!videoRef.current || !videoCanvasRef.current || !geminiWsRef.current) return;

    const canvas = videoCanvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas size to match video
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    // Draw video frame to canvas
    context.drawImage(videoRef.current, 0, 0);

    // Convert to base64 and send
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    const b64Data = imageData.split(',')[1];
    geminiWsRef.current.sendMediaChunk(b64Data, "image/jpeg");
  };

  // Handle voice selection change
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedVoice(value === "default" ? undefined : value);
  };
  
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse"></div>
        </div>
      </div>
      
      <div className="relative flex-1 rounded overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain bg-black/20"
        />
        
        {/* Connection Status Overlay */}
        {isStreaming && connectionStatus !== 'connected' && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center space-y-2 bg-card/50 p-4 rounded border border-muted backdrop-blur-sm max-w-[80%]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-foreground font-medium text-sm">
                {connectionStatus === 'connecting' ? 'Connecting to Gemini...' : 'Disconnected'}
              </p>
              <p className="text-foreground/70 text-xs">
                Please wait while we establish a connection
              </p>
            </div>
          </div>
        )}
        
        {/* Stream Source Indicator */}
        {isStreaming && (
          <div className="absolute top-2 right-2 bg-card/80 px-2 py-1 rounded text-foreground text-xs backdrop-blur-sm border border-muted">
            {inputMode === 'camera' ? (
              <div className="flex items-center gap-1.5">
                <Camera className="h-3 w-3 text-primary" /> 
                <span className="font-medium">Camera</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Monitor className="h-3 w-3 text-primary" /> 
                <span className="font-medium">Screen</span>
              </div>
            )}
          </div>
        )}

        {/* Buttons are hidden as requested by user */}
      </div>
      <canvas ref={videoCanvasRef} className="hidden" />
      
      {/* Ultra-compact audio indicators and connection status */}
      {isStreaming && (
        <div className="mt-1">
          <div className="flex items-center gap-1 mb-0.5 text-[10px]">
            <div className={`h-1.5 w-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
            <span className={`${connectionStatus === 'connected' ? 'text-green-400' : connectionStatus === 'connecting' ? 'text-amber-400' : 'text-red-400'}`}>
              {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting' : 'Disconnected'}
            </span>
            <span className="text-gray-500 mx-0.5">|</span>
            <span className="text-xs text-foreground/60">Audio:</span>
            <div className="w-16 h-1 bg-secondary/30 rounded-full overflow-hidden">
              <div className="h-full bg-primary/80 transition-all" style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}/>
            </div>
            {isModelSpeaking && <span className="text-green-400 ml-0.5">AI speaking</span>}
          </div>
        </div>
      )}
    </div>
  );
});

export default CameraPreview;
