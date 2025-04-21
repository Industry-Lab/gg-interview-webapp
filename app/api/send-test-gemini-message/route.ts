import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const HOST = "generativelanguage.googleapis.com";
const WS_URL = `wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

// This is a simple API endpoint that sends a test message to Gemini
// for testing audio playback
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    // Create WebSocket connection
    // Note: In a real implementation, you would want to manage this connection
    // more carefully, as opening a new WebSocket for each request is inefficient
    const ws = new WebSocket(WS_URL);
    
    return new Promise((resolve, reject) => {
      ws.onopen = () => {
        // First send the setup
        const setupMessage = {
          setup: {
            model: "models/gemini-2.0-flash-exp",
            generation_config: {
              response_modalities: ["AUDIO"]
            }
          }
        };
        ws.send(JSON.stringify(setupMessage));
        
        // Listen for the setup complete event
        ws.onmessage = async (event) => {
          try {
            let messageText;
            if (event.data instanceof Blob) {
              const arrayBuffer = await event.data.arrayBuffer();
              const bytes = new Uint8Array(arrayBuffer);
              messageText = new TextDecoder('utf-8').decode(bytes);
            } else {
              messageText = event.data;
            }
            
            const messageData = JSON.parse(messageText);
            
            if (messageData.setupComplete) {
              // Setup is complete, send the actual message
              const testMessage = {
                message: {
                  role: "system",
                  content: message || "Hello! This is a test message from the API. Please respond with audio if possible."
                }
              };
              
              ws.send(JSON.stringify(testMessage));
              
              // Return success
              resolve(NextResponse.json({ 
                success: true, 
                message: "Test message sent" 
              }));
              
              // We don't close the connection here because we want Gemini to respond,
              // but in a real world scenario you'd want to manage this more carefully
            }
          } catch (error) {
            console.error("Error processing WebSocket message:", error);
            ws.close();
            reject(NextResponse.json({ 
              success: false, 
              error: "Error processing WebSocket message" 
            }, { status: 500 }));
          }
        };
      };
      
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        reject(NextResponse.json({ 
          success: false, 
          error: "WebSocket connection error" 
        }, { status: 500 }));
      };
      
      // Set a timeout for the connection
      setTimeout(() => {
        if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
          ws.close();
          resolve(NextResponse.json({ 
            success: true, 
            message: "Message sent (timeout reached but WebSocket still open)" 
          }));
        }
      }, 5000);
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to process request" 
    }, { status: 500 });
  }
}
