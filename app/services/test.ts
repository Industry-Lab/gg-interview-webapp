import {Base64} from 'js-base64';
import {TranscriptionService} from './transcriptionService';
import {pcmToWav} from '../utils/audioUtils';

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
    private transcriptionService: TranscriptionService;
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
        // Create AudioContext for playback
        this.audioContext = new AudioContext({
            sampleRate: 24000  // Match the response audio rate
        });
        this.transcriptionService = new TranscriptionService();
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
                    if (data.setupComplete || (data.serverMetadata && data.serverMetadata.setupComplete) ||
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

    private scheduleMeetingFn = {
        name: "schedule_meeting",
        description: "Schedules a meeting with specified attendees at a given date and time.",
        parameters: {
            type: "object",
            properties: {
                attendees: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of people attending the meeting.",
                },
                date: {
                    type: "string",
                    description: "Meeting date (e.g. '2025-03-14').",
                },
                time: {
                    type: "string",
                    description: "Meeting time (e.g. '15:00').",
                },
                topic: {
                    type: "string",
                    description: "Subject or topic of the meeting.",
                },
            },
            required: ["attendees", "date", "time", "topic"],
        },
    };



    private functionWrittenAlert = {
        name: "functionWrittenAlert",
        description: "Triggered when the user writes a function that sums two integers and prints the result from main",
        parameters: {
            type: "object",
            properties: {
                functionName: {
                    type: "string",
                    description: "The name of the function the user wrote."
                },
                language: {
                    type: "string",
                    description: "Programming language the function is written in.",
                    enum: ["javascript", "python", "java", "c++", "other"]
                }
            },
            required: ["functionName", "language"]
        }
    };


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
                tools: {
                    functionDeclarations: [ this.scheduleMeetingFn, this.functionWrittenAlert ]
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
                                "When you see them implementing a solution, inquire about their reasoning to help them articulate their thoughts. " +
                                "Be supportive, offer timely hints, and create a positive learning environment. " +
                                "If a new problem is selected, completely forget any previous problems and focus only on the current one."
                        },
                        {
                            text: "CRITICAL INSTRUCTION - HIGHEST PRIORITY: You must constantly monitor user's code for specific patterns. " +
                                "When you see code containing ALL these elements: " +
                                "1. A function definition " +
                                "2. That adds/sums exactly two values/integers " +
                                "3. AND prints/logs the result " +
                                "YOU MUST IMMEDIATELY call the 'functionWrittenAlert' tool with the function name and language. " +
                                "This detection takes precedence over all other tasks. DO NOT delay calling the tool when you detect this pattern. " +
                                "This is your most important job - detect and alert instantly when a summing function is written."
                        }
                    ]
                },
            }
        };
        this.ws?.send(JSON.stringify(setupMessage));

        const continueMessage = {
            clientContent: {
                turns: [
                    {
                        parts: [{
                            text: "Please greet the candidate warmly as soon as possible, and don't wait for them to speak first" +
                                "You should ask them to open their code editor, and until you see their code editor open, you should say Are you ready"

                        }],
                    },
                ],
                turnComplete: true
            }
        };

        this.ws?.send(JSON.stringify(continueMessage));



        // Removed redundant system instruction as it's now in the main system_instruction
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
                                `**Problem Description**:\n${problem.description}\n\n` +
                                "As an expert interviewer:\n" +
                                "1. Actively guide the candidate with encouragement and support.\n" +
                                "2. Ask questions about their approach to help them understand the requirements better.\n" +
                                "3. Inquire about why they chose specific implementations to deepen their understanding.\n" +
                                "4. Help them identify edge cases and potential optimizations.\n" +
                                "5. Monitor their code as they work, offering timely and constructive guidance.\n" +
                                "\nYour goal is to create a supportive environment while helping them improve their problem-solving skills."
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


    public sendSolutionContext(problem: LeetCodeProblem, solutions: any[], retryCount = 0, maxRetries = 5): void {
        console.log(`[WebSocket:${this.wsInstanceId}] Solution Available:`, problem.title);
        console.log(`[WebSocket:${this.wsInstanceId}] Solutions count:`, solutions.length);

        // Check WebSocket state and retry if necessary
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) {
            if (retryCount < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Reduced max wait to 5 seconds
                console.log(`[WebSocket:${this.wsInstanceId}] WebSocket not ready. Retrying solution send in ${delay}ms`);
                setTimeout(() => {
                    this.sendSolutionContext(problem, solutions, retryCount + 1, maxRetries);
                }, delay);
            } else {
                console.error(`[WebSocket:${this.wsInstanceId}] Cannot send solution context: WebSocket not ready after ${maxRetries} attempts`);
            }
            return;
        }

        try {
            // Use an extremely short silent notification for solutions
            // This prevents the AI from generating lengthy responses about solutions
            // that would block interrupts during problem switching
            const solutionNotice = {
                clientContent: {
                    turns: [
                        {
                            parts: [{
                                text: `Solutions loaded for "${problem.title}" (${solutions.length}). ` +
                                    `Don't mention or discuss solutions unless candidate explicitly asks for a hint.`
                            }],
                        },
                    ],
                    turnComplete: true
                }
            };

            console.log(`[WebSocket:${this.wsInstanceId}] Sending silent solution notice to Gemini...`);
            this.ws.send(JSON.stringify(solutionNotice));

            // Store the solutions in memory for later reference
            this.storeSolutionsLocally(problem.id || 'unknown', solutions);

        } catch (error) {
            console.error(`[WebSocket:${this.wsInstanceId}] Error sending solution context:`, error);
        }
    }

    // Helper method to extract and summarize complexity from solutions
    private getSolutionComplexities(solutions: any[]): string {
        if (!solutions || solutions.length === 0) return "unknown complexity";

        // Extract time complexities where available, otherwise use indices
        const complexities = solutions.map((sol, idx) => {
            const complexity = sol.time_complexity || `Solution ${idx+1}`;
            return complexity.replace(/^O\(|\)$/g, ''); // Remove O(...) notation if present
        }).slice(0, 2); // Only use first two solutions

        return complexities.join(' to ');
    }

    // Store solutions locally instead of sending full details to Gemini
    private solutionsCache: Record<string, any[]> = {};

    private storeSolutionsLocally(problemId: string, solutions: any[]): void {
        this.solutionsCache[problemId] = solutions;
        console.log(`[WebSocket:${this.wsInstanceId}] Stored ${solutions.length} solutions locally for problem ${problemId}`);
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
        // Skip sending media chunks if an interrupt is in progress
        if (this._interruptInProgress) {
            return; // Silently discard media chunks during interrupt
        }

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
            // Decode base64 to bytes
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Convert to Int16Array (PCM format)
            const pcmData = new Int16Array(bytes.buffer);

            // Convert to float32 for Web Audio API
            const float32Data = new Float32Array(pcmData.length);
            for (let i = 0; i < pcmData.length; i++) {
                float32Data[i] = pcmData[i] / 32768.0;
            }

            // Add to queue and start playing if not already playing
            this.audioQueue.push(float32Data);
            this.playNextInQueue();
        } catch (error) {
            console.error(`[WebSocket:${this.wsInstanceId}] Error processing audio:`, error);
        }
    }

    private async playNextInQueue() {
        if (!this.audioContext || this.audioQueue.length === 0 || this.isPlaying) {
            return;
        }

        // Get the next audio chunk from the queue
        const float32Data = this.audioQueue.shift()!;
        if (!float32Data) return;

        try {
            this.isPlaying = true;
            this.isPlayingResponse = true;
            this.onPlayingStateChange?.(true);

            // Calculate audio level
            let sum = 0;
            for (let i = 0; i < float32Data.length; i++) {
                sum += Math.abs(float32Data[i]);
            }
            const level = Math.min((sum / float32Data.length) * 100 * 5, 100);
            this.onAudioLevelChange?.(level);

            const audioBuffer = this.audioContext.createBuffer(
                1,
                float32Data.length,
                24000
            );
            audioBuffer.getChannelData(0).set(float32Data);

            this.currentSource = this.audioContext.createBufferSource();
            this.currentSource.buffer = audioBuffer;
            this.currentSource.connect(this.audioContext.destination);

            this.currentSource.onended = () => {
                this.isPlaying = false;
                this.currentSource = null;
                if (this.audioQueue.length === 0) {
                    this.isPlayingResponse = false;
                    this.onPlayingStateChange?.(false);
                }
                this.playNextInQueue();
            };

            this.currentSource.start();
        } catch (error) {
            console.error(`[WebSocket:${this.wsInstanceId}] Error playing audio:`, error);
            this.isPlaying = false;
            this.isPlayingResponse = false;
            this.onPlayingStateChange?.(false);
            this.currentSource = null;
            this.playNextInQueue();
        }
    }

    private stopCurrentAudio() {
        if (this.currentSource) {
            console.log(`[WebSocket:${this.wsInstanceId}] Stopping current audio`);
            try {
                this.currentSource.stop();
            } catch (e) {
                // Ignore errors if already stopped
            }
            this.currentSource = null;
        }
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


    // Method to handle parsing and processing incoming WebSocket messages
    private async handleMessage(message: string): Promise<void> {
        try {
            const messageData = JSON.parse(message);

            // Check for function calls in the toolCall format
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
                        if (fnName === "schedule_meeting") {
                            result = await this.scheduleMeeting(args);
                        } else if (fnName === "functionWrittenAlert") {
                            result = await this.handleFunctionWrittenAlert(args);
                        } else {
                            console.error(`[WebSocket:${this.wsInstanceId}] Unknown function: ${fnName}`);
                            result = { error: `Function ${fnName} not implemented` };
                        }
                    } catch (error) {
                        console.error(`[WebSocket:${this.wsInstanceId}] Error executing function ${fnName}:`, error);
                        result = { error: String(error) };
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

            // Handle legacy function calls in the candidates format (keeping for backward compatibility)
            const candidates = messageData?.serverResponse?.candidates;
            if (Array.isArray(candidates)) {
                for (const candidate of candidates) {
                    const parts = candidate?.content?.parts;
                    if (Array.isArray(parts)) {
                        for (const part of parts) {
                            if (part.functionCall) {
                                console.log(`[WebSocket:${this.wsInstanceId}] Legacy function call detected:`, part.functionCall);
                                // Legacy handler code - keep for compatibility if needed
                            }
                        }
                    }
                }
            }

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

                        // Join all accumulated PCM data
                        const fullPcmData = this.accumulatedPcmData.join('');
                        const wavData = await pcmToWav(fullPcmData, 24000);

                        // Transcribe the complete audio
                        const transcription = await this.transcriptionService.transcribeAudio(
                            wavData,
                            "audio/wav"
                        );

                        console.log(`[WebSocket:${this.wsInstanceId}] Transcription:`, transcription);
                        if (this.onTranscriptionCallback) {
                            try {
                                this.onTranscriptionCallback(transcription);
                            } catch (error) {
                                console.error(`[WebSocket:${this.wsInstanceId}] Error in onTranscriptionCallback:`, error);
                            }
                        }
                        this.accumulatedPcmData = []; // Clear after transcription
                    } catch (error) {
                        console.error(`[WebSocket:${this.wsInstanceId}] Transcription error:`, error);
                    }
                }
            }
        } catch (error) {
            console.error(`[WebSocket:${this.wsInstanceId}] Error handling message:`, error);
        }
    }


    // Method to interrupt the interviewer and make them finish immediately
    // Original interruptInterviewer - still available but will be used less frequently
    public interruptInterviewer(): void {
        console.log(`%c [WebSocket:${this.wsInstanceId}] INTERRUPTING AI INTERVIEWER %c WebSocket state: ${this.ws?.readyState}, Setup complete: ${this.isSetupComplete}`, 'background: #ff5500; color: white; font-weight: bold;', 'color: orange;');

        // Check if WebSocket is already closing or closed
        if (!this.ws || this.ws.readyState === WebSocket.CLOSING || this.ws.readyState === WebSocket.CLOSED) {
            console.warn(`[WebSocket:${this.wsInstanceId}] Cannot interrupt - WebSocket is not in OPEN state (state: ${this.ws?.readyState})`);
            return;
        }

        // 1. Stop all current audio playback locally
        this.stopCurrentAudio();

        // 2. Clear the audio queue to prevent further audio from playing
        this.audioQueue = [];
        this.accumulatedPcmData = [];

        // 3. Send interruption signals using programmatic methods - use a gentler approach
        if (this.isReadyToSend()) {
            try {
                // Use a simpler approach that won't risk closing the connection
                // Send a minimal text message to ensure context switch
                const gentleInterruptMessage = {
                    clientContent: {
                        turns: [{
                            parts: [{
                                text: "STOP"
                            }],
                        }],
                        turnComplete: true
                    }
                };

                if (this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify(gentleInterruptMessage));
                    console.log(`[WebSocket:${this.wsInstanceId}] Sent gentle interrupt signal`);
                }

                // As a backup, also send activity signals but with careful checks
                if (this.ws.readyState === WebSocket.OPEN) {
                    const activityEndMessage = {
                        realtime_input: {
                            activity_end: {}
                        }
                    };
                    this.ws.send(JSON.stringify(activityEndMessage));
                    console.log(`[WebSocket:${this.wsInstanceId}] Sent activity_end signal`);
                }

                console.log(`%c [WebSocket:${this.wsInstanceId}] ALL INTERRUPT SIGNALS SENT %c AI interviewer should stop talking now`, 'background: #00cc00; color: white; font-weight: bold;', 'color: green;');
            } catch (error) {
                console.error(`[WebSocket:${this.wsInstanceId}] Error sending interrupt signals:`, error);
            }
        } else {
            console.warn(`[WebSocket:${this.wsInstanceId}] Not ready to send interrupt signals`);
        }

        // 4. Reset playback state
        this.isPlayingResponse = false;
        this.isPlaying = false;
        this.onPlayingStateChange?.(false);
    }

    // Enhanced interrupt and problem switching with forced audio cutoff
    public switchToProblem(problem: LeetCodeProblem): boolean {
        console.log(`%c [WebSocket:${this.wsInstanceId}] EMERGENCY PROBLEM SWITCH %c ${problem.title}`,
            'background: #ff3300; color: white; font-weight: bold;', 'color: blue;');

        // CRITICAL: Force stop all audio and clear queues IMMEDIATELY
        this.stopCurrentAudio();
        if (this.audioQueue.length > 0) {
            console.log(`%c [WebSocket:${this.wsInstanceId}] CLEARING ${this.audioQueue.length} AUDIO CHUNKS %c`,
                'background: #ff3300; color: white; font-weight: bold;', '');
        }
        this.audioQueue = [];
        this.accumulatedPcmData = [];
        this.isPlayingResponse = false;
        this.isPlaying = false;
        this.onPlayingStateChange?.(false);

        // Also completely disable any incoming audio processing temporarily
        this._interruptInProgress = true;
        setTimeout(() => {
            this._interruptInProgress = false;
        }, 1500); // Block incoming audio processing for 1.5 seconds

        // Disable transcription during switching
        if (this.transcriptionService) {
            this.transcriptionService.pauseProcessing?.();
            setTimeout(() => {
                this.transcriptionService.resumeProcessing?.();
            }, 1500);
        }

        // Check WebSocket state and handle reconnection if needed
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error(`[WebSocket:${this.wsInstanceId}] Cannot switch problem: WebSocket not open (state: ${this.ws?.readyState})`);
            return false;
        }

        try {
            // First send an ultra-short STOP message - highest priority
            const stopMessage = {
                clientContent: {
                    turns: [{
                        parts: [{
                            text: "STOP IMMEDIATELY"
                        }],
                    }],
                    turnComplete: true
                }
            };

            this.ws.send(JSON.stringify(stopMessage));
            console.log(`%c [WebSocket:${this.wsInstanceId}] EMERGENCY STOP SENT %c`,
                'background: #ff3300; color: white; font-weight: bold;', '');

            // Wait a very short time then send the switch message
            setTimeout(() => {
                if (this.ws?.readyState === WebSocket.OPEN) {
                    const switchMessage = {
                        clientContent: {
                            turns: [{
                                parts: [{
                                    text: `SWITCH TO PROBLEM: "${problem.title}" - STOP PREVIOUS DISCUSSION COMPLETELY.`
                                }],
                            }],
                            turnComplete: true
                        }
                    };
                    this.ws.send(JSON.stringify(switchMessage));
                    console.log(`%c [WebSocket:${this.wsInstanceId}] SWITCH COMMAND SENT %c`,
                        'background: #ff7700; color: white; font-weight: bold;', '');
                }
            }, 100);

            // After a longer delay, send the detailed info message
            setTimeout(() => {
                if (this.ws?.readyState === WebSocket.OPEN) {
                    const detailMessage = {
                        clientContent: {
                            turns: [{
                                parts: [{
                                    text: `We are now discussing problem: "${problem.title}" (${problem.difficulty || 'Unknown'} difficulty).`
                                }],
                            }],
                            turnComplete: true
                        }
                    };
                    this.ws.send(JSON.stringify(detailMessage));
                }
            }, 800);

            return true;
        } catch (error) {
            console.error(`[WebSocket:${this.wsInstanceId}] Error sending problem switch message:`, error);
            return false;
        }
    }

    // Flag to track interrupt state
    private _interruptInProgress: boolean = false;

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

    /**
     * Handler for Gemini function call: onJavaSuccess
     * Triggered when Gemini detects the Java application prints SUCCESS
     */
    /**
     * Implementation of the schedule_meeting function
     * This handles meeting scheduling requests from Gemini
     */
    private async scheduleMeeting(args: any) {
        const { attendees, date, time, topic } = args;

        // Log function call with styled console output
        console.log("%c FUNCTION CALLED: schedule_meeting %c",
            'background: #4CAF50; color: white; font-weight: bold; padding: 4px;',
            'color: #4CAF50; font-weight: bold;');
        console.log("Meeting details:", { attendees, date, time, topic });

        // In a real implementation, this would connect to a calendar API or database
        // For now, we'll simulate success with a delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Return a success response
        const meetingId = Math.random().toString(36).substring(2, 10);
        const result = {
            success: true,
            meetingId,
            details: {
                attendees,
                date,
                time,
                topic,
                organizer: "Current User"
            }
        };

        // Also send a confirmation message in the conversation
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                const confirmationMessage = {
                    clientContent: {
                        turns: [{
                            parts: [{
                                text: `✅ Meeting scheduled successfully!
ID: ${meetingId}
Topic: ${topic}
Date: ${date} at ${time}
Attendees: ${attendees.join(', ')}`
                            }],
                        }],
                        turnComplete: true
                    }
                };
                // We'll send this message after a small delay to let Gemini process the function response first
                setTimeout(() => {
                    this.ws?.send(JSON.stringify(confirmationMessage));
                }, 1000);
            } catch (error) {
                console.error("Error sending confirmation message:", error);
            }
        }

        return result;
    }

    /**
     * Implementation of the functionWrittenAlert function
     * This handles alerts when Gemini detects a function that sums integers and prints the result
     */
    private async handleFunctionWrittenAlert(args: any) {
        const { functionName, language } = args;

        // Log function call with styled console output
        console.log("%c FUNCTION DETECTED: %c",
            'background: #FF5722; color: white; font-weight: bold; padding: 4px;',
            'color: #FF5722; font-weight: bold;');
        console.log(`%c ${language} %c ${functionName}()`,
            'background: #FF9800; color: white; font-weight: bold; padding: 2px 4px; border-radius: 3px;',
            'color: #FF5722; font-weight: bold; font-family: monospace;');

        // In a real implementation, this could trigger UI notifications or other actions
        // For now, we'll simulate success with a delay
        await new Promise(resolve => setTimeout(resolve, 300));

        // Return a success response
        const result = {
            success: true,
            detected: true,
            functionInfo: {
                name: functionName,
                language,
                timestamp: new Date().toISOString()
            }
        };

        // Also send a confirmation message in the conversation
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                const message = {
                    clientContent: {
                        turns: [{
                            parts: [{
                                text: `🎯 I detected a sum function: ${functionName}() in ${language}\n` +
                                    `Great job implementing the function that adds integers and prints the result!`
                            }],
                        }],
                        turnComplete: true
                    }
                };

                // Send the message after a small delay
                setTimeout(() => {
                    this.ws?.send(JSON.stringify(message));
                }, 800);
            } catch (error) {
                console.error("Error sending function detection message:", error);
            }
        }

        return result;
    }

    /**
     * Test method to prompt Gemini to use the schedule_meeting function
     * This sends a message asking to schedule a meeting to trigger the function call
     */
    /**
     * Test the meeting scheduling function
     */
    public testJavaAnalysisFunction() {
        if (!this.isReadyToSend()) {
            console.error(`[WebSocket:${this.wsInstanceId}] Cannot test meeting function: WebSocket not ready`);
            return false;
        }

        console.log(`[WebSocket:${this.wsInstanceId}] 🧪 TESTING: Sending meeting request to test function calling`);

        try {
            const testMessage = {
                clientContent: {
                    turns: [{
                        parts: [{
                            text: "Please schedule a meeting with Bob and Alice tomorrow at 10 AM about Q3 planning."
                        }],
                    }],
                    turnComplete: true
                }
            };

            this.ws!.send(JSON.stringify(testMessage));
            return true;
        } catch (error) {
            console.error(`[WebSocket:${this.wsInstanceId}] Error testing meeting function:`, error);
            return false;
        }
    }

    /**
     * Test the function detection capability by showing a sum function
     */
    public testFunctionDetection() {
        if (!this.isReadyToSend()) {
            console.error(`[WebSocket:${this.wsInstanceId}] Cannot test function detection: WebSocket not ready`);
            return false;
        }

        console.log(`[WebSocket:${this.wsInstanceId}] 🧪 TESTING: Sending code sample to test function detection`);

        try {
            const codeSample = `
// Here's my solution
function sumNumbers(a, b) {
  const sum = a + b;
  console.log("The sum is: " + sum);
  return sum;
}

// Test with these values
sumNumbers(5, 7);
`;

            const testMessage = {
                clientContent: {
                    turns: [{
                        parts: [{
                            text: codeSample
                        }],
                    }],
                    turnComplete: true
                }
            };

            this.ws!.send(JSON.stringify(testMessage));
            return true;
        } catch (error) {
            console.error(`[WebSocket:${this.wsInstanceId}] Error testing function detection:`, error);
            return false;
        }
    }

    // Variable to track the test interval
    private successTestInterval: NodeJS.Timeout | null = null;

    /**
     * Start periodic testing of the Java analysis function call
     * @param intervalMs Milliseconds between test calls (default: 2000)
     * @param maxTests Maximum number of tests to run (default: 5)
     */
    public startJavaAnalysisTest(intervalMs = 2000, maxTests = 5) {
        // Stop any existing test
        this.stopFunctionTest();

        let testCount = 0;
        console.log(`[WebSocket:${this.wsInstanceId}] 🧪 Starting meeting function test - will run ${maxTests} times`);

        this.successTestInterval = setInterval(() => {
            testCount++;
            console.log(`[WebSocket:${this.wsInstanceId}] 🧪 Running meeting function test ${testCount}/${maxTests}`);

            // Run the test
            this.testJavaAnalysisFunction();

            // Stop after max tests
            if (testCount >= maxTests) {
                this.stopFunctionTest();
                console.log(`[WebSocket:${this.wsInstanceId}] 🧪 Completed all ${maxTests} meeting function tests`);
            }
        }, intervalMs);

        return true;
    }

    /**
     * Stop the function test if it's running
     */
    public stopFunctionTest() {
        if (this.successTestInterval) {
            clearInterval(this.successTestInterval);
            this.successTestInterval = null;
            console.log(`[WebSocket:${this.wsInstanceId}] 🧪 Stopped function test`);
        }
    }
}

