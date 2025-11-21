
import React, { useEffect, useRef, useState } from 'react';
import { store } from '../services/store';
import { CallSignal } from '../types';
import { Phone, PhoneOff, Mic, MicOff, Volume2, Loader2 } from 'lucide-react';

interface HumanCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  isInitiator: boolean;
}

const HumanCallModal: React.FC<HumanCallModalProps> = ({ isOpen, onClose, sessionId, isInitiator }) => {
  const [status, setStatus] = useState<'connecting' | 'ringing' | 'connected' | 'ended' | 'failed'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const processedCandidates = useRef<Set<string>>(new Set());
  const candidateQueue = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    
    const startCall = async () => {
      try {
        setStatus(isInitiator ? 'connecting' : 'ringing');

        // 1. Get User Media
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;

        // 2. Create Peer Connection with Robust STUN servers
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        });
        pcRef.current = pc;

        // Add local tracks
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Handle remote tracks
        pc.ontrack = (event) => {
          if (remoteAudioRef.current && event.streams[0]) {
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch(e => console.error("Remote audio play error", e));
            if (mounted) setStatus('connected');
          }
        };

        // Handle ICE Candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            store.addIceCandidate(sessionId, event.candidate.toJSON(), isInitiator ? 'caller' : 'callee');
          }
        };

        // --- Signaling Logic ---
        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await store.initCall(sessionId, { type: offer.type, sdp: offer.sdp });
        } 

        // Subscribe to signaling updates
        const unsubscribe = store.subscribeToCall(sessionId, async (data: CallSignal) => {
          if (!pcRef.current) return;
          const pc = pcRef.current;

          if (data.status === 'ended') {
            handleEndCall();
            return;
          }

          // Handle Offer (if we are callee)
          if (!isInitiator && data.offer && pc.signalingState === "stable") {
             try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                // Process queued candidates now that remote description is set
                await processCandidateQueue();
                
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await store.answerCall(sessionId, { type: answer.type, sdp: answer.sdp });
                if (mounted) setStatus('connected');
             } catch (e) {
                 console.error("Error handling offer", e);
             }
          }

          // Handle Answer (if we are caller)
          if (isInitiator && data.answer && pc.signalingState === "have-local-offer") {
             try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                await processCandidateQueue();
                if (mounted) setStatus('connected');
             } catch (e) {
                 console.error("Error handling answer", e);
             }
          }

          // Handle Candidates
          const candidates = isInitiator ? data.calleeCandidates : data.callerCandidates;
          for (const cand of candidates) {
             const candStr = JSON.stringify(cand);
             if (!processedCandidates.current.has(candStr)) {
                processedCandidates.current.add(candStr);
                
                if (!pc.remoteDescription) {
                    // Buffer candidates if remote description isn't ready
                    candidateQueue.current.push(cand);
                } else {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(cand));
                    } catch(e) {
                        console.warn("ICE Candidate error", e);
                    }
                }
             }
          }
        });

        return () => {
            unsubscribe();
        };

      } catch (err) {
        console.error("Call setup failed", err);
        if (mounted) setStatus('failed');
      }
    };

    startCall();

    return () => {
      mounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, [isOpen]);

  const processCandidateQueue = async () => {
      if (!pcRef.current) return;
      while (candidateQueue.current.length > 0) {
          const c = candidateQueue.current.shift();
          if (c) {
              try {
                  await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
              } catch (e) {
                  console.warn("Buffered ICE Candidate error", e);
              }
          }
      }
  };

  const handleEndCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
    }
    setStatus('ended');
    store.endCall(sessionId).catch(() => {});
    setTimeout(onClose, 1500);
  };

  // Toggle Mute
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/95 backdrop-blur-md animate-fade-in">
       {/* Hidden audio element for remote stream */}
       <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
       
       <div className="flex flex-col items-center w-full max-w-md p-8 text-center">
          <div className="mb-8 relative">
             {status === 'connected' && (
                <div className="absolute inset-0 bg-green-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
             )}
             <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center border-4 border-slate-700 z-10 relative">
                {status === 'connecting' || status === 'ringing' ? (
                    <Loader2 size={48} className="text-slate-400 animate-spin" />
                ) : (
                    <Volume2 size={48} className="text-green-400" />
                )}
             </div>
          </div>

          <h3 className="text-2xl font-bold text-white mb-2">
            {status === 'connecting' && 'Calling...'}
            {status === 'ringing' && 'Connecting...'}
            {status === 'connected' && 'Connected'}
            {status === 'failed' && 'Connection Failed'}
            {status === 'ended' && 'Call Ended'}
          </h3>
          <p className="text-slate-400 font-medium mb-12">
             {status === 'connected' ? 'Speak safely.' : 'Establishing secure line...'}
          </p>

          {status !== 'ended' && status !== 'failed' && (
              <div className="flex items-center gap-6">
                 <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-6 rounded-full transition-all ${isMuted ? 'bg-white text-slate-900' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                 >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                 </button>

                 <button 
                    onClick={handleEndCall}
                    className="p-6 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 hover:scale-110 transition-all"
                 >
                    <PhoneOff size={28} fill="currentColor" />
                 </button>
              </div>
          )}
          
          {(status === 'ended' || status === 'failed') && (
              <button onClick={onClose} className="px-8 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700">Close</button>
          )}
       </div>
    </div>
  );
};

export default HumanCallModal;
