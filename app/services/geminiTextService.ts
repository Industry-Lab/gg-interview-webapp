import { Base64 } from 'js-base64';

// Define the model and API key for Gemini API
const MODEL = "models/gemini-2.0-flash-exp";
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const HOST = "generativelanguage.googleapis.com";
const WS_URL = `wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

// Import the LeetCodeProblem interface from models
import { LeetCodeProblem } from '../models/leetcode';

export class GeminiTextService {
    private ws: WebSocket | null = null;
    private isConnected: boolean = false;
    private isSetupComplete: boolean = false;
    private wsInstanceId: string = '';
    private solutionsCache: Record<string, any[]> = {};

    constructor(
        private onMessageCallback: (text: string) => void,
        private onSetupCompleteCallback: () => void,
        private errorCallback?: (error: Error) => void
    ) {
        this.wsInstanceId = `text_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
        console.log(`[TextService:${this.wsInstanceId}] Initialized`);
    }

    connect() {
        // Don't reconnect if already connecting or connected
        if (this.ws) {
            if (this.ws.readyState === WebSocket.OPEN) {
                console.log(`[TextService:${this.wsInstanceId}] Already connected`);
                return;
            }
            if (this.ws.readyState === WebSocket.CONNECTING) {
                console.log(`[TextService:${this.wsInstanceId}] Already connecting, waiting...`);
                return;
            }
        }

        console.log(`[TextService:${this.wsInstanceId}] Initiating new connection to`, WS_URL);
        this.isConnected = false;
        this.isSetupComplete = false;

        try {
            this.ws = new WebSocket(WS_URL);
        } catch (error) {
            console.error(`[TextService:${this.wsInstanceId}] Error connecting to WebSocket:`, error);
            if (this.errorCallback && error instanceof Error) {
                this.errorCallback(error);
            } else if (this.errorCallback) {
                this.errorCallback(new Error('Failed to connect to Gemini service'));
            }
            // Try to reconnect after a delay
            setTimeout(() => this.connect(), 3000);
            return;
        }

        // Handle connection opening
        if (this.ws) {
            this.ws.onopen = () => {
                console.log(`[TextService:${this.wsInstanceId}] WebSocket connected`);
                this.isConnected = true;
                this.sendInitialSetup();
            };
        }

        // Handle connection error
        if (this.ws) {
            this.ws.onerror = (error) => {
                console.error(`[TextService:${this.wsInstanceId}] WebSocket error:`, error);
                if (this.errorCallback) {
                    this.errorCallback(new Error('WebSocket connection error'));
                }
                // Try to reconnect after a delay
                setTimeout(() => this.connect(), 3000);
            };
        }

        // Handle connection close
        if (this.ws) {
            this.ws.onclose = (event) => {
                console.log(`[TextService:${this.wsInstanceId}] WebSocket closed:`, event.code, event.reason);
                this.isConnected = false;
                this.isSetupComplete = false;
                
                // Attempt to reconnect if not a normal closure
                if (event.code !== 1000) {
                    setTimeout(() => this.connect(), 3000);
                }
            };
        }

        // Handle incoming messages
        if (this.ws) {
            this.ws.onmessage = async (event) => {
                try {
                    let messageText: string;
                    if (event.data instanceof Blob) {
                        const arrayBuffer = await event.data.arrayBuffer();
                        const bytes = new Uint8Array(arrayBuffer);
                        messageText = new TextDecoder('utf-8').decode(bytes);
                    } else {
                        messageText = event.data;
                    }

                    // Parse the message to check for setup complete before full processing
                    try {
                        const data = JSON.parse(messageText);

                        // Check for the setup_complete field FIRST
                        if (data.setupComplete ||
                            (data.serverMetadata && data.serverMetadata.setupComplete)) {
                            console.log(`[TextService:${this.wsInstanceId}] ✅ SETUP COMPLETE detected!`);
                            this.isSetupComplete = true;
                            if (this.onSetupCompleteCallback) {
                                this.onSetupCompleteCallback();
                            }
                        }
                    } catch (e) {
                        console.error(`[TextService:${this.wsInstanceId}] Error parsing setup message:`, e);
                    }

                    // Continue with regular message processing
                    await this.handleMessage(messageText);
                } catch (error) {
                    console.error(`[TextService:${this.wsInstanceId}] Error processing message:`, error);
                }
            };
        }
    }

    // Method to handle parsing and processing incoming WebSocket messages
    private async handleMessage(message: string): Promise<void> {
        try {
            const messageData = JSON.parse(message);

            // Log the full message data for debugging
            console.log(`[TextService:${this.wsInstanceId}] Raw message data:`, messageData);

            // Check for setup completion messages in different formats
            if (messageData.setupComplete ||
                (messageData.serverMetadata && messageData.serverMetadata.setupComplete)) {
                console.log(`[TextService:${this.wsInstanceId}] Setup complete message detected in handleMessage!`);
                this.isSetupComplete = true;
                if (this.onSetupCompleteCallback) {
                    try {
                        this.onSetupCompleteCallback();
                    } catch (error) {
                        console.error(`[TextService:${this.wsInstanceId}] Error in onSetupCompleteCallback:`, error);
                    }
                }
                return;
            }

            // Check for text content that should be sent to the message callback
            if (messageData.serverContent?.modelTurn?.parts) {
                console.log(`[TextService:${this.wsInstanceId}] Model turn parts detected:`, messageData.serverContent.modelTurn.parts);
                const parts = messageData.serverContent.modelTurn.parts;

                // Process text content
                for (const part of parts) {
                    if (part.text) {
                        console.log(`%c[TextService:${this.wsInstanceId}] TEXT RESPONSE:`, 'background: #4285F4; color: white; padding: 2px 4px; border-radius: 2px;');
                        console.log(`%c${part.text}`, 'color: #4285F4; font-weight: bold;');
                        
                        if (this.onMessageCallback) {
                            try {
                                this.onMessageCallback(part.text);
                            } catch (error) {
                                console.error(`[TextService:${this.wsInstanceId}] Error in onMessageCallback:`, error);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[TextService:${this.wsInstanceId}] Error handling message:`, error);
        }
    }

    // Send a text message to Gemini
    public sendTextMessage(text: string): void {
        if (!this.isReadyToSend()) {
            console.warn(`[TextService:${this.wsInstanceId}] Cannot send message: WebSocket not ready`);
            return;
        }

        try {
            const message = {
                clientContent: {
                    turns: [
                        {
                            parts: [{
                                text: text
                            }],
                        },
                    ],
                    turnComplete: true
                }
            };
            
            console.log(`[TextService:${this.wsInstanceId}] Sending text message to Gemini:`, text);
            this.ws!.send(JSON.stringify(message));
        } catch (error) {
            console.error(`[TextService:${this.wsInstanceId}] Error sending text message:`, error);
        }
    }

    // Send a problem context to Gemini
    public sendProblemContext(problem: LeetCodeProblem): void {
        console.log(`[TextService:${this.wsInstanceId}] Attempting to send problem context:`, problem);
        
        // If not ready to send, attempt to connect and retry after a delay
        if (!this.isReadyToSend()) {
            console.warn(`[TextService:${this.wsInstanceId}] WebSocket not ready, attempting to connect...`);
            this.connect();
            
            // Retry after a delay
            setTimeout(() => {
                if (this.isReadyToSend()) {
                    this._sendProblemContextInternal(problem);
                } else {
                    console.error(`[TextService:${this.wsInstanceId}] Failed to connect, cannot send problem context`);
                }
            }, 2000);
            return;
        }
        
        this._sendProblemContextInternal(problem);
    }
    
    // Internal method to handle the actual sending of problem context
    private _sendProblemContextInternal(problem: LeetCodeProblem): void {
        try {
            // Strip HTML tags from description and examples for better text processing
            // Use content or description field, whichever is available
            const problemText = problem.description || problem.content || '';
            const cleanDescription = this.stripHtmlTags(problemText);
            
            // Handle examples - use exampleTestcases from the LeetCodeProblem interface
            const examplesText = problem.exampleTestcases || '';
            const cleanExamples = examplesText ? this.stripHtmlTags(examplesText) : '';
            
            // Build a formatted problem description with all available information
            let formattedProblem = `I want to discuss the following LeetCode problem:\n\n`;
            formattedProblem += `Title: ${problem.title}\n`;
            formattedProblem += `Difficulty: ${problem.difficulty || 'Unknown'}\n\n`;
            
            if (cleanDescription) {
                formattedProblem += `Description:\n${cleanDescription}\n\n`;
            }
            
            if (cleanExamples) {
                formattedProblem += `Examples:\n${cleanExamples}\n\n`;
            }
            
            if (problem.constraints && problem.constraints.length > 0) {
                formattedProblem += `Constraints:\n${problem.constraints.join('\n')}\n\n`;
            }
            
            if (problem.hints && problem.hints.length > 0) {
                formattedProblem += `Hints:\n${problem.hints.join('\n')}\n\n`;
            }
            
            const message = {
                clientContent: {
                    turns: [
                        {
                            parts: [{
                                text: formattedProblem
                            }],
                        },
                    ],
                    turnComplete: true
                }
            };
            
            console.log(`[TextService:${this.wsInstanceId}] Sending problem context to Gemini:`, problem.title);
            this.ws!.send(JSON.stringify(message));
        } catch (error) {
            console.error(`[TextService:${this.wsInstanceId}] Error sending problem context:`, error);
        }
    }
    
    // Helper method to strip HTML tags from text
    private stripHtmlTags(html: string): string {
        // Create a temporary div element
        if (typeof document !== 'undefined') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            return tempDiv.textContent || tempDiv.innerText || '';
        } else {
            // Simple regex-based fallback for non-browser environments
            return html.replace(/<[^>]*>?/gm, '');
        }
    }

    // Helper to check if WebSocket is ready to send messages
    public isReadyToSend(): boolean {
        const ready = !!this.ws && this.ws.readyState === WebSocket.OPEN && this.isSetupComplete;
        console.log(`[TextService:${this.wsInstanceId}] Ready check: WS=${!!this.ws}, Open=${this.ws?.readyState === WebSocket.OPEN}, SetupComplete=${this.isSetupComplete}`);
        return ready;
    }

    // Public method to disconnect the WebSocket
    public disconnect(): void {
        console.log(`[TextService:${this.wsInstanceId}] Disconnecting...`);
        this.isSetupComplete = false;
        if (this.ws) {
            this.ws.close(1000, "Intentional disconnect");
            this.ws = null;
        }
        this.isConnected = false;
    }

    // Get the current WebSocket connection state as a string
    public getConnectionState(): string {
        if (!this.ws) return 'NOT_INITIALIZED';
        
        switch (this.ws.readyState) {
            case WebSocket.CONNECTING:
                return 'CONNECTING';
            case WebSocket.OPEN:
                return 'OPEN';
            case WebSocket.CLOSING:
                return 'CLOSING';
            case WebSocket.CLOSED:
                return 'CLOSED';
            default:
                return 'UNKNOWN';
        }
    }

    private sendInitialSetup() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error(`[TextService:${this.wsInstanceId}] Cannot send initial setup: WebSocket not open`);
            return;
        }

        console.log(`[TextService:${this.wsInstanceId}] Sending initial setup with model:`, MODEL);

        const setupMessage = {
            setup: {
                model: MODEL,
                generation_config: {
                    response_modalities: ["TEXT"]  // Only request TEXT responses
                },
                system_instruction: {
                    parts: [
                        {
                            text: "You are a helpful coding assistant that provides concise and accurate information about programming problems and concepts. " +
                                "Focus on giving clear explanations and useful insights. " +
                                "When discussing code, be precise and provide examples when helpful. " +
                                "Respond in a conversational but professional tone."
                        }
                    ]
                }
            }
        };
        this.ws?.send(JSON.stringify(setupMessage));

        // Send an initial greeting message
        const initialMessage = {
            clientContent: {
                turns: [
                    {
                        parts: [{
                            text: "Hello! I'm ready to help with programming questions and problems."
                        }],
                    },
                ],
                turnComplete: true
            }
        };

        this.ws?.send(JSON.stringify(initialMessage));
    }
}
