
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { store } from '../services/store';
import { ChatSession, SessionStatus, Message, UserRole } from '../types';
import { generateAIResponse } from '../services/gemini';
import { Send, Clock, LogOut, Star, Heart, User as UserIcon, Sparkles, Paperclip, Mic, Phone, Image as ImageIcon, X, Play, Pause, Square, Loader2 } from 'lucide-react';
import Button from '../components/Button';
import LiveVoiceModal from '../components/LiveVoiceModal';
import HumanCallModal from '../components/HumanCallModal';

// Helper for converting file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const getSupportedMimeType = () => {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg',
    'audio/wav'
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
};

// --- Audio Player Component ---
const AudioPlayer: React.FC<{ src: string }> = ({ src }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [error, setError] = useState(false);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (playing) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(e => {
                console.error("Playback error", e);
                setError(true);
            });
        }
        setPlaying(!playing);
    };

    if (error) {
        return <div className="text-xs text-red-400 bg-red-50 p-2 rounded">Audio unavailable</div>;
    }

    return (
        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-700 p-3 rounded-xl min-w-[180px]">
            <button onClick={togglePlay} className="p-2 bg-white dark:bg-slate-600 rounded-full shadow-sm hover:scale-105 transition-transform flex-shrink-0">
                {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <div className="h-1 w-full bg-slate-300 rounded-full overflow-hidden relative">
               <div className={`h-full bg-violet-500 ${playing ? 'animate-pulse w-full' : 'w-0'} transition-all duration-300`}></div>
            </div>
            <audio 
                ref={audioRef} 
                src={src} 
                onEnded={() => setPlaying(false)} 
                onPause={() => setPlaying(false)}
                className="hidden" 
                playsInline 
            />
        </div>
    );
};

const ChatSessionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useApp();
  const navigate = useNavigate();
  const [session, setSession] = useState<ChatSession | undefined>();
  const [newMessage, setNewMessage] = useState('');
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showRating, setShowRating] = useState(false);
  const [partnerName, setPartnerName] = useState('Connected Partner');
  
  // Media States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isListening, setIsListening] = useState(false); // STT
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Call States
  const [isAICallOpen, setIsAICallOpen] = useState(false);
  const [isHumanCallOpen, setIsHumanCallOpen] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [isCallInitiator, setIsCallInitiator] = useState(false);
  
  // Add a local processing state to prevent double sends
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);

  useEffect(() => {
    if (!id) return;

    const updateFromStore = () => {
      const currentSession = store.getSession(id);
      if (currentSession) {
        setSession(currentSession);
        
        if (currentSession.counselorId === 'AI_AGENT_GEMINI') {
            setPartnerName('Trust AI');
        } else if (user?.role === UserRole.COUNSELOR) {
            const sessionUser = store.getUser(currentSession.userId);
            setPartnerName(sessionUser?.nickname || 'Anonymous User');
        } else {
            setPartnerName('Counsellor');
        }

        if (currentSession.status === SessionStatus.ACTIVE && currentSession.startTime) {
            const endTime = currentSession.startTime + (currentSession.plan.durationMinutes * 60 * 1000);
            const left = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
            setRemainingTime(left);
            
            if (left === 0) {
                 handleEndSession(currentSession);
            }
        }
      }
    };

    updateFromStore();
    const unsubscribe = store.subscribe(updateFromStore);

    const unsubscribeCalls = store.subscribeToCall(id, (data) => {
       // If a call is offering and I am NOT in a call and I did NOT start it...
       if (data.status === 'offering' && !isHumanCallOpen) {
           // Only consider it incoming if we didn't just click the button ourselves
           // But since we set isHumanCallOpen=true immediately on click, this check should be safe
           setIsIncomingCall(true);
       } 
       
       if (data.status === 'ended') {
           setIsIncomingCall(false);
           setIsHumanCallOpen(false); 
           setIsCallInitiator(false);
       } else if (data.status === 'answered') {
           setIsIncomingCall(false);
       }
    });

    const interval = setInterval(() => { updateFromStore(); }, 1000);
    return () => { unsubscribe(); unsubscribeCalls(); clearInterval(interval); }
  }, [id, user?.role, isHumanCallOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, isTyping]);

  // Cleanup recording timer on unmount
  useEffect(() => {
      return () => {
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      };
  }, []);

  const handleEndSession = (currentSession: ChatSession) => {
      if (currentSession.status !== SessionStatus.COMPLETED) {
          store.updateSession(currentSession.id, { status: SessionStatus.COMPLETED });
      }
      setShowRating(true);
  };

  const handleSendMessage = async (e?: React.FormEvent, attachmentData?: {type: 'image'|'audio', url: string, mimeType: string}) => {
    if (e) e.preventDefault();
    if ((!newMessage.trim() && !attachmentData) || !session || !user) return;

    const msg: Message = {
        id: Date.now().toString(),
        senderId: user.id,
        text: newMessage,
        timestamp: Date.now(),
        attachment: attachmentData
    };

    store.addMessage(session.id, msg);
    setNewMessage('');

    if (session.counselorId === 'AI_AGENT_GEMINI') {
        setIsTyping(true);
        const updatedHistory = [...session.messages, msg]; 
        const responseText = await generateAIResponse(updatedHistory, msg.text);
        
        const aiMsg: Message = {
            id: Date.now().toString() + '_ai',
            senderId: 'AI_AGENT_GEMINI',
            text: responseText,
            timestamp: Date.now(),
            isAiGenerated: true
        };
        store.addMessage(session.id, aiMsg);
        setIsTyping(false);
    }
  };

  // --- Media Handling ---

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      // Check size limit (5MB)
      if (file.size > 5000000) {
          alert("File too large (Max 5MB)");
          return;
      }
      
      try {
          const base64 = await fileToBase64(file);
          // Treat video as audio/file for now
          if (file.type.startsWith('audio') || file.type.startsWith('video/')) {
               handleSendMessage(undefined, { type: 'audio', url: base64, mimeType: file.type });
          } else {
               handleSendMessage(undefined, { type: 'image', url: base64, mimeType: file.type });
          }
      } catch(e) {
          alert("Error reading file");
      }
  };

  const startRecording = async () => {
      if (isProcessingAudio) return;
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          alert("Audio recording is not supported in this browser.");
          return;
      }

      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mimeType = getSupportedMimeType();
          
          if (!mimeType) {
              alert("Compatible audio format not found.");
              return;
          }

          const recorder = new MediaRecorder(stream, { mimeType });
          mediaRecorderRef.current = recorder;
          chunksRef.current = []; // Reset chunks
          
          recorder.ondataavailable = (e) => {
              if (e.data.size > 0) {
                  chunksRef.current.push(e.data);
              }
          };
          
          recorder.onstop = () => {
              setIsProcessingAudio(true);
              const blob = new Blob(chunksRef.current, { type: mimeType });
              
              // Safety check: Empty recording
              if (blob.size < 100) {
                  setIsProcessingAudio(false);
                  setIsRecording(false);
                  return;
              }

              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = () => {
                  const base64 = reader.result as string;
                  handleSendMessage(undefined, { type: 'audio', url: base64, mimeType: mimeType });
                  setIsProcessingAudio(false);
              };
              
              // Stop all tracks
              stream.getTracks().forEach(t => t.stop());
          };
          
          recorder.start();
          setIsRecording(true);
          setRecordingDuration(0);
          
          // Auto stop after 60 seconds to respect Firestore document size limits
          recordingTimerRef.current = setInterval(() => {
              setRecordingDuration(prev => {
                  if (prev >= 59) {
                      stopRecording();
                      return 60;
                  }
                  return prev + 1;
              });
          }, 1000);

      } catch (e) {
          console.error("Mic error", e);
          alert("Microphone access denied. Please check your permissions.");
          setIsRecording(false);
      }
  };

  const stopRecording = () => {
      if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
  };

  const toggleSpeechToText = () => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          alert("Speech recognition not supported in this browser (Try Chrome)");
          return;
      }

      if (isListening) {
          setIsListening(false);
      } else {
          try {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            
            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onerror = (e: any) => {
                console.error("STT Error", e);
                setIsListening(false);
            };
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setNewMessage(prev => (prev ? prev + ' ' : '') + transcript);
            };
            
            recognition.start();
          } catch(e) {
            console.error(e);
            alert("Could not start speech recognition.");
          }
      }
  };

  const handleCallClick = () => {
    if (!session) return;
    if (session.counselorId === 'AI_AGENT_GEMINI') {
        setIsAICallOpen(true);
    } else {
        // If call is incoming, we are ANSWERING, so isInitiator = false
        if (isIncomingCall) {
            setIsCallInitiator(false);
        } else {
            // If no incoming call, we are STARTING it, so isInitiator = true
            setIsCallInitiator(true);
        }
        setIsHumanCallOpen(true);
        setIsIncomingCall(false); // Hide incoming indicator
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!session) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div></div>;

  if (showRating) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
              <div className="bg-yellow-100 p-6 rounded-full mb-6">
                  <Star size={48} className="text-yellow-500" fill="currentColor" />
              </div>
              <h2 className="text-3xl font-bold mb-3 dark:text-white">Great Session!</h2>
              <Button onClick={() => navigate(user?.role === UserRole.COUNSELOR ? '/counselor' : '/home')} size="lg">Return Home</Button>
          </div>
      );
  }

  if (session.status === SessionStatus.PENDING) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-32 h-32 bg-violet-100 rounded-full flex items-center justify-center mb-8 relative">
                  <div className="absolute inset-0 border-4 border-violet-200 rounded-full animate-ping opacity-50"></div>
                  <Heart size={48} className="text-violet-500 animate-pulse" fill="currentColor" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Finding a Listener...</h2>
              <Button variant="ghost" className="mt-12 text-red-400" onClick={() => handleEndSession(session)}>Cancel Request</Button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-orange-50 dark:border-slate-800 overflow-hidden relative">
      
      <LiveVoiceModal isOpen={isAICallOpen} onClose={() => setIsAICallOpen(false)} />
      
      <HumanCallModal 
         isOpen={isHumanCallOpen} 
         onClose={() => setIsHumanCallOpen(false)} 
         sessionId={session.id} 
         isInitiator={isCallInitiator}
      />

      {/* Chat Header */}
      <div className="flex items-center justify-between px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800">
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-slate-900 font-bold shadow-sm ${session.counselorId === 'AI_AGENT_GEMINI' ? 'bg-violet-200 text-violet-900' : 'bg-green-200 text-green-900'}`}>
                {session.counselorId === 'AI_AGENT_GEMINI' ? <Sparkles size={24} /> : <UserIcon size={24} />}
            </div>
            <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                    {partnerName}
                </h3>
                <span className="flex items-center gap-1 text-xs font-bold text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full w-fit">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Online
                </span>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
            {/* Universal Call Button */}
            <button 
                onClick={handleCallClick}
                className={`p-3 rounded-xl transition-all duration-500 flex items-center gap-2 ${
                  isIncomingCall 
                    ? 'bg-green-500 text-white animate-bounce shadow-lg shadow-green-500/50 ring-4 ring-green-200' 
                    : 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                }`}
                title={isIncomingCall ? "Answer Call" : "Voice Call"}
            >
                <Phone size={20} fill={isIncomingCall ? "currentColor" : "none"} />
                {isIncomingCall && <span className="font-bold text-sm">Answer</span>}
            </button>

            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${remainingTime < 60 ? 'bg-red-100 text-red-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                <Clock size={16} />
                {formatTime(remainingTime)}
            </div>
            <button onClick={() => handleEndSession(session)} className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500 transition-colors">
                <LogOut size={20} />
            </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FFF9F0]/50 dark:bg-slate-950/50">
        {session.messages.map((msg) => {
            const isMe = msg.senderId === user?.id;
            return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-3xl px-6 py-4 shadow-sm ${
                        isMe 
                        ? 'bg-blue-200 text-blue-900 rounded-tr-sm' 
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-100 dark:border-slate-700'
                    }`}>
                        {msg.attachment && msg.attachment.type === 'image' && (
                            <img src={msg.attachment.url} alt="attachment" className="rounded-xl mb-2 max-h-64 object-cover" />
                        )}
                        
                        {msg.attachment && msg.attachment.type === 'audio' && (
                            <div className="mb-2">
                                <AudioPlayer src={msg.attachment.url} />
                            </div>
                        )}

                        {msg.text && <p className="leading-relaxed text-[15px] font-medium whitespace-pre-wrap">{msg.text}</p>}
                        
                        <span className={`text-[10px] block mt-2 font-bold ${isMe ? 'text-blue-700/50' : 'text-slate-300'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                </div>
            );
        })}
        {isTyping && (
            <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 rounded-3xl rounded-tl-sm px-6 py-4 shadow-sm flex gap-1.5 items-center">
                    <span className="w-2 h-2 bg-violet-300 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-violet-300 rounded-full animate-bounce delay-100"></span>
                    <span className="w-2 h-2 bg-violet-300 rounded-full animate-bounce delay-200"></span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800">
        <form onSubmit={(e) => handleSendMessage(e)} className="flex items-center gap-2">
            {/* Attachments */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,audio/*,video/mp4,video/webm" 
                onChange={handleFileSelect} 
            />
            <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-2xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                disabled={isRecording || isProcessingAudio}
            >
                <Paperclip size={20} />
            </button>

            <div className="flex-1 relative">
                <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isRecording ? `Recording... ${formatTime(recordingDuration)} / 1:00` : (isProcessingAudio ? "Processing Audio..." : "Type your message...")}
                    disabled={isRecording || isProcessingAudio}
                    className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-200 transition-all pr-12"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button 
                        type="button"
                        onClick={toggleSpeechToText}
                        className={`p-2 rounded-xl transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Speech to Text"
                        disabled={isRecording}
                    >
                        <Mic size={18} />
                    </button>
                </div>
            </div>

            {/* Voice Record Button */}
             <button 
                type="button"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={isProcessingAudio}
                className={`p-3 rounded-2xl transition-all ${
                    isRecording 
                    ? 'bg-red-500 text-white scale-110 ring-4 ring-red-200' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                }`}
            >
                <div className={`${isRecording ? 'animate-pulse' : ''}`}>
                    {isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
                </div>
            </button>

            <Button 
                type="submit" 
                className="w-14 h-14 !px-0 rounded-2xl flex-shrink-0" 
                disabled={(!newMessage.trim() && !isRecording) || isProcessingAudio} 
                variant="primary"
            >
                {isProcessingAudio ? <Loader2 className="animate-spin" /> : <Send size={22} />}
            </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatSessionPage;
