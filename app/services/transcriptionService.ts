import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
const MODEL_NAME = "gemini-1.5-flash-8b";

export class TranscriptionService {
  private model;
  private isPaused: boolean = false;
  private pendingTranscriptions: number = 0;
  
  // Static property to globally disable/enable transcription
  // Set to true by default to disable transcription as requested
  public static isDisabled: boolean = true;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: MODEL_NAME });
    console.log(`[TranscriptionService] Initialized (${TranscriptionService.isDisabled ? 'DISABLED' : 'ENABLED'})`);
  }
  
  /**
   * Static method to enable transcription system-wide
   */
  public static enableTranscription(): void {
    TranscriptionService.isDisabled = false;
    console.log("[TranscriptionService] SYSTEM-WIDE TRANSCRIPTION ENABLED");
  }
  
  /**
   * Static method to disable transcription system-wide
   */
  public static disableTranscription(): void {
    TranscriptionService.isDisabled = true;
    console.log("[TranscriptionService] SYSTEM-WIDE TRANSCRIPTION DISABLED");
  }

  /**
   * Pauses transcription processing to reduce load during critical operations
   */
  pauseProcessing(): void {
    this.isPaused = true;
    console.log(`[TranscriptionService] Paused processing (${this.pendingTranscriptions} pending)`);
  }

  /**
   * Resumes transcription processing after being paused
   */
  resumeProcessing(): void {
    this.isPaused = false;
    console.log("[TranscriptionService] Resumed processing");
  }

  async transcribeAudio(audioBase64: string, mimeType: string = "audio/wav"): Promise<string> {
    // Check global disable flag first - immediately return if disabled
    if (TranscriptionService.isDisabled) {
      // Don't log anything to avoid console spam
      return "";
    }
    
    // If transcription is paused or the audio is too short, don't process it
    if (this.isPaused) {
      console.log(`[TranscriptionService] Skipping transcription - processing is paused`);
      return "";
    }

    // Skip very short audio chunks as they're likely not meaningful speech
    if (audioBase64.length < 500) {
      return "";
    }
      
    this.pendingTranscriptions++;
    try {
      // Adding timestamp to rate-limit our API calls (1 per second max)
      const now = Date.now();
      const timeSinceLastCall = now - (this._lastApiCallTime || 0);
      if (timeSinceLastCall < 2000 && this._lastApiCallTime) { // 2 second minimum between calls
        console.log(`[TranscriptionService] Rate limiting - last call was ${timeSinceLastCall}ms ago`);
        return ""; // Skip this transcription to prevent quota errors
      }
      this._lastApiCallTime = now;
      
      // Use a much shorter log to avoid console spam
      console.log(`[TranscriptionService] Transcribing audio: ${(audioBase64.length/1024).toFixed(1)}KB`);
      
      try {
        // Use a different model that supports audio
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-pro",
          generationConfig: {
            temperature: 0,  // Lower temperature for more accurate transcription
            maxOutputTokens: 256,  // Limit output size
            topP: 1,
            topK: 64,
          },
          safetySettings: []
        });
        
        // Try with a simpler prompt and fewer options to reduce errors
        const result = await model.generateContent([
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          },
          { text: "Transcribe this audio:" },
        ]);
        
        return result.response.text();
      } catch (apiError: any) {
        // Handle quota errors specifically
        if (apiError?.message?.includes("quota") || apiError?.message?.includes("exceeded")) {
          console.warn("[TranscriptionService] API quota exceeded, disabling transcription for 30 seconds");
          this.pauseProcessing();
          
          // Auto-resume after 30 seconds
          setTimeout(() => {
            this.resumeProcessing();
          }, 30000); // 30 second pause when quota is hit
        }
        throw apiError; // Re-throw for the outer catch
      }
    } catch (error) {
      // Suppress console error in production, only log during development
      if (process.env.NODE_ENV === "development") {
        console.error("[TranscriptionService] Error during transcription:", 
          typeof error === "object" ? (error as any).message || "Unknown error" : error);
      }
      return "";
    } finally {
      this.pendingTranscriptions--;
    }
  }
  
  // Track the last time we called the API to implement rate limiting
  private _lastApiCallTime: number = 0;
} 
