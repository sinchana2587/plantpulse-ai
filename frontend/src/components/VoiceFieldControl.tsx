import React, { useState } from 'react';
import { Volume2, VolumeX, Mic, Square, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { voiceService } from '../services/voiceService';

interface VoiceFieldControlProps {
  fieldName: string;
  fieldExplanation: string;
  onDictate?: (transcript: string) => void;
  allowDictation?: boolean;
  className?: string;
}

export const VoiceFieldControl: React.FC<VoiceFieldControlProps> = ({
  fieldExplanation,
  onDictate,
  allowDictation = true,
  className = '',
}) => {
  const { language, t } = useLanguage();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [dictatedText, setDictatedText] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [showExplanationBubble, setShowExplanationBubble] = useState(false);
  const [stopFn, setStopFn] = useState<(() => void) | null>(null);

  const handleToggleSpeak = () => {
    setVoiceError(null);
    if (isSpeaking) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
      setShowExplanationBubble(false);
    } else {
      setIsSpeaking(true);
      setShowExplanationBubble(true);
      const played = voiceService.speak(fieldExplanation, language, () => {
        setIsSpeaking(false);
      });
      if (!played) {
        // Fallback: still show the visual guidance bubble for 5 seconds
        setTimeout(() => setShowExplanationBubble(false), 5000);
      }
    }
  };

  const handleStartListening = () => {
    setVoiceError(null);
    if (isListening) {
      if (stopFn) stopFn();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    setDictatedText(null);

    const { stop } = voiceService.startListening({
      language,
      onResult: (transcript) => {
        setIsListening(false);
        setDictatedText(transcript);
      },
      onError: (errMsg) => {
        setIsListening(false);
        setVoiceError(errMsg);
        setTimeout(() => setVoiceError(null), 5000);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });

    setStopFn(() => stop);
  };

  const handleConfirmDictation = () => {
    if (dictatedText && onDictate) {
      onDictate(dictatedText);
    }
    setDictatedText(null);
  };

  const handleCancelDictation = () => {
    setDictatedText(null);
  };

  return (
    <div className={`relative inline-flex items-center gap-1 ${className}`}>
      {/* Speaker (TTS) Button */}
      <button
        type="button"
        onClick={handleToggleSpeak}
        title={isSpeaking ? 'Stop voice explanation' : t('voice.readExplanation')}
        className={`p-1.5 rounded-lg text-xs transition-all flex items-center justify-center cursor-pointer ${
          isSpeaking
            ? 'bg-emerald-600 text-white shadow-xs animate-pulse ring-2 ring-emerald-400'
            : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
        }`}
      >
        {isSpeaking ? (
          <VolumeX className="w-3.5 h-3.5" />
        ) : (
          <Volume2 className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Microphone (STT) Button - only if allowed */}
      {allowDictation && onDictate && (
        <button
          type="button"
          onClick={handleStartListening}
          title={isListening ? t('voice.listening') : t('voice.dictateInput')}
          className={`p-1.5 rounded-lg text-xs transition-all flex items-center justify-center cursor-pointer ${
            isListening
              ? 'bg-rose-600 text-white shadow-xs animate-bounce ring-2 ring-rose-400'
              : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          {isListening ? (
            <Square className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Mic className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {/* Listening Indicator Badge */}
      {isListening && (
        <span className="absolute right-0 top-full mt-1 z-50 whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-600 text-white shadow-xl flex items-center gap-1.5 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>{t('voice.listening')}</span>
        </span>
      )}

      {/* Spoken Guidance Visual Bubble */}
      {showExplanationBubble && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-72 p-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-emerald-500/40 text-left animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300 mb-1">
            <span className="flex items-center gap-1">
              <Volume2 className="w-3 h-3 animate-bounce" />
              Voice Guide:
            </span>
            <button
              type="button"
              onClick={() => {
                voiceService.stopSpeaking();
                setIsSpeaking(false);
                setShowExplanationBubble(false);
              }}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            {fieldExplanation}
          </p>
        </div>
      )}

      {/* Dictation Confirmation Dialog Bubble */}
      {dictatedText !== null && (
        <div className="absolute right-0 top-full mt-1 z-50 w-72 p-3 bg-white border-2 border-emerald-500 rounded-xl shadow-2xl text-left">
          <div className="text-[11px] font-bold text-emerald-900 mb-1 flex items-center gap-1">
            <Mic className="w-3.5 h-3.5 text-emerald-600" />
            {t('voice.confirmTitle')}
          </div>
          <p className="text-xs text-slate-800 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-2.5 font-medium">
            "{dictatedText}"
          </p>
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={handleCancelDictation}
              className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              {t('voice.tryAgain')}
            </button>
            <button
              type="button"
              onClick={handleConfirmDictation}
              className="px-3 py-1 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Check className="w-3 h-3" />
              {t('voice.useText')}
            </button>
          </div>
        </div>
      )}

      {/* Error Tooltip */}
      {voiceError && (
        <div className="absolute right-0 top-full mt-1 z-50 w-64 p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 shadow-xl flex items-start gap-1.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{voiceError}</span>
        </div>
      )}
    </div>
  );
};
