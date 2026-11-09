/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Define Web Speech API types for TypeScript
interface IWindowSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

export type VoiceCommandType =
  | 'TIMER_START'
  | 'TIMER_PAUSE'
  | 'TIMER_RESET'
  | 'SLIDE_NEXT'
  | 'SLIDE_PREV'
  | 'TAB_OVERVIEW'
  | 'TAB_GESTURE'
  | 'TAB_FOCUS'
  | 'TAB_PRESENT'
  | 'TAB_WORKSPACE'
  | 'TAB_SETTINGS'
  | 'SCROLL_UP'
  | 'SCROLL_DOWN'
  | 'CAMERA_START'
  | 'CAMERA_STOP'
  | 'CAMERA_FREEZE'
  | 'EMERGENCY_HALT'
  | 'SYSTEM_STANDBY'
  | 'SYSTEM_WAKE'
  | 'QUICK_LAUNCHER'
  | 'RE_ZERO';

export interface VoiceCommandMatch {
  type: VoiceCommandType;
  transcript: string;
  description: string;
}

class VoiceAssistantService {
  private recognition: IWindowSpeechRecognition | null = null;
  private isListening: boolean = false;
  private isManuallyStopped: boolean = true;
  private onCommandCallback: ((match: VoiceCommandMatch) => void) | null = null;
  private onStatusChangeCallback: ((listening: boolean, error?: string | null) => void) | null = null;

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  public init(): boolean {
    if (!this.isSupported()) {
      return false;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any;
      const SpeechClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      this.recognition = new SpeechClass() as IWindowSpeechRecognition;
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: ISpeechRecognitionEvent) => {
        const lastIdx = event.results.length - 1;
        if (lastIdx >= 0) {
          const rawText = event.results[lastIdx][0]?.transcript?.trim().toLowerCase() || '';
          if (rawText) {
            this.handleTranscript(rawText);
          }
        }
      };

      this.recognition.onerror = (e: { error: string }) => {
        console.warn('Voice Assistant error:', e.error);
        if (e.error === 'not-allowed') {
          this.isListening = false;
          this.isManuallyStopped = true;
          this.onStatusChangeCallback?.(false, 'Microphone permission denied.');
        } else if (e.error !== 'no-speech') {
          this.onStatusChangeCallback?.(this.isListening, `Voice error: ${e.error}`);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        // Auto-restart if not manually stopped
        if (!this.isManuallyStopped) {
          try {
            this.recognition?.start();
            this.isListening = true;
            this.onStatusChangeCallback?.(true, null);
          } catch {
            this.onStatusChangeCallback?.(false, null);
          }
        } else {
          this.onStatusChangeCallback?.(false, null);
        }
      };

      return true;
    } catch (err) {
      console.warn('SpeechRecognition initialization error:', err);
      return false;
    }
  }

  public start(
    onCommand: (match: VoiceCommandMatch) => void,
    onStatusChange?: (listening: boolean, error?: string | null) => void
  ): boolean {
    this.onCommandCallback = onCommand;
    this.onStatusChangeCallback = onStatusChange || null;
    this.isManuallyStopped = false;

    if (!this.recognition) {
      const ok = this.init();
      if (!ok) {
        onStatusChange?.(false, 'Browser does not support Speech Recognition API.');
        return false;
      }
    }

    try {
      this.recognition?.start();
      this.isListening = true;
      onStatusChange?.(true, null);
      return true;
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      this.isListening = false;
      onStatusChange?.(false, 'Failed to start microphone listener.');
      return false;
    }
  }

  public stop() {
    this.isManuallyStopped = true;
    this.isListening = false;
    try {
      this.recognition?.stop();
    } catch {
      // ignore
    }
    this.onStatusChangeCallback?.(false, null);
  }

  public getStatus(): boolean {
    return this.isListening;
  }

