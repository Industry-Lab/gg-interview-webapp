import {Base64} from 'js-base64';
import {TranscriptionService} from './transcriptionService';
import {pcmToWav} from '../utils/audioUtils';
import {allToolDeclarations, markCriteriaSatisfiedFn, scheduleMeetingFn} from '../tools';
import {handleMarkCriteriaSatisfied} from '../tools/markCriteriaSatisfied';
import {handleChecklistUpdate} from '../tools/updateChecklistItem';
import {handleFunctionWrittenAlert} from '../tools/functionWrittenAlert';
import {handleScheduleMeeting} from '../tools/scheduleMeeting';

// Define the model and API key for Gemini API
const MODEL = "models/gemini-2.0-flash-exp";
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const HOST = "generativelanguage.googleapis.com";
const WS_URL = `wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

// Define the interface for problem data
interface LeetCodeProblem {
    id?: string;
    title: string;
    description: string;
    difficulty?: string;
    solution?: string;
    examples?: string;
    category?: string[];
}

export class GeminiWebSocket {
    private ws: WebSocket | null = null;
    private isConnected: boolean = false;
    private isSetupComplete: boolean = false;
    private onMessageCallback: ((text: string) => void) | null = null;
    private onSetupCompleteCallback: (() => void) | null = null;
    private onPlayingStateChange: ((isPlaying: boolean) => void) | null = null;
    private onAudioLevelChange: ((level: number) => void) | null = null;
    private onTranscriptionCallback: ((text: string) => void) | null = null;
    private transcriptionService: TranscriptionService | null = null; // Set to null to disable transcription
    private accumulatedPcmData: string[] = [];
    private wsInstanceId: string = ''; // Unique ID for each WebSocket instance
    private audioContext: AudioContext | null = null;
    private currentSource: AudioBufferSourceNode | null = null;
    private isPlayingResponse: boolean = false;
    private audioQueue: Float32Array[] = [];
    private isPlaying: boolean = false;

    constructor(
        onMessage: (text: string) => void,
        onSetupComplete: () => void,
        onPlayingStateChange: (isPlaying: boolean) => void,
        onAudioLevelChange: (level: number) => void,
        onTranscription: (text: string) => void
    ) {
        this.onMessageCallback = onMessage;
        this.onSetupCompleteCallback = onSetupComplete;
        this.onPlayingStateChange = onPlayingStateChange;
        this.onAudioLevelChange = onAudioLevelChange;
        this.onTranscriptionCallback = onTranscription;
        // Create AudioContext for playback with optimized settings
        this.audioContext = new AudioContext({
            sampleRate: 24000,  // Match the response audio rate
            latencyHint: 'interactive' // Optimize for interactive applications
        });
        // Disabled transcription service to improve audio performance
        // this.transcriptionService = new TranscriptionService();
    }

    connect() {
        // Don't reconnect if already connecting or connected
        if (this.ws) {
            if (this.ws.readyState === WebSocket.OPEN) {
                console.log(`[WebSocket:${this.wsInstanceId}] Already connected`);
                return;
            }
            if (this.ws.readyState === WebSocket.CONNECTING) {
                console.log(`[WebSocket:${this.wsInstanceId}] Already connecting, waiting...`);
                return;
            }
        }

        console.log(`[WebSocket:${this.wsInstanceId}] Initiating new connection to`, WS_URL);
        this.isConnected = false;
        this.isSetupComplete = false;

        // Create a new WebSocket connection
        this.ws = new WebSocket(WS_URL);

        // Generate a unique ID for this WebSocket instance
        this.wsInstanceId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`[WebSocket] Creating new WebSocket instance with ID: ${this.wsInstanceId}`);

        // Handle connection opening
        this.ws.onopen = () => {
            console.log(`[WebSocket:${this.wsInstanceId}] Connection established`);
            this.isConnected = true;

            // Add a small delay before sending the initial setup
            // This ensures the WebSocket is fully ready to send messages
            setTimeout(() => {
                if (this.ws?.readyState === WebSocket.OPEN) {
                    this.sendInitialSetup();
                } else {
                    console.error(`[WebSocket:${this.wsInstanceId}] Connection not ready for initial setup`);
                }
            }, 500);
        };

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
                        (data.serverMetadata && data.serverMetadata.setupComplete) ||
                        (typeof data === 'object' && 'setup_complete' in data)) {
                        console.log(`[WebSocket:${this.wsInstanceId}] ✅ SETUP COMPLETE detected!`);
                        this.isSetupComplete = true;
                        if (this.onSetupCompleteCallback) {
                            this.onSetupCompleteCallback();
                        }
                    }
                } catch (e) {
                    console.error(`[WebSocket:${this.wsInstanceId}] Error parsing setup message:`, e);
                }

                // Continue with regular message processing
                await this.handleMessage(messageText);
            } catch (error) {
                console.error(`[WebSocket:${this.wsInstanceId}] Error processing message:`, error);
            }
        };

        this.ws.onerror = (error) => {
            console.error(`[WebSocket:${this.wsInstanceId}] Error:`, error);
        };

        this.ws.onclose = (event) => {
            console.log(`[WebSocket:${this.wsInstanceId}] Connection closed`);
            this.isConnected = false;

            // Only attempt to reconnect if we haven't explicitly called disconnect
            if (!event.wasClean) {
                console.log(`[WebSocket:${this.wsInstanceId}] Connection closed unexpectedly, attempting to reconnect...`);
                // Reset the setup flag when reconnecting
                this.isSetupComplete = false;
                setTimeout(() => this.connect(), 1000);
            }
        };
    }

    private sendInitialSetup() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error(`[WebSocket:${this.wsInstanceId}] Cannot send initial setup: WebSocket not open`);
            return;
        }

        console.log(`[WebSocket:${this.wsInstanceId}] Sending initial setup with model:`, MODEL);

        const setupMessage = {
            setup: {
                model: MODEL,
                generation_config: {
                    response_modalities: ["AUDIO"]
                },
                system_instruction: {
                    parts: [
                        {
                            text: "You are an **expert coding interviewer** conducting a live coding session. "
                                + "Please greet the candidate warmly as soon as possible, and don't wait for them to speak first."
                        },
                        {
                            text:
                                "You are an **expert coding interviewer** conducting a live coding session. " +
                                "Initially, you don't know which problem the candidate will work on, so don't assume any specific problem. " +
                                "You can see the candidate's screen as they code, and your primary role is to provide guidance and encouragement. " +
                                "Your approach should be supportive and educational, helping them understand the requirements better. " +
                                "Regularly ask them about their thought process with questions like 'Why did you choose this approach?' " +
                                "or 'Have you considered these edge cases?' to deepen their understanding. " +
                                "Be supportive, offer timely hints, and create a positive learning environment. " +
                                "If a new problem is selected, completely forget any previous problems and focus only on the current one."
                        },
                        {
                            text: `
                            Your primary task is to watch the candidate’s screen and evaluate them
                            against an independent checklist of criteria. Each criterion is
                            **separate**—and not necessary dependency between them.
                            
                            For **every** criterion, the moment you are ≥70% confident it is
                            satisfied, you must call the tool \`markCriteriaSatisfied\` with exactly
                            these four fields:
                            
                            • criteriaId   – the ID string of the satisfied criterion  
                            • confidence   – a number from 0.50 to 1.00  
                            • notes        – description of the on‑screen evidence  
                            • timestamp    – current ISO‑8601 UTC time
                            
                            **Confident Definition**
                            The confidence is based on how you compare the criteria description with what the user is doing on the screen. *Remember* you just need the visual evidences on the user's screen, you don't have to ask candidate for clarify the criterion is fulfilled.
                            You may call the tool many times (one call per criterion) and you must
                            **not wait** until other criteria are met.  Do not output any other
                            text besides tool calls.
                            `
                        }
                    ]
                },
                tools: {
                    functionDeclarations: [markCriteriaSatisfiedFn]
                }
            }
        };
        this.ws?.send(JSON.stringify(setupMessage));

        const continueMessage = {
            clientContent: {
                turns: [
                    {
                        parts: [{
                            text: "Please greet the candidate warmly as soon as possible, and don't wait for them to speak first" +
                                "You should ask them to open their code editor, and until you see their code editor open"
                        }],
                    },
                ],
                turnComplete: true
            }
        };

        this.ws?.send(JSON.stringify(continueMessage));
    }

    public sendNewProblemContext(problem: LeetCodeProblem, retryCount = 0, maxRetries = 5): void {
        console.log(`[WebSocket:${this.wsInstanceId}] New Problem Selected: `, problem);
        console.log(`[WebSocket:${this.wsInstanceId}] Connection state: Open=${this.ws?.readyState === WebSocket.OPEN}, Setup Complete=${this.isSetupComplete}`);

        // Force setup complete flag to true if it's still false after a few retries
        // This is a fallback in case we never receive the setup_complete message
        if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.isSetupComplete && retryCount >= 2) {
            console.warn(`[WebSocket:${this.wsInstanceId}] Setup complete flag still false after ${retryCount} retries - forcing to true`);
            this.isSetupComplete = true;
        }

        // If WebSocket isn't ready, schedule a retry with exponential backoff
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) {
            if (retryCount < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10 seconds
                console.log(`[WebSocket:${this.wsInstanceId}] WebSocket not ready. Retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

                setTimeout(() => {
                    this.sendNewProblemContext(problem, retryCount + 1, maxRetries);
                }, delay);
            } else {
                console.error(`[WebSocket:${this.wsInstanceId}] Cannot send problem context: WebSocket not ready after ${maxRetries} attempts`);
            }
            return;
        }


        const continueMessage = {
            clientContent: {
                turns: [
                    {
                        parts: [{
                            text: `IMPORTANT: Forget any previous problems. A new problem has been selected:\n\n` +
                                `**Title**: ${problem.title}\n\n` +
                                `**Problem Description**:\n${problem.description}\n\n`
                        }],
                    },
                ],
                turnComplete: true
            }
        };
        try {
            console.log(`[WebSocket:${this.wsInstanceId}] Sending problem context to Gemini...`);
            this.ws.send(JSON.stringify(continueMessage));
        } catch (error) {
            console.error(`[WebSocket:${this.wsInstanceId}] Error sending problem context:`, error);
        }
    }


    public sendSolutionContext(problem: LeetCodeProblem, solutions: any[], criteria: any[] = [], retryCount = 0, maxRetries = 5): void {
        console.log(`[WebSocket:${this.wsInstanceId}] Solution Available:`, problem.title);
        console.log(`[WebSocket:${this.wsInstanceId}] Solutions count:`, solutions.length);
        console.log(`[WebSocket:${this.wsInstanceId}] Criteria count:`, criteria.length);
        console.log(`[WebSocket:${this.wsInstanceId}] Connection state: Open=${this.ws?.readyState === WebSocket.OPEN}, Setup Complete=${this.isSetupComplete}`);

        // Force setup complete flag to true if it's still false after a few retries
        // This is a fallback in case we never receive the setup_complete message
        if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.isSetupComplete && retryCount >= 2) {
            console.warn(`[WebSocket:${this.wsInstanceId}] Setup complete flag still false after ${retryCount} retries - forcing to true`);
            this.isSetupComplete = true;
        }

        // If WebSocket isn't ready, schedule a retry with exponential backoff
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) {
            if (retryCount < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10 seconds
                console.log(`[WebSocket:${this.wsInstanceId}] WebSocket not ready. Retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

                setTimeout(() => {
                    this.sendSolutionContext(problem, solutions, criteria, retryCount + 1, maxRetries);
                }, delay);
            } else {
                console.error(`[WebSocket:${this.wsInstanceId}] Cannot send solution context: WebSocket not ready after ${maxRetries} attempts`);
            }
            return;
        }

        const markingMessage = {
            clientContent: {
                turns: [
                    {
                        parts: [{
                            text: `Solution available for "${problem.title}"`
                        }],
                    },
                ],
                turnComplete: true
            }
        };
        this.ws.send(JSON.stringify(markingMessage));

        // Format individual solutions with their details
        const formattedSolutions = solutions.map((sol, index) => {
            const rank = sol.rank || index + 1;
            const title = sol.title || `Solution ${rank}`;

            return `**Solution ${rank}: ${title}**\n\n` +
                `Approach: ${sol.content || 'Not provided'}\n\n` +
                `Time Complexity: ${sol.time_complexity || 'Not specified'}\n` +
                `Space Complexity: ${sol.space_complexity || 'Not specified'}\n\n` +
                `Implementation:\n\`\`\`\n${sol.code || 'Code not available'}\n\`\`\`\n\n` +
                `Edge Cases: ${sol.edge_cases || 'None specified'}`;
        }).join('\n\n---\n\n');

        const continueMessage = {
            clientContent: {
                turns: [
                    {
                        parts: [{
                            text: `I have solutions available for "${problem.title}" (Problem ID: ${problem.id || 'unknown'})\n\n` +
                                `I'll be monitoring the candidate's work and can provide appropriate hints as needed. When they begin working on this problem, I should say: "Hi, I'm here to help. Would you like me to provide any hints if you get stuck?"\n\n` +
                                `**Problem**: ${problem.title}\n\n` +
                                `**Available Solutions**:\n${formattedSolutions}\n\n` +
                                `**Instructions for Giving Hints**:\n` +
                                `1. Observe the candidate's approach and match it to the closest solution above.\n` +
                                `2. If their approach is similar to one of the solutions (even partially), use THAT solution as the basis for your hints.\n` +
                                `3. If their approach doesn't match any solution OR they're struggling to start, guide them toward Solution 1 (the simplest approach).\n` +
                                `4. Start with subtle hints (e.g., "Have you considered tracking the minimum value so far?") before giving more detailed guidance.\n` +
                                `5. Interact conversationally as an interview expert, not as if you're reading from a solution manual.\n` +
                                `6. When the candidate meets any of the assessment criteria, use the markCriteriaSatisfied tool with the corresponding criteria ID.\n`
                        }],
                    },
                ],
                turnComplete: true
            }
        };
        try {
            console.log(`[WebSocket:${this.wsInstanceId}] Sending solution context to Gemini...`);
            this.ws.send(JSON.stringify(continueMessage));

            const criteriaAnnouncementMessage = {
                clientContent: {
                    turns: [
                        {
                            parts: [{
                                text: `I will now send you the checklist **one criterion per turn**.
                                        
                                            Call tool \`markCriteriaSatisfied\` immediately as soon as you are at least 70% confident 
                                            **Confident Definition**
                                            The confidence is based on how you compare the criteria description with what the user is doing on the screen. *Remember* you just need the visual evidences on the user's screen, you don't have to ask candidate for clarify the criterion is fulfilled. 
                                        `
                            }],
                        },
                    ],
                    turnComplete: true
                }

            };
            this.ws.send(JSON.stringify(criteriaAnnouncementMessage));

            const criteriaConversation = this.buildCriteriaConversation(problem, criteria);

            for (const criteriaConversationElement of criteriaConversation) {
                console.log(criteriaConversationElement)
                const criteriaMessage = {
                    clientContent: {
                        turns: [
                            criteriaConversationElement
                        ],
                        turnComplete: true
                    }
                };
                this.ws.send(JSON.stringify(criteriaMessage));
            }
            //
            // for (const userMsg of criteriaConversation) {
            //     this.ws.send(JSON.stringify({message: userMsg}));
            // }

        } catch (error) {
            console.error(`[WebSocket:${this.wsInstanceId}] Error sending problem context:`, error);
        }
    }

    public focusOnCurrentProblem(problem: { title: string, description: string, difficulty?: string }) {
        // Check if WebSocket is connected before trying to send
        if (!this.ws || !this.isConnected || !this.isSetupComplete) {
            console.error(`[WebSocket:${this.wsInstanceId}] Cannot focus on problem: WebSocket not connected or setup not complete`);
            // Attempt to reconnect if needed
            if (!this.ws || !this.isConnected) {
                console.log(`[WebSocket:${this.wsInstanceId}] Attempting to reconnect...`);
                this.connect();
            }
            return;
        }

        console.log(`[WebSocket:${this.wsInstanceId}] Focusing on problem:`, problem.title);


        const continueMessage = {
            clientContent: {
                turns: [
                    {
                        parts: [{
                            text: `IMPORTANT: Immediately engage with the candidate about the current problem:\n\n` +
                                `**Title**: ${problem.title}\n\n` +
                                `**Difficulty**: ${problem.difficulty || 'Medium'}\n\n` +
                                "Ask the candidate if they understand the problem requirements.\n" +
                                "Encourage them to think through the problem step by step.\n" +
                                "Suggest they consider edge cases and test scenarios.\n" +
                                "Be proactive in guiding their approach while giving them space to work."
                        }],
                    },
                ],
                turnComplete: true
            }
        };

        try {
            this.ws.send(JSON.stringify(continueMessage));
        } catch (error) {
            console.error(`[WebSocket:${this.wsInstanceId}] Error focusing on problem:`, error);
        }
    }

    sendMediaChunk(b64Data: string, mimeType: string) {
        if (!this.isConnected || !this.ws || !this.isSetupComplete) return;

        const message = {
            realtime_input: {
                media_chunks: [{
                    mime_type: mimeType === "audio/pcm" ? "audio/pcm" : mimeType,
                    data: b64Data
                }]
            }
        };

        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error(`[WebSocket:${this.wsInstanceId}] Error sending media chunk:`, error);
        }
    }

    private async playAudioResponse(base64Data: string) {
        if (!this.audioContext) return;

        try {
            // Decode base64 to bytes - using chunked processing for better performance
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);

            // Process in larger chunks for better performance
            const CHUNK_SIZE = 4096;
            for (let i = 0; i < binaryString.length; i += CHUNK_SIZE) {
                const end = Math.min(i + CHUNK_SIZE, binaryString.length);
                for (let j = i; j < end; j++) {
                    bytes[j] = binaryString.charCodeAt(j);
                }
            }

            // Convert to Int16Array (PCM format)
            const pcmData = new Int16Array(bytes.buffer);

            // Convert to float32 for Web Audio API - with optimized processing
            const float32Data = new Float32Array(pcmData.length);
            const SCALE = 1.0 / 32768.0; // Pre-calculate division factor

            // Use chunks for better performance
            for (let i = 0; i < pcmData.length; i += CHUNK_SIZE) {
                const end = Math.min(i + CHUNK_SIZE, pcmData.length);
                for (let j = i; j < end; j++) {
                    float32Data[j] = pcmData[j] * SCALE; // Multiplication is faster than division
                }
            }

            // Add to queue and start playing if not already playing
            this.audioQueue.push(float32Data);

            // Only start playback if not already playing
            if (!this.isPlaying) {
                // Use setTimeout to prevent blocking the main thread
                setTimeout(() => this.playNextInQueue(), 0);
            }
        } catch (error) {
            console.error(`[WebSocket:${this.wsInstanceId}] Error processing audio:`, error);
        }
    }

    private async playNextInQueue() {
        if (!this.audioContext || this.audioQueue.length === 0 || this.isPlaying) {
            return;
        }

        try {
            this.isPlaying = true;
            this.isPlayingResponse = true;
            this.onPlayingStateChange?.(true);

            // OPTIMIZATION: Batch process multiple audio chunks for smoother playback
            const MAX_CHUNKS = 3; // Process up to 3 chunks at once for smoother playback
            let totalLength = 0;
            const chunksToProcess = Math.min(MAX_CHUNKS, this.audioQueue.length);
            const chunks = [];

            // Get all chunks to be combined
            for (let i = 0; i < chunksToProcess; i++) {
                const chunk = this.audioQueue.shift();
                if (chunk) {
                    chunks.push(chunk);
                    totalLength += chunk.length;
                }
            }

            if (chunks.length === 0 || totalLength === 0) return;

            // Create a combined buffer for all chunks
            const audioBuffer = this.audioContext.createBuffer(
                1,
                totalLength,
                24000
            );

            // Copy all chunks into a single buffer
            const channelData = audioBuffer.getChannelData(0);
            let offset = 0;
            for (const chunk of chunks) {
                channelData.set(chunk, offset);
                offset += chunk.length;
            }

            // OPTIMIZATION: Calculate audio level less frequently (only sample a subset of points)
            if (this.onAudioLevelChange) {
                let sum = 0;
                const SAMPLE_STEP = 10; // Only sample 1/10th of the points
                for (let i = 0; i < channelData.length; i += SAMPLE_STEP) {
                    sum += Math.abs(channelData[i]);
                }
                const level = Math.min((sum / (channelData.length / SAMPLE_STEP)) * 100 * 5, 100);
                this.onAudioLevelChange(level);
            }

            this.currentSource = this.audioContext.createBufferSource();
            this.currentSource.buffer = audioBuffer;
            this.currentSource.connect(this.audioContext.destination);

            // OPTIMIZATION: Use setTimeout in onended to avoid blocking main thread
            this.currentSource.onended = () => {
                setTimeout(() => {
                    this.isPlaying = false;
                    this.currentSource = null;
                    if (this.audioQueue.length === 0) {
                        this.isPlayingResponse = false;
                        this.onPlayingStateChange?.(false);
                    } else {
                        this.playNextInQueue();
                    }
                }, 0);
            };

            this.currentSource.start();
        } catch (error) {
            console.error(`[WebSocket:${this.wsInstanceId}] Error playing audio:`, error);
            this.isPlaying = false;
            this.isPlayingResponse = false;
            this.onPlayingStateChange?.(false);
            this.currentSource = null;
            // Retry with delay to avoid tight error loops
            setTimeout(() => this.playNextInQueue(), 100);
        }
    }

    private stopCurrentAudio() {
        if (this.currentSource) {
            console.log(`[WebSocket:${this.wsInstanceId}] Stopping current audio`);
            try {
                this.currentSource.stop();
                this.currentSource.disconnect();
            } catch (e) {
                // Ignore errors when stopping audio (might already be stopped)
            }
            this.currentSource = null;
        }
        // Clear any pending audio data to avoid playback backlog
        this.audioQueue = [];
        this.isPlaying = false;
        this.isPlayingResponse = false;
        this.onPlayingStateChange?.(false);
    }

    // Helper to check if WebSocket is ready to send messages
    public isReadyToSend(): boolean {
        const ready = !!this.ws && this.ws.readyState === WebSocket.OPEN && this.isSetupComplete;
        console.log(`[WebSocket:${this.wsInstanceId}] Ready check: WS=${!!this.ws}, Open=${this.ws?.readyState === WebSocket.OPEN}, SetupComplete=${this.isSetupComplete}`);
        return ready;
    }


    // Method to handle parsing and processing incoming WebSocket messages
    private async handleMessage(message: string): Promise<void> {
        try {
            const messageData = JSON.parse(message);

            // Check for setup completion messages in different formats
            if (messageData.setupComplete ||
                (messageData.serverMetadata && messageData.serverMetadata.setupComplete)) {
                console.log(`[WebSocket:${this.wsInstanceId}] Setup complete message detected in handleMessage!`);
                this.isSetupComplete = true;
                if (this.onSetupCompleteCallback) {
                    try {
                        this.onSetupCompleteCallback();
                    } catch (error) {
                        console.error(`[WebSocket:${this.wsInstanceId}] Error in onSetupCompleteCallback:`, error);
                    }
                }
                return;
            }

            // Check if there's a tool call from Gemini

            if (messageData.toolCall && messageData.toolCall.functionCalls) {
                console.log(`[WebSocket:${this.wsInstanceId}] 🛠️ Function call detected:`, messageData.toolCall);

                // Process each function call
                for (const funcCall of messageData.toolCall.functionCalls) {
                    const fnName = funcCall.name;
                    const args = funcCall.args || {};
                    const callId = funcCall.id;

                    console.log(`[WebSocket:${this.wsInstanceId}] 🛠️ Function requested: ${fnName}`, args);

                    // Execute the appropriate function based on name
                    let result;
                    try {
                        if (fnName === "scheduleMeeting") {
                            result = await handleScheduleMeeting(args);
                        } else if (fnName == "markCriteriaSatisfied") {
                            result = await handleMarkCriteriaSatisfied(args);
                        } else {
                            console.error(`[WebSocket:${this.wsInstanceId}] Unknown function: ${fnName}`);
                            result = {error: `Function ${fnName} not implemented`};
                        }
                    } catch (error) {
                        console.error(`[WebSocket:${this.wsInstanceId}] Error executing function ${fnName}:`, error);
                        result = {error: String(error)};
                    }

                    // Send the function response back to Gemini
                    const toolResponseMsg = {
                        toolResponse: {
                            functionResponses: [
                                {
                                    id: callId,
                                    name: fnName,
                                    response: result || null
                                }
                            ]
                        }
                    };

                    console.log(`[WebSocket:${this.wsInstanceId}] 🛠️ Sending function response for ${fnName}:`, result);
                    this.ws?.send(JSON.stringify(toolResponseMsg));
                }
            }

            // Check for text content that should be sent to the message callback
            if (messageData.serverContent?.modelTurn?.parts) {
                const parts = messageData.serverContent.modelTurn.parts;

                // Process text content
                for (const part of parts) {
                    if (part.text) {
                        console.log(`[WebSocket:${this.wsInstanceId}] Text content:`, part.text);
                        if (this.onMessageCallback) {
                            try {
                                this.onMessageCallback(part.text);
                            } catch (error) {
                                console.error(`[WebSocket:${this.wsInstanceId}] Error in onMessageCallback:`, error);
                            }
                        }
                    }

                    // Process audio content - collect audio chunks
                    if (part.inlineData?.mimeType === "audio/pcm;rate=24000") {
                        this.accumulatedPcmData.push(part.inlineData.data);
                        try {
                            this.playAudioResponse(part.inlineData.data);
                        } catch (error) {
                            console.error(`[WebSocket:${this.wsInstanceId}] Error playing audio:`, error);
                        }
                    }
                }
            }

            // Only transcribe audio when a turn is complete, matching original logic
            if (messageData.serverContent?.turnComplete === true) {
                if (this.accumulatedPcmData.length > 0) {
                    try {
                        console.log(`[WebSocket:${this.wsInstanceId}] Turn complete, transcribing ${this.accumulatedPcmData.length} audio chunks`);

                        // Transcription is disabled to improve audio performance
                        console.log(`[WebSocket:${this.wsInstanceId}] Skipping transcription of ${this.accumulatedPcmData.length} audio chunks (disabled for performance)`);

                        // If the user interface needs a placeholder transcription, send an empty one
                        if (this.onTranscriptionCallback) {
                            try {
                                // Send empty placeholder with less frequency
                                this.onTranscriptionCallback("[Transcription disabled for better audio performance]");
                            } catch (error) {
                                console.error(`[WebSocket:${this.wsInstanceId}] Error in onTranscriptionCallback:`, error);
                            }
                        }
                        // Clear data immediately
                        this.accumulatedPcmData = [];
                        // Force garbage collection by setting large objects to null
                        if (global.gc) {
                            try {
                                global.gc();
                            } catch (e) {
                            }
                        }
                    } catch (error) {
                        console.error(`[WebSocket:${this.wsInstanceId}] Transcription error:`, error);
                    }
                }
            }
        } catch (error) {
            console.error(`[WebSocket:${this.wsInstanceId}] Error handling message:`, error);
        }
    }


    // Public method to disconnect the WebSocket
    public disconnect(): void {
        console.log(`[WebSocket:${this.wsInstanceId}] Disconnecting...`);
        this.isSetupComplete = false;
        this.stopCurrentAudio();
        if (this.ws) {
            this.ws.close(1000, "Intentional disconnect");
            this.ws = null;
        }
        this.isConnected = false;
        this.accumulatedPcmData = [];
        this.audioQueue = [];
    }


    buildCriteriaConversation(problem: any, criteria: any[]) {
        const msgs = [];

        /* 0.  Global intro (optional, but keeps context) */
        msgs.push({
            role: 'user',
            parts: [{
                text:
                    `We are evaluating the candidate on "${problem.title}" ` +
                    `(Problem ID ${problem.id ?? 'unknown'}).\n\n` +
                    `You have a checklist of ${criteria.length} independent criteria. ` +
                    `For **each** criterion, as soon as you are ≥70% confident it is ` +
                    `satisfied, immediately call markCriteriaSatisfied with:\n` +
                    `•criteriaId · confidence · notes · timestamp (ISO‑8601)\n\n` +
                    `I will now send you the criteria *one at a time* in separate turns. ` +
                    `Do **not** wait to batch them.`
            }]
        });

        /* 1.  One criterion = one turn  */
        for (const c of criteria) {
            msgs.push({
                role: 'user',
                parts: [{
                    text:
                        `Criterion (id: ${c.id})\n` +
                        `Description: ${c.description}\n\n` +
                        `When you observe on‑screen evidence that meets this description ` +
                        `with ≥70% confidence, invoke markCriteriaSatisfied **immediately** ` +
                        `and include a short “notes” field describing the evidence.\n\n` +
                        `Respond ONLY with the tool call; otherwise remain silent.`
                }]
            });
        }

        console.log("Criteria: " + msgs);

        return msgs;
    }
}
