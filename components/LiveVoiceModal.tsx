import React, { useEffect, useRef, useState } from 'react';
import { getLiveClient } from '../services/gemini';
import { Modality, LiveServerMessage } from '@google/genai';
import { Mic, MicOff, PhoneOff, Volume2, Loader2 } from 'lucide-react';
import Button from './Button';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper functions for Audio
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): { data: string, mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return {
    data: btoa(binary),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0); // For visualizer

  // Refs for audio processing
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    const startSession = async () => {
      try {
        setStatus('connecting');
        
        // 1. Setup Audio Contexts
        const InputContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        inputAudioContextRef.current = new InputContextClass({ sampleRate: 16000 });
        
        const OutputContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        outputAudioContextRef.current = new OutputContextClass({ sampleRate: 24000 });
        
        // Resume contexts immediately to handle browser autoplay policies
        if(outputAudioContextRef.current.state === 'suspended') {
            await outputAudioContextRef.current.resume();
        }
        
        const outputNode = outputAudioContextRef.current.createGain();
        outputNode.connect(outputAudioContextRef.current.destination);

        // 2. Get User Media
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // 3. Connect to Gemini Live
        const liveClient = getLiveClient();
        
        const sessionPromise = liveClient.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: () => {
              if (!mounted) return;
              setStatus('connected');
              
              // Setup Microphone Streaming
              if (!inputAudioContextRef.current) return;
              const source = inputAudioContextRef.current.createMediaStreamSource(stream);
              const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
              scriptProcessorRef.current = processor;
              
              processor.onaudioprocess = (e) => {
                 if (isMuted) return;
                 const inputData = e.inputBuffer.getChannelData(0);
                 // Simple volume visualizer
                 let sum = 0;
                 for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                 setVolume(Math.sqrt(sum / inputData.length) * 5);

                 const pcmBlob = createBlob(inputData);
                 
                 sessionPromise.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                 });
              };
              
              source.connect(processor);
              processor.connect(inputAudioContextRef.current.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
               if (!mounted) return;
               
               const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
               if (base64Audio && outputAudioContextRef.current) {
                   const ctx = outputAudioContextRef.current;
                   nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                   
                   const audioBuffer = await decodeAudioData(
                       decode(base64Audio),
                       ctx,
                       24000,
                       1
                   );
                   
                   const source = ctx.createBufferSource();
                   source.buffer = audioBuffer;
                   source.connect(outputNode);
                   source.addEventListener('ended', () => {
                       sourcesRef.current.delete(source);
                   });
                   source.start(nextStartTimeRef.current);
                   nextStartTimeRef.current += audioBuffer.duration;
                   sourcesRef.current.add(source);
               }

               if (message.serverContent?.interrupted) {
                   sourcesRef.current.forEach(s => s.stop());
                   sourcesRef.current.clear();
                   nextStartTimeRef.current = 0;
               }
            },
            onclose: () => {
               console.log("Live session closed");
            },
            onerror: (err) => {
               console.error("Live session error", err);
               if(mounted) setStatus('error');
            }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            },
            systemInstruction: "You are TRUST, a warm, empathetic AI therapist. Speak in a soothing, calm voice. Keep responses concise and natural, like a real human listener.",
          }
        });
        
        sessionRef.current = sessionPromise;

      } catch (e) {
          console.error("Failed to start live session", e);
          setStatus('error');
      }
    };

    startSession();

    return () => {
        mounted = false;
        cleanup();
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Mute Toggle within the processor logic via Ref, but update state for UI
  useEffect(() => {
     // The visualizer logic inside onaudioprocess reads the state
  }, [isMuted]);

  const cleanup = () => {
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (scriptProcessorRef.current) {
          try {
            scriptProcessorRef.current.disconnect();
          } catch (e) { /* ignore */ }
      }
      
      const closeContext = async (ctx: AudioContext | null) => {
          if (ctx && ctx.state !== 'closed') {
              try {
                  await ctx.close();
              } catch (e) {
                  console.warn("Error closing audio context", e);
              }
          }
      };

      closeContext(inputAudioContextRef.current);
      closeContext(outputAudioContextRef.current);
  };

  const handleClose = () => {
      cleanup();
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-md animate-fade-in">
        <div className="flex flex-col items-center w-full max-w-md p-8 text-center relative">
            
            {status === 'connecting' && (
                <div className="mb-8">
                    <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center animate-pulse border-4 border-slate-700">
                        <Loader2 size={48} className="text-slate-400 animate-spin" />
                    </div>
                    <h3 className="text-white font-bold text-xl mt-8">Connecting secure line...</h3>
                </div>
            )}

            {status === 'connected' && (
                <div className="animate-fade-in w-full flex flex-col items-center">
                     <div className="relative mb-12">
                        {/* Visualizer Ring */}
                        <div 
                            className="absolute inset-0 bg-violet-500 rounded-full blur-2xl opacity-50 transition-all duration-75"
                            style={{ transform: `scale(${1 + volume})` }}
                        ></div>
                        
                        <div className="w-40 h-40 rounded-full bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center border-4 border-slate-700 shadow-2xl relative z-10">
                            <div className="w-32 h-32 rounded-full bg-slate-950 flex items-center justify-center">
                                <Volume2 size={48} className="text-violet-400" />
                            </div>
                        </div>
                     </div>

                     <h3 className="text-2xl font-bold text-white mb-2">Trust AI Voice</h3>
                     <p className="text-slate-400 font-medium mb-12">Listening...</p>

                     <div className="flex items-center gap-6">
                        <button 
                            onClick={() => setIsMuted(!isMuted)}
                            className={`p-6 rounded-full transition-all ${isMuted ? 'bg-white text-slate-900' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                        >
                            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>

                        <button 
                            onClick={handleClose}
                            className="p-6 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 hover:scale-110 transition-all"
                        >
                            <PhoneOff size={28} fill="currentColor" />
                        </button>
                     </div>
                </div>
            )}

            {status === 'error' && (
                <div>
                    <p className="text-red-400 font-bold mb-4">Connection Failed</p>
                    <p className="text-slate-500 text-sm mb-6">Microphone access denied or network error.</p>
                    <Button onClick={handleClose} variant="outline">Close</Button>
                </div>
            )}

        </div>
    </div>
  );
};

export default LiveVoiceModal;