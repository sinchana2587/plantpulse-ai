import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Trash2,
  Sparkles,
  Volume2,
  VolumeX,
  Mic,
  Square,
  AlertCircle,
  Sprout,
  ShieldCheck,
  User,
  Loader2,
} from 'lucide-react';
import { api } from '../api/client';
import { ChatMessage, Plant } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { voiceService } from '../services/voiceService';

export const ChatbotView: React.FC = () => {
  const { t, language } = useLanguage();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userPlants, setUserPlants] = useState<Plant[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<string>('');

  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [stopDictation, setStopDictation] = useState<(() => void) | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadChatHistory();
    loadUserPlants();
    return () => {
      voiceService.stopSpeaking();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadChatHistory = async () => {
    try {
      const history = await api.getChatHistory();
      setMessages(history);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const loadUserPlants = async () => {
    try {
      const plants = await api.getPlants();
      setUserPlants(plants);
    } catch (err) {
      console.error('Failed to load user plants for chatbot:', err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    setInputText('');

    // Append optimistic user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      user_id: null,
      role: 'user',
      content: text,
      related_plant_id: selectedPlantId || null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const res = await api.sendChatMessage(text, selectedPlantId || undefined);

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        user_id: null,
        role: 'assistant',
        content: res.response,
        related_plant_id: res.related_plant_id,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        user_id: null,
        role: 'assistant',
        content: `Error: ${err.message || 'Unable to contact agricultural assistant.'}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your conversation history?')) return;
    try {
      await api.clearChatHistory();
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const handleToggleSpeak = (msgId: string, content: string) => {
    if (speakingMsgId === msgId) {
      voiceService.stopSpeaking();
      setSpeakingMsgId(null);
    } else {
      setSpeakingMsgId(msgId);
      voiceService.speak(content, language, () => {
        setSpeakingMsgId(null);
      });
    }
  };

  const handleStartVoiceInput = () => {
    if (isListening) {
      if (stopDictation) stopDictation();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    const { stop } = voiceService.startListening({
      language,
      onResult: (transcript) => {
        setIsListening(false);
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      },
      onError: (err) => {
        console.warn('Voice dictation error:', err);
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });

    setStopDictation(() => stop);
  };

  const quickPrompts = [
    t('chatbot.quickPrompt1'),
    t('chatbot.quickPrompt2'),
    t('chatbot.quickPrompt3'),
    t('chatbot.quickPrompt4'),
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-green-600 flex items-center justify-center text-white shadow-md shadow-emerald-900/10">
            <Bot className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {t('chatbot.title')}
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                Agronomy Specialist
              </span>
            </div>
            <p className="text-xs text-slate-500">{t('chatbot.subtitle')}</p>
          </div>
        </div>

        <button
          onClick={handleClearHistory}
          title={t('chatbot.clear')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('chatbot.clear')}</span>
        </button>
      </div>

      {/* Strict Agricultural Scope Notice */}
      <div className="mt-3 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 flex items-start gap-2 text-xs text-amber-900">
        <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <span>{t('chatbot.disclaimer')}</span>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm">
              <Sprout className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Ask Any Agricultural Question
              </h3>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                Inquire about optimal growth temperatures, soil moisture thresholds, GDD forecasting, or check the status of your registered crops.
              </p>
            </div>

            {/* Quick Prompts List */}
            <div className="w-full max-w-xl space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-600 block text-left">
                {t('chatbot.quickPromptsTitle')}:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className="p-3 text-left rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 text-xs text-slate-700 font-medium transition-all shadow-2xs flex items-start gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-emerald-700 text-white rounded-tr-xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>

                  {/* Actions for Assistant Message */}
                  {!isUser && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>PlantPulse Ag-Intelligence</span>
                      <button
                        type="button"
                        onClick={() => handleToggleSpeak(msg.id, msg.content)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                          speakingMsgId === msg.id
                            ? 'bg-emerald-100 text-emerald-800 font-bold animate-pulse'
                            : 'hover:text-emerald-700 hover:bg-slate-50'
                        }`}
                      >
                        {speakingMsgId === msg.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{t('chatbot.speakAnswer')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex gap-3 items-center">
            <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-2xl rounded-tl-xs flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Consulting biophysical agronomic knowledge base...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box & Controls */}
      <div className="pt-2 border-t border-slate-200">
        {/* Optional Plant Context Selector */}
        {userPlants.length > 0 && (
          <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
            <Sprout className="w-3.5 h-3.5 text-emerald-600" />
            <span>Target Plant Context:</span>
            <select
              value={selectedPlantId}
              onChange={(e) => setSelectedPlantId(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden"
            >
              <option value="">General Agriculture (All Plants)</option>
              {userPlants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.crop_type})
                </option>
              ))}
            </select>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('chatbot.inputPlaceholder')}
              disabled={isLoading}
              className="w-full pl-4 pr-10 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden shadow-xs transition-colors"
            />
            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={handleStartVoiceInput}
              title={isListening ? t('chatbot.listening') : t('chatbot.voiceDictation')}
              className={`absolute right-2.5 top-2.5 p-1.5 rounded-lg transition-colors ${
                isListening
                  ? 'bg-rose-600 text-white animate-bounce'
                  : 'text-slate-400 hover:text-emerald-700 hover:bg-slate-100'
              }`}
            >
              {isListening ? (
                <Square className="w-4 h-4 fill-current" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="p-3 bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