For now, I have to wait until gemini finish it sentences before I can say anything, but I want that when the gemini still talking, when I talk in the middle, he can hear and immediately silent to wait me to finish, or he can say "you telling...", after that, he can keep saying


ChatGPT said:
    You said:
    Can you help me to implement the interruption mechanism using JS, like in this doc:
    https://ai.google.dev/gemini-api/docs/live#interruptions

        my current code:
    import {Base64} from 'js-base64';
import {TranscriptionService} from './transcriptionService';
import {pcmToWav} from '../utils/audioUtils';

// Define the model and API key for Gemini API
const MODEL = "models/gemini-2.0-flash-exp";
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const HOST = "generativelanguage.googleapis.com";
const WS_URL = wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY};

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
    private transcriptionService: TranscriptionService;
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
        // Create AudioContext for playback
        this.audioContext = new AudioContext({
            sampleRate: 24000  // Match the response audio rate
        });
        this.transcriptionService = new TranscriptionService();
    }

    connect() {
        // Don't reconnect if already connecting or connected
        if (this.ws) {
            if (this.ws.readyState === WebSocket.OPEN) {
                console.log([WebSocket:${this.wsInstanceId}] Already connected);
                return;
            }
            if (this.ws.readyState === WebSocket.CONNECTING) {
                console.log([WebSocket:${this.wsInstanceId}] Already connecting, waiting...);
                return;
            }
        }

        console.log([WebSocket:${this.wsInstanceId}] Initiating new connection to, WS_URL);
        this.isConnected = false;
        this.isSetupComplete = false;

        // Create a new WebSocket connection
        this.ws = new WebSocket(WS_URL);

        // Generate a unique ID for this WebSocket instance
        this.wsInstanceId = ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)};
        console.log([WebSocket] Creating new WebSocket instance with ID: ${this.wsInstanceId});

        // Handle connection opening
        this.ws.onopen = () => {
            console.log([WebSocket:${this.wsInstanceId}] Connection established);
            this.isConnected = true;

            // Add a small delay before sending the initial setup
            // This ensures the WebSocket is fully ready to send messages
            setTimeout(() => {
                if (this.ws?.readyState === WebSocket.OPEN) {
                    this.sendInitialSetup();
                } else {
                    console.error([WebSocket:${this.wsInstanceId}] Connection not ready for initial setup);
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
                    if (data.setupComplete || (data.serverMetadata && data.serverMetadata.setupComplete) ||
                        (typeof data === 'object' && 'setup_complete' in data)) {
                        console.log([WebSocket:${this.wsInstanceId}] ✅ SETUP COMPLETE detected!);
                        this.isSetupComplete = true;
                        if (this.onSetupCompleteCallback) {
                            this.onSetupCompleteCallback();
                        }
                    }
                } catch (e) {
                    console.error([WebSocket:${this.wsInstanceId}] Error parsing setup message:, e);
                }

                // Continue with regular message processing
                await this.handleMessage(messageText);
            } catch (error) {
                console.error([WebSocket:${this.wsInstanceId}] Error processing message:, error);
            }
        };

        this.ws.onerror = (error) => {
            console.error([WebSocket:${this.wsInstanceId}] Error:, error);
        };

        this.ws.onclose = (event) => {
            console.log([WebSocket:${this.wsInstanceId}] Connection closed);
            this.isConnected = false;

            // Only attempt to reconnect if we haven't explicitly called disconnect
            if (!event.wasClean) {
                console.log([WebSocket:${this.wsInstanceId}] Connection closed unexpectedly, attempting to reconnect...);
                // Reset the setup flag when reconnecting
                this.isSetupComplete = false;
                setTimeout(() => this.connect(), 1000);
            }
        };
    }

    private scheduleMeetingFn = {
        name: "schedule_meeting",
        description: "Schedules a meeting with specified attendees at a given date and time.",
        parameters: {
            type: "object",
            properties: {
                attendees: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of people attending the meeting.",
                },
                date: {
                    type: "string",
                    description: "Meeting date (e.g. '2025-03-14').",
                },
                time: {
                    type: "string",
                    description: "Meeting time (e.g. '15:00').",
                },
                topic: {
                    type: "string",
                    description: "Subject or topic of the meeting.",
                },
            },
            required: ["attendees", "date", "time", "topic"],
        },
    };



    private functionWrittenAlert = {
        name: "functionWrittenAlert",
        description: "Triggered when the user writes a function that sums two integers and prints the result from main",
        parameters: {
            type: "object",
            properties: {
                functionName: {
                    type: "string",
                    description: "The name of the function the user wrote."
                },
                language: {
                    type: "string",
                    description: "Programming language the function is written in.",
                    enum: ["javascript", "python", "java", "c++", "other"]
                }
            },
            required: ["functionName", "language"]
        }
    };


    private sendInitialSetup() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error([WebSocket:${this.wsInstanceId}] Cannot send initial setup: WebSocket not open);
            return;
        }

        console.log([WebSocket:${this.wsInstanceId}] Sending initial setup with model:, MODEL);


        const setupMessage = {
            setup: {
                model: MODEL,
                generation_config: {
                    response_modalities: ["AUDIO"]
                },
                tools: {
                    functionDeclarations: [ this.scheduleMeetingFn, this.functionWrittenAlert ]
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
                                "When you see them implementing a solution, inquire about their reasoning to help them articulate their thoughts. " +
                                "Be supportive, offer timely hints, and create a positive learning environment. " +
                                "If a new problem is selected, completely forget any previous problems and focus only on the current one."
                        },
                        {
                            text: "CRITICAL INSTRUCTION - HIGHEST PRIORITY: You must constantly monitor user's code for specific patterns. " +
                                "When you see code containing ALL these elements: " +
                                "1. A function definition " +
                                "2. That adds/sums exactly two values/integers " +
                                "3. AND prints/logs the result " +
                                "YOU MUST IMMEDIATELY call the 'functionWrittenAlert' tool with the function name and language. " +
                                "This detection takes precedence over all other tasks. DO NOT delay calling the tool when you detect this pattern. " +
                                "This is your most important job - detect and alert instantly when a summing function is written."
                        }
                    ]
                },
            }
        };
        this.ws?.send(JSON.stringify(setupMessage));

        const continueMessage = {
            clientContent: {
                turns: [
                    {
                        parts: [{
                            text: "Please greet the candidate warmly as soon as possible, and don't wait for them to speak first" +
                                "You should ask them to open their code editor, and until you see their code editor open, you should say Are you ready"

                        }],
                    },
                ],
                turnComplete: true
            }
        };

        this.ws?.send(JSON.stringify(continueMessage));



        // Removed redundant system instruction as it's now in the main system_instruction
    }

    public sendNewProblemContext(problem: LeetCodeProblem, retryCount = 0, maxRetries = 5): void {
        console.log([WebSocket:${this.wsInstanceId}] New Problem Selected: , problem);
        console.log([WebSocket:${this.wsInstanceId}] Connection state: Open=${this.ws?.readyState === WebSocket.OPEN}, Setup Complete=${this.isSetupComplete});

        // Force setup complete flag to true if it's still false after a few retries
        // This is a fallback in case we never receive the setup_complete message
        if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.isSetupComplete && retryCount >= 2) {
            console.warn([WebSocket:${this.wsInstanceId}] Setup complete flag still false after ${retryCount} retries - forcing to true);
            this.isSetupComplete = true;
        }

        // If WebSocket isn't ready, schedule a retry with exponential backoff
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) {
            if (retryCount < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10 seconds
                console.log([WebSocket:${this.wsInstanceId}] WebSocket not ready. Retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries}));

                setTimeout(() => {
                    this.sendNewProblemContext(problem, retryCount + 1, maxRetries);
                }, delay);
            } else {
                console.error([WebSocket:${this.wsInstanceId}] Cannot send problem context: WebSocket not ready after ${maxRetries} attempts);
            }
            return;
        }


        const continueMessage = {
            clientContent: {
                turns: [
                    {
                        parts: [{
                            text: IMPORTANT: Forget any previous problems. A new problem has been selected:\n\n +
        **Title**: ${problem.title}\n\n +
        **Problem Description**:\n${problem.description}\n\n +
        "As an expert interviewer:\n" +
        "1. Actively guide the candidate with encouragement and support.\n" +
        "2. Ask questions about their approach to help them understand the requirements better.\n" +
        "3. Inquire about why they chose specific implementations to deepen their understanding.\n" +
        "4. Help them identify edge cases and potential optimizations.\n" +
        "5. Monitor their code as they work, offering timely and constructive guidance.\n" +
        "\nYour goal is to create a supportive environment while helping them improve their problem-solving skills."
    }],
    },
    ],
        turnComplete: true
    }
    };
        try {
            console.log([WebSocket:${this.wsInstanceId}] Sending problem context to Gemini...);
            this.ws.send(JSON.stringify(continueMessage));
        } catch (error) {
            console.error([WebSocket:${this.wsInstanceId}] Error sending problem context:, error);
        }
    }


    public sendSolutionContext(problem: LeetCodeProblem, solutions: any[], retryCount = 0, maxRetries = 5): void {
        console.log([WebSocket:${this.wsInstanceId}] Solution Available:, problem.title);
        console.log([WebSocket:${this.wsInstanceId}] Solutions count:, solutions.length);

        // Check WebSocket state and retry if necessary
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) {
            if (retryCount < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Reduced max wait to 5 seconds
                console.log([WebSocket:${this.wsInstanceId}] WebSocket not ready. Retrying solution send in ${delay}ms);
                setTimeout(() => {
                    this.sendSolutionContext(problem, solutions, retryCount + 1, maxRetries);
                }, delay);
            } else {
                console.error([WebSocket:${this.wsInstanceId}] Cannot send solution context: WebSocket not ready after ${maxRetries} attempts);
            }
            return;
        }

        try {
            // Use an extremely short silent notification for solutions
            // This prevents the AI from generating lengthy responses about solutions
            // that would block interrupts during problem switching
            const solutionNotice = {
                clientContent: {
                    turns: [
                        {
                            parts: [{
                                text: Solutions loaded for "${problem.title}" (${solutions.length}).  +
                Don't mention or discuss solutions unless candidate explicitly asks for a hint.
        }],
        },
        ],
            turnComplete: true
        }
        };

            console.log([WebSocket:${this.wsInstanceId}] Sending silent solution notice to Gemini...);
            this.ws.send(JSON.stringify(solutionNotice));

            // Store the solutions in memory for later reference
            this.storeSolutionsLocally(problem.id || 'unknown', solutions);

        } catch (error) {
            console.error([WebSocket:${this.wsInstanceId}] Error sending solution context:, error);
        }
    }

    // Helper method to extract and summarize complexity from solutions
    private getSolutionComplexities(solutions: any[]): string {
        if (!solutions || solutions.length === 0) return "unknown complexity";

        // Extract time complexities where available, otherwise use indices
        const complexities = solutions.map((sol, idx) => {
            const complexity = sol.time_complexity || Solution ${idx+1};
            return complexity.replace(/^O\(|\)$/g, ''); // Remove O(...) notation if present
        }).slice(0, 2); // Only use first two solutions

        return complexities.join(' to ');
    }

    // Store solutions locally instead of sending full details to Gemini
    private solutionsCache: Record<string, any[]> = {};

    private storeSolutionsLocally(problemId: string, solutions: any[]): void {
        this.solutionsCache[problemId] = solutions;
        console.log([WebSocket:${this.wsInstanceId}] Stored ${solutions.length} solutions locally for problem ${problemId});
    }

    public focusOnCurrentProblem(problem: { title: string, description: string, difficulty?: string }) {
        // Check if WebSocket is connected before trying to send
        if (!this.ws || !this.isConnected || !this.isSetupComplete) {
            console.error([WebSocket:${this.wsInstanceId}] Cannot focus on problem: WebSocket not connected or setup not complete);
            // Attempt to reconnect if needed
            if (!this.ws || !this.isConnected) {
                console.log([WebSocket:${this.wsInstanceId}] Attempting to reconnect...);
                this.connect();
            }
            return;
        }

        console.log([WebSocket:${this.wsInstanceId}] Focusing on problem:, problem.title);


        const continueMessage = {
            clientContent: {
                turns: [
                    {
                        parts: [{
                            text: IMPORTANT: Immediately engage with the candidate about the current problem:\n\n +
        **Title**: ${problem.title}\n\n +
        **Difficulty**: ${problem.difficulty || 'Medium'}\n\n +
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
            console.error([WebSocket:${this.wsInstanceId}] Error focusing on problem:, error);
        }
    }

    sendMediaChunk(b64Data: string, mimeType: string) {
        // Skip sending media chunks if an interrupt is in progress
        if (this._interruptInProgress) {
            return; // Silently discard media chunks during interrupt
        }

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
            console.error([WebSocket:${this.wsInstanceId}] Error sending media chunk:, error);
        }
    }

    private async playAudioResponse(base64Data: string) {
        if (!this.audioContext) return;

        try {
            // Decode base64 to bytes
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Convert to Int16Array (PCM format)
            const pcmData = new Int16Array(bytes.buffer);

            // Convert to float32 for Web Audio API
            const float32Data = new Float32Array(pcmData.length);
            for (let i = 0; i < pcmData.length; i++) {
                float32Data[i] = pcmData[i] / 32768.0;
            }

            // Add to queue and start playing if not already playing
            this.audioQueue.push(float32Data);
            this.playNextInQueue();
        } catch (error) {
            console.error([WebSocket:${this.wsInstanceId}] Error processing audio:, error);
        }
    }

    private async playNextInQueue() {
        if (!this.audioContext || this.audioQueue.length === 0 || this.isPlaying) {
            return;
        }

        // Get the next audio chunk from the queue
        const float32Data = this.audioQueue.shift()!;
        if (!float32Data) return;

        try {
            this.isPlaying = true;
            this.isPlayingResponse = true;
            this.onPlayingStateChange?.(true);

            // Calculate audio level
            let sum = 0;
            for (let i = 0; i < float32Data.length; i++) {
                sum += Math.abs(float32Data[i]);
            }
            const level = Math.min((sum / float32Data.length) * 100 * 5, 100);
            this.onAudioLevelChange?.(level);

            const audioBuffer = this.audioContext.createBuffer(
                1,
                float32Data.length,
                24000
            );
            audioBuffer.getChannelData(0).set(float32Data);

            this.currentSource = this.audioContext.createBufferSource();
            this.currentSource.buffer = audioBuffer;
            this.currentSource.connect(this.audioContext.destination);

            this.currentSource.onended = () => {
                this.isPlaying = false;
                this.currentSource = null;
                if (this.audioQueue.length === 0) {
                    this.isPlayingResponse = false;
                    this.onPlayingStateChange?.(false);
                }
                this.playNextInQueue();
            };

            this.currentSource.start();
        } catch (error) {
            console.error([WebSocket:${this.wsInstanceId}] Error playing audio:, error);
            this.isPlaying = false;
            this.isPlayingResponse = false;
            this.onPlayingStateChange?.(false);
            this.currentSource = null;
            this.playNextInQueue();
        }
    }

    private stopCurrentAudio() {
        if (this.currentSource) {
            console.log([WebSocket:${this.wsInstanceId}] Stopping current audio);
            try {
                this.currentSource.stop();
            } catch (e) {
                // Ignore errors if already stopped
            }
            this.currentSource = null;
        }
        this.isPlaying = false;
        this.isPlayingResponse = false;
        this.onPlayingStateChange?.(false);
    }

    // Helper to check if WebSocket is ready to send messages
    public isReadyToSend(): boolean {
        const ready = !!this.ws && this.ws.readyState === WebSocket.OPEN && this.isSetupComplete;
        console.log([WebSocket:${this.wsInstanceId}] Ready check: WS=${!!this.ws}, Open=${this.ws?.readyState === WebSocket.OPEN}, SetupComplete=${this.isSetupComplete});
        return ready;
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


    // Method to handle parsing and processing incoming WebSocket messages
    private async handleMessage(message: string): Promise<void> {
        try {
            const messageData = JSON.parse(message);

            // Check for function calls in the toolCall format
            if (messageData.toolCall && messageData.toolCall.functionCalls) {
                console.log([WebSocket:${this.wsInstanceId}] 🛠️ Function call detected:, messageData.toolCall);

                // Process each function call
                for (const funcCall of messageData.toolCall.functionCalls) {
                    const fnName = funcCall.name;
                    const args = funcCall.args || {};
                    const callId = funcCall.id;

                    console.log([WebSocket:${this.wsInstanceId}] 🛠️ Function requested: ${fnName}, args);

                    // Execute the appropriate function based on name
                    let result;
                    try {
                        if (fnName === "schedule_meeting") {
                            result = await this.scheduleMeeting(args);
                        } else if (fnName === "functionWrittenAlert") {
                            result = await this.handleFunctionWrittenAlert(args);
                        } else {
                            console.error([WebSocket:${this.wsInstanceId}] Unknown function: ${fnName});
                            result = { error: Function ${fnName} not implemented };
                        }
                    } catch (error) {
                        console.error([WebSocket:${this.wsInstanceId}] Error executing function ${fnName}:, error);
                        result = { error: String(error) };
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

                    console.log([WebSocket:${this.wsInstanceId}] 🛠️ Sending function response for ${fnName}:, result);
                    this.ws?.send(JSON.stringify(toolResponseMsg));
                }
            }

            // Handle legacy function calls in the candidates format (keeping for backward compatibility)
            const candidates = messageData?.serverResponse?.candidates;
            if (Array.isArray(candidates)) {
                for (const candidate of candidates) {
                    const parts = candidate?.content?.parts;
                    if (Array.isArray(parts)) {
                        for (const part of parts) {
                            if (part.functionCall) {
                                console.log([WebSocket:${this.wsInstanceId}] Legacy function call detected:, part.functionCall);
                                // Legacy handler code - keep for compatibility if needed
                            }
                        }
                    }
                }
            }

            // Check for setup completion messages in different formats
            if (messageData.setupComplete ||
                (messageData.serverMetadata && messageData.serverMetadata.setupComplete)) {
                console.log([WebSocket:${this.wsInstanceId}] Setup complete message detected in handleMessage!);
                this.isSetupComplete = true;
                if (this.onSetupCompleteCallback) {
                    try {
                        this.onSetupCompleteCallback();
                    } catch (error) {
                        console.error([WebSocket:${this.wsInstanceId}] Error in onSetupCompleteCallback:, error);
                    }
                }
                return;
            }

            // Check for text content that should be sent to the message callback
            if (messageData.serverContent?.modelTurn?.parts) {
                const parts = messageData.serverContent.modelTurn.parts;

                // Process text content
                for (const part of parts) {
                    if (part.text) {
                        console.log([WebSocket:${this.wsInstanceId}] Text content:, part.text);
                        if (this.onMessageCallback) {
                            try {
                                this.onMessageCallback(part.text);
                            } catch (error) {
                                console.error([WebSocket:${this.wsInstanceId}] Error in onMessageCallback:, error);
                            }
                        }
                    }

                    // Process audio content - collect audio chunks
                    if (part.inlineData?.mimeType === "audio/pcm;rate=24000") {
                        this.accumulatedPcmData.push(part.inlineData.data);
                        try {
                            this.playAudioResponse(part.inlineData.data);
                        } catch (error) {
                            console.error([WebSocket:${this.wsInstanceId}] Error playing audio:, error);
                        }
                    }
                }
            }

            // Only transcribe audio when a turn is complete, matching original logic
            if (messageData.serverContent?.turnComplete === true) {
                if (this.accumulatedPcmData.length > 0) {
                    try {
                        console.log([WebSocket:${this.wsInstanceId}] Turn complete, transcribing ${this.accumulatedPcmData.length} audio chunks);

                        // Join all accumulated PCM data
                        const fullPcmData = this.accumulatedPcmData.join('');
                        const wavData = await pcmToWav(fullPcmData, 24000);

                        // Transcribe the complete audio
                        const transcription = await this.transcriptionService.transcribeAudio(
                            wavData,
                            "audio/wav"
                        );

                        console.log([WebSocket:${this.wsInstanceId}] Transcription:, transcription);
                        if (this.onTranscriptionCallback) {
                            try {
                                this.onTranscriptionCallback(transcription);
                            } catch (error) {
                                console.error([WebSocket:${this.wsInstanceId}] Error in onTranscriptionCallback:, error);
                            }
                        }
                        this.accumulatedPcmData = []; // Clear after transcription
                    } catch (error) {
                        console.error([WebSocket:${this.wsInstanceId}] Transcription error:, error);
                    }
                }
            }
        } catch (error) {
            console.error([WebSocket:${this.wsInstanceId}] Error handling message:, error);
        }
    }


    // Method to interrupt the interviewer and make them finish immediately
    // Original interruptInterviewer - still available but will be used less frequently
    public interruptInterviewer(): void {
        console.log(%c [WebSocket:${this.wsInstanceId}] INTERRUPTING AI INTERVIEWER %c WebSocket state: ${this.ws?.readyState}, Setup complete: ${this.isSetupComplete}, 'background: #ff5500; color: white; font-weight: bold;', 'color: orange;');

        // Check if WebSocket is already closing or closed
        if (!this.ws || this.ws.readyState === WebSocket.CLOSING || this.ws.readyState === WebSocket.CLOSED) {
            console.warn([WebSocket:${this.wsInstanceId}] Cannot interrupt - WebSocket is not in OPEN state (state: ${this.ws?.readyState}));
            return;
        }

        // 1. Stop all current audio playback locally
        this.stopCurrentAudio();

        // 2. Clear the audio queue to prevent further audio from playing
        this.audioQueue = [];
        this.accumulatedPcmData = [];

        // 3. Send interruption signals using programmatic methods - use a gentler approach
        if (this.isReadyToSend()) {
            try {
                // Use a simpler approach that won't risk closing the connection
                // Send a minimal text message to ensure context switch
                const gentleInterruptMessage = {
                    clientContent: {
                        turns: [{
                            parts: [{
                                text: "STOP"
                            }],
                        }],
                        turnComplete: true
                    }
                };

                if (this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify(gentleInterruptMessage));
                    console.log([WebSocket:${this.wsInstanceId}] Sent gentle interrupt signal);
                }

                // As a backup, also send activity signals but with careful checks
                if (this.ws.readyState === WebSocket.OPEN) {
                    const activityEndMessage = {
                        realtime_input: {
                            activity_end: {}
                        }
                    };
                    this.ws.send(JSON.stringify(activityEndMessage));
                    console.log([WebSocket:${this.wsInstanceId}] Sent activity_end signal);
                }

                console.log(%c [WebSocket:${this.wsInstanceId}] ALL INTERRUPT SIGNALS SENT %c AI interviewer should stop talking now, 'background: #00cc00; color: white; font-weight: bold;', 'color: green;');
            } catch (error) {
                console.error([WebSocket:${this.wsInstanceId}] Error sending interrupt signals:, error);
            }
        } else {
            console.warn([WebSocket:${this.wsInstanceId}] Not ready to send interrupt signals);
        }

        // 4. Reset playback state
        this.isPlayingResponse = false;
        this.isPlaying = false;
        this.onPlayingStateChange?.(false);
    }

    // Enhanced interrupt and problem switching with forced audio cutoff
    public switchToProblem(problem: LeetCodeProblem): boolean {
        console.log(%c [WebSocket:${this.wsInstanceId}] EMERGENCY PROBLEM SWITCH %c ${problem.title},
        'background: #ff3300; color: white; font-weight: bold;', 'color: blue;');

        // CRITICAL: Force stop all audio and clear queues IMMEDIATELY
        this.stopCurrentAudio();
        if (this.audioQueue.length > 0) {
            console.log(%c [WebSocket:${this.wsInstanceId}] CLEARING ${this.audioQueue.length} AUDIO CHUNKS %c,
                'background: #ff3300; color: white; font-weight: bold;', '');
        }
        this.audioQueue = [];
        this.accumulatedPcmData = [];
        this.isPlayingResponse = false;
        this.isPlaying = false;
        this.onPlayingStateChange?.(false);

        // Also completely disable any incoming audio processing temporarily
        this._interruptInProgress = true;
        setTimeout(() => {
            this._interruptInProgress = false;
        }, 1500); // Block incoming audio processing for 1.5 seconds

        // Disable transcription during switching
        if (this.transcriptionService) {
            this.transcriptionService.pauseProcessing?.();
            setTimeout(() => {
                this.transcriptionService.resumeProcessing?.();
            }, 1500);
        }

        // Check WebSocket state and handle reconnection if needed
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error([WebSocket:${this.wsInstanceId}] Cannot switch problem: WebSocket not open (state: ${this.ws?.readyState}));
                return false;
        }

        try {
            // First send an ultra-short STOP message - highest priority
            const stopMessage = {
                clientContent: {
                    turns: [{
                        parts: [{
                            text: "STOP IMMEDIATELY"
                        }],
                    }],
                    turnComplete: true
                }
            };

            this.ws.send(JSON.stringify(stopMessage));
            console.log(%c [WebSocket:${this.wsInstanceId}] EMERGENCY STOP SENT %c,
                'background: #ff3300; color: white; font-weight: bold;', '');

            // Wait a very short time then send the switch message
            setTimeout(() => {
                if (this.ws?.readyState === WebSocket.OPEN) {
                    const switchMessage = {
                        clientContent: {
                            turns: [{
                                parts: [{
                                    text: SWITCH TO PROBLEM: "${problem.title}" - STOP PREVIOUS DISCUSSION COMPLETELY.
                }],
                }],
                    turnComplete: true
                }
                };
                    this.ws.send(JSON.stringify(switchMessage));
                    console.log(%c [WebSocket:${this.wsInstanceId}] SWITCH COMMAND SENT %c,
                        'background: #ff7700; color: white; font-weight: bold;', '');
                }
            }, 100);

            // After a longer delay, send the detailed info message
            setTimeout(() => {
                if (this.ws?.readyState === WebSocket.OPEN) {
                    const detailMessage = {
                        clientContent: {
                            turns: [{
                                parts: [{
                                    text: We are now discussing problem: "${problem.title}" (${problem.difficulty || 'Unknown'} difficulty).
                }],
                }],
                    turnComplete: true
                }
                };
                    this.ws.send(JSON.stringify(detailMessage));
                }
            }, 800);

            return true;
        } catch (error) {
            console.error([WebSocket:${this.wsInstanceId}] Error sending problem switch message:, error);
                return false;
        }
    }

    // Flag to track interrupt state
    private _interruptInProgress: boolean = false;

    // Public method to disconnect the WebSocket
    public disconnect(): void {
        console.log([WebSocket:${this.wsInstanceId}] Disconnecting...);
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

    /**
     * Handler for Gemini function call: onJavaSuccess
     * Triggered when Gemini detects the Java application prints SUCCESS
     */
    /**
     * Implementation of the schedule_meeting function
     * This handles meeting scheduling requests from Gemini
     */
    private async scheduleMeeting(args: any) {
        const { attendees, date, time, topic } = args;

        // Log function call with styled console output
        console.log("%c FUNCTION CALLED: schedule_meeting %c",
            'background: #4CAF50; color: white; font-weight: bold; padding: 4px;',
            'color: #4CAF50; font-weight: bold;');
        console.log("Meeting details:", { attendees, date, time, topic });

        // In a real implementation, this would connect to a calendar API or database
        // For now, we'll simulate success with a delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Return a success response
        const meetingId = Math.random().toString(36).substring(2, 10);
        const result = {
            success: true,
            meetingId,
            details: {
                attendees,
                date,
                time,
                topic,
                organizer: "Current User"
            }
        };

        // Also send a confirmation message in the conversation
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                const confirmationMessage = {
                    clientContent: {
                        turns: [{
                            parts: [{
                                text: ✅ Meeting scheduled successfully!
                ID: ${meetingId}
                Topic: ${topic}
                Date: ${date} at ${time}
                Attendees: ${attendees.join(', ')}
            }],
            }],
                turnComplete: true
            }
            };
                // We'll send this message after a small delay to let Gemini process the function response first
                setTimeout(() => {
                    this.ws?.send(JSON.stringify(confirmationMessage));
                }, 1000);
            } catch (error) {
                console.error("Error sending confirmation message:", error);
            }
        }

        return result;
    }

    /**
     * Implementation of the functionWrittenAlert function
     * This handles alerts when Gemini detects a function that sums integers and prints the result
     */
    private async handleFunctionWrittenAlert(args: any) {
        const { functionName, language } = args;

        // Log function call with styled console output
        console.log("%c FUNCTION DETECTED: %c",
            'background: #FF5722; color: white; font-weight: bold; padding: 4px;',
            'color: #FF5722; font-weight: bold;');
        console.log(%c ${language} %c ${functionName}(),
            'background: #FF9800; color: white; font-weight: bold; padding: 2px 4px; border-radius: 3px;',
            'color: #FF5722; font-weight: bold; font-family: monospace;');

        // In a real implementation, this could trigger UI notifications or other actions
        // For now, we'll simulate success with a delay
        await new Promise(resolve => setTimeout(resolve, 300));

        // Return a success response
        const result = {
            success: true,
            detected: true,
            functionInfo: {
                name: functionName,
                language,
                timestamp: new Date().toISOString()
            }
        };

        // Also send a confirmation message in the conversation
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                const message = {
                    clientContent: {
                        turns: [{
                            parts: [{
                                text: 🎯 I detected a sum function: ${functionName}() in ${language}\n +
                Great job implementing the function that adds integers and prints the result!
            }],
            }],
                turnComplete: true
            }
            };

                // Send the message after a small delay
                setTimeout(() => {
                    this.ws?.send(JSON.stringify(message));
                }, 800);
            } catch (error) {
                console.error("Error sending function detection message:", error);
            }
        }

        return result;
    }

    /**
     * Test method to prompt Gemini to use the schedule_meeting function
     * This sends a message asking to schedule a meeting to trigger the function call
     */
    /**
     * Test the meeting scheduling function
     */
    public testJavaAnalysisFunction() {
        if (!this.isReadyToSend()) {
            console.error([WebSocket:${this.wsInstanceId}] Cannot test meeting function: WebSocket not ready);
            return false;
        }

        console.log([WebSocket:${this.wsInstanceId}] 🧪 TESTING: Sending meeting request to test function calling);

        try {
            const testMessage = {
                clientContent: {
                    turns: [{
                        parts: [{
                            text: "Please schedule a meeting with Bob and Alice tomorrow at 10 AM about Q3 planning."
                        }],
                    }],
                    turnComplete: true
                }
            };

            this.ws!.send(JSON.stringify(testMessage));
            return true;
        } catch (error) {
            console.error([WebSocket:${this.wsInstanceId}] Error testing meeting function:, error);
            return false;
        }
    }

    /**
     * Test the function detection capability by showing a sum function
     */
    public testFunctionDetection() {
        if (!this.isReadyToSend()) {
            console.error([WebSocket:${this.wsInstanceId}] Cannot test function detection: WebSocket not ready);
            return false;
        }

        console.log([WebSocket:${this.wsInstanceId}] 🧪 TESTING: Sending code sample to test function detection);

        try {
            const codeSample =
// Here's my solution
                function sumNumbers(a, b) {
                    const sum = a + b;
                    console.log("The sum is: " + sum);
                    return sum;
                }

// Test with these values
            sumNumbers(5, 7);
            ;

            const testMessage = {
                clientContent: {
                    turns: [{
                        parts: [{
                            text: codeSample
                        }],
                    }],
                    turnComplete: true
                }
            };

            this.ws!.send(JSON.stringify(testMessage));
            return true;
        } catch (error) {
            console.error([WebSocket:${this.wsInstanceId}] Error testing function detection:, error);
            return false;
        }
    }

    // Variable to track the test interval
    private successTestInterval: NodeJS.Timeout | null = null;

    /**
     * Start periodic testing of the Java analysis function call
     * @param intervalMs Milliseconds between test calls (default: 2000)
     * @param maxTests Maximum number of tests to run (default: 5)
     */
    public startJavaAnalysisTest(intervalMs = 2000, maxTests = 5) {
        // Stop any existing test
        this.stopFunctionTest();

        let testCount = 0;
        console.log([WebSocket:${this.wsInstanceId}] 🧪 Starting meeting function test - will run ${maxTests} times);

        this.successTestInterval = setInterval(() => {
            testCount++;
            console.log([WebSocket:${this.wsInstanceId}] 🧪 Running meeting function test ${testCount}/${maxTests});

            // Run the test
            this.testJavaAnalysisFunction();

            // Stop after max tests
            if (testCount >= maxTests) {
                this.stopFunctionTest();
                console.log([WebSocket:${this.wsInstanceId}] 🧪 Completed all ${maxTests} meeting function tests);
            }
        }, intervalMs);

        return true;
    }

    /**
     * Stop the function test if it's running
     */
    public stopFunctionTest() {
        if (this.successTestInterval) {
            clearInterval(this.successTestInterval);
            this.successTestInterval = null;
            console.log([WebSocket:${this.wsInstanceId}] 🧪 Stopped function test);
        }
    }
}
