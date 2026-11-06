import { Language } from '../context/LanguageContext';

const LANG_MAP: Record<Language, string> = {
  en: 'en-IN',
  kn: 'kn-IN',
  hi: 'hi-IN',
};

class VoiceService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private recognitionInstance: any = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
  }

  private loadVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
  }

  isSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  isRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  speak(text: string, language: Language = 'en', onEnd?: () => void): boolean {
    if (!this.isSynthesisSupported()) {
      if (onEnd) onEnd();
      return false;
    }

    try {
      // Resume synthesis if paused (common Chromium glitch)
      window.speechSynthesis.resume();
      window.speechSynthesis.cancel();

      // Ensure voices list is populated
      if (this.voices.length === 0) {
        this.loadVoices();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const targetTag = LANG_MAP[language] || 'en-IN';
      utterance.lang = targetTag;
      utterance.rate = 0.92; // Clear agricultural pacing
      utterance.pitch = 1.0;

      // Select matching regional voice if available
      const voice = this.voices.find(
        (v) => v.lang === targetTag || v.lang.startsWith(targetTag.split('-')[0])
      );
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis event error:', e);
        this.currentUtterance = null;
        if (onEnd) onEnd();
      };

      this.currentUtterance = utterance;

      // Small timeout fixes Chromium abrupt cancel-before-speak drop
      setTimeout(() => {
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      }, 30);

      return true;
    } catch (err) {
      console.warn('Voice speak exception:', err);
      if (onEnd) onEnd();
      return false;
    }
  }

  stopSpeaking(): void {
    if (this.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  startListening(options: {
    language: Language;
    onResult: (transcript: string) => void;
    onError?: (error: string) => void;
    onEnd?: () => void;
  }): { stop: () => void } {
    if (!this.isRecognitionSupported()) {
      if (options.onError) {
        options.onError('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      }
      if (options.onEnd) options.onEnd();
      return { stop: () => {} };
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = LANG_MAP[options.language] || 'en-IN';

      recognition.onresult = (event: any) => {
        if (event.results && event.results.length > 0) {
          const transcript = event.results[0][0].transcript;
          options.onResult(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        let userMessage = event.error;
        if (event.error === 'not-allowed') {
          userMessage = 'Microphone permission was denied. Please allow microphone access in your browser address bar.';
        } else if (event.error === 'no-speech') {
          userMessage = 'No speech detected. Please try speaking closer to your microphone.';
        }
        if (options.onError) {
          options.onError(userMessage);
        }
      };

      recognition.onend = () => {
        if (options.onEnd) {
          options.onEnd();
        }
      };

      recognition.start();
      this.recognitionInstance = recognition;

      return {
        stop: () => {
          try {
            recognition.stop();
          } catch {}
        },
      };
    } catch (err: any) {
      console.warn('Recognition start exception:', err);
      if (options.onError) options.onError(err.message || 'Failed to start microphone.');
      if (options.onEnd) options.onEnd();
      return { stop: () => {} };
    }
  }
}

export const voiceService = new VoiceService();