  private handleTranscript(text: string) {
    let match: VoiceCommandMatch | null = null;

    if (text.includes('start timer') || text.includes('start focus') || text.includes('begin work')) {
      match = { type: 'TIMER_START', transcript: text, description: 'focus motor started.' };
    } else if (text.includes('pause timer') || text.includes('stop timer') || text.includes('hold timer')) {
      match = { type: 'TIMER_PAUSE', transcript: text, description: 'focus motor paused.' };
    } else if (text.includes('reset timer') || text.includes('clear timer')) {
      match = { type: 'TIMER_RESET', transcript: text, description: 'focus motor reset to 25m.' };
    } else if (text.includes('next slide') || text.includes('forward slide') || text.includes('advance')) {
      match = { type: 'SLIDE_NEXT', transcript: text, description: 'presentation slide advanced.' };
    } else if (text.includes('previous slide') || text.includes('back slide') || text.includes('prev slide')) {
      match = { type: 'SLIDE_PREV', transcript: text, description: 'presentation slide reversed.' };
    } else if (text.includes('open presentation') || text.includes('presentation view') || text.includes('show slides')) {
      match = { type: 'TAB_PRESENT', transcript: text, description: 'presentation viewer deployed.' };
    } else if (text.includes('open workspace') || text.includes('study space') || text.includes('open notes')) {
      match = { type: 'TAB_WORKSPACE', transcript: text, description: 'study workspace deployed.' };
    } else if (text.includes('open focus') || text.includes('focus motor') || text.includes('show timer')) {
      match = { type: 'TAB_FOCUS', transcript: text, description: 'focus motor tab deployed.' };
    } else if (text.includes('open gesture') || text.includes('optical bench') || text.includes('show camera')) {
      match = { type: 'TAB_GESTURE', transcript: text, description: 'gesture optical bench deployed.' };
    } else if (text.includes('open overview') || text.includes('dashboard')) {
      match = { type: 'TAB_OVERVIEW', transcript: text, description: 'overview tab deployed.' };
    } else if (text.includes('open settings') || text.includes('calibrate') || text.includes('parameters')) {
      match = { type: 'TAB_SETTINGS', transcript: text, description: 'settings modal opened.' };
    } else if (text.includes('scroll down') || text.includes('move down')) {
      match = { type: 'SCROLL_DOWN', transcript: text, description: 'scrolled viewport down.' };
    } else if (text.includes('scroll up') || text.includes('move up')) {
      match = { type: 'SCROLL_UP', transcript: text, description: 'scrolled viewport up.' };
    } else if (text.includes('freeze camera') || text.includes('freeze feed')) {
      match = { type: 'CAMERA_FREEZE', transcript: text, description: 'optical feed frozen.' };
    } else if (text.includes('start camera') || text.includes('turn on camera')) {
      match = { type: 'CAMERA_START', transcript: text, description: 'camera feed initialised.' };
    } else if (text.includes('stop camera') || text.includes('turn off camera')) {
      match = { type: 'CAMERA_STOP', transcript: text, description: 'camera stream stopped.' };
    } else if (text.includes('emergency halt') || text.includes('halt system') || text.includes('kill feed')) {
      match = { type: 'EMERGENCY_HALT', transcript: text, description: 'emergency halt triggered.' };
    } else if (text.includes('standby') || text.includes('sleep system') || text.includes('pause os')) {
      match = { type: 'SYSTEM_STANDBY', transcript: text, description: 'telemetry placed on standby.' };
    } else if (text.includes('wake up') || text.includes('wake system') || text.includes('resume os')) {
      match = { type: 'SYSTEM_WAKE', transcript: text, description: 'telemetry link re-armed.' };
    } else if (text.includes('launcher') || text.includes('quick launch') || text.includes('command palette')) {
      match = { type: 'QUICK_LAUNCHER', transcript: text, description: 'quick launcher deployed.' };
    } else if (text.includes('re-zero') || text.includes('rezero') || text.includes('calibrate origin')) {
      match = { type: 'RE_ZERO', transcript: text, description: 'coordinate origin re-zeroed.' };
    }

    if (match && this.onCommandCallback) {
      this.onCommandCallback(match);
    }
  }
}

export const voiceAssistant = new VoiceAssistantService();
