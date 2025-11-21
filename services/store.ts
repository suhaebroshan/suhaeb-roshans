
import { ChatSession, Message, SessionStatus, User, UserRole, CallSignal } from '../types';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  updateDoc, 
  onSnapshot, 
  setDoc, 
  query,
  where,
  getDocs,
  arrayUnion
} from 'firebase/firestore';

const STORAGE_KEY = 'trust_app_data';
const HEARTBEAT_INTERVAL = 60000; // 1 minute

interface StoreData {
  users: User[];
  sessions: ChatSession[];
}

type Listener = () => void;

class HybridStore {
  private listeners: Set<Listener> = new Set();
  private data: StoreData = { users: [], sessions: [] };
  private isFirebaseActive = false;
  private unsubscribes: (() => void)[] = [];
  private heartbeatInterval: any;

  constructor() {
    if (db) {
      this.isFirebaseActive = true;
      this.initFirebaseListeners();
    } else {
      this.loadLocal();
      window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) {
          this.loadLocal();
          this.notify();
        }
      });
    }
  }

  private initFirebaseListeners() {
    if (!db) return;

    // Listen to Users
    const qUsers = query(collection(db, "users"));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      this.data.users = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
      this.notify();
    });
    this.unsubscribes.push(unsubUsers);

    // Listen to Sessions
    const qSessions = query(collection(db, "sessions"));
    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      this.data.sessions = snapshot.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data } as ChatSession;
      });
      this.notify();
    });
    this.unsubscribes.push(unsubSessions);
  }

  private loadLocal() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.data = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load store data", e);
    }
  }

  private saveLocal() {
    if (this.isFirebaseActive) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    this.notify();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // --- User Methods ---
  createUser(nickname: string, role: UserRole): User {
    const user: User = {
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      nickname,
      role,
      isOnline: true,
      lastSeen: Date.now()
    };

    if (this.isFirebaseActive && db) {
      this.data.users.push(user); 
      setDoc(doc(db, "users", user.id), user).catch(e => console.error("FB Error", e));
      this.startHeartbeat(user.id);
    } else {
      this.loadLocal();
      this.data.users.push(user);
      this.saveLocal();
    }
    return user;
  }

  startHeartbeat(userId: string) {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    
    const beat = () => {
      if (this.isFirebaseActive && db) {
        updateDoc(doc(db, "users", userId), { 
          lastSeen: Date.now(),
          isOnline: true 
        }).catch(() => {}); // Ignore errors on heartbeat
      }
    };
    
    beat(); // Initial beat
    this.heartbeatInterval = setInterval(beat, HEARTBEAT_INTERVAL);
  }

  getUser(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  // Counts users active in the last 5 minutes
  getUsersCount(): number {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    if (this.isFirebaseActive) {
      return this.data.users.filter(u => (u.lastSeen || 0) > fiveMinutesAgo).length;
    }
    return this.data.users.length;
  }

  // --- Session Methods ---
  createSession(session: ChatSession) {
    if (this.isFirebaseActive && db) {
      this.data.sessions.push(session);
      setDoc(doc(db, "sessions", session.id), session).catch(e => console.error("FB Error", e));
    } else {
      this.loadLocal();
      this.data.sessions.push(session);
      this.saveLocal();
    }
  }

  getSession(id: string): ChatSession | undefined {
    return this.data.sessions.find(s => s.id === id);
  }

  updateSession(id: string, updates: Partial<ChatSession>) {
    if (this.isFirebaseActive && db) {
       const index = this.data.sessions.findIndex(s => s.id === id);
       if (index !== -1) {
           this.data.sessions[index] = { ...this.data.sessions[index], ...updates };
           this.notify();
       }
       updateDoc(doc(db, "sessions", id), updates).catch(e => console.error("FB Error", e));
    } else {
      this.loadLocal();
      const index = this.data.sessions.findIndex(s => s.id === id);
      if (index !== -1) {
        this.data.sessions[index] = { ...this.data.sessions[index], ...updates };
        this.saveLocal();
      }
    }
  }

  addMessage(sessionId: string, message: Message) {
    if (this.isFirebaseActive && db) {
      const session = this.getSession(sessionId);
      if (session) {
        const newMessages = [...session.messages, message];
        session.messages = newMessages; // Optimistic
        this.notify();
        updateDoc(doc(db, "sessions", sessionId), { messages: newMessages }).catch(e => console.error("FB Error", e));
      }
    } else {
      this.loadLocal();
      const session = this.getSession(sessionId);
      if (session) {
        session.messages.push(message);
        this.saveLocal();
      }
    }
  }

  getSessionsByStatus(status: SessionStatus): ChatSession[] {
    return this.data.sessions.filter(s => s.status === status);
  }
  
  getAllSessions(): ChatSession[] {
    return this.data.sessions;
  }

  // --- Call Signaling Methods ---
  subscribeToCall(sessionId: string, callback: (data: CallSignal) => void) {
    if (!this.isFirebaseActive || !db) return () => {};
    
    return onSnapshot(doc(db, "calls", sessionId), (doc) => {
      if (doc.exists()) {
        callback(doc.data() as CallSignal);
      }
    });
  }

  async initCall(sessionId: string, offer: RTCSessionDescriptionInit) {
    if (!this.isFirebaseActive || !db) return;
    const callData: CallSignal = {
      sessionId,
      offer,
      callerCandidates: [],
      calleeCandidates: [],
      status: 'offering',
      createdAt: Date.now()
    };
    await setDoc(doc(db, "calls", sessionId), callData);
  }

  async answerCall(sessionId: string, answer: RTCSessionDescriptionInit) {
    if (!this.isFirebaseActive || !db) return;
    await updateDoc(doc(db, "calls", sessionId), {
      answer,
      status: 'answered'
    });
  }

  async addIceCandidate(sessionId: string, candidate: RTCIceCandidateInit, type: 'caller' | 'callee') {
    if (!this.isFirebaseActive || !db) return;
    if (type === 'caller') {
      await updateDoc(doc(db, "calls", sessionId), {
        callerCandidates: arrayUnion(candidate)
      });
    } else {
      await updateDoc(doc(db, "calls", sessionId), {
        calleeCandidates: arrayUnion(candidate)
      });
    }
  }

  async endCall(sessionId: string) {
    if (!this.isFirebaseActive || !db) return;
    await updateDoc(doc(db, "calls", sessionId), { status: 'ended' });
  }
}

export const store = new HybridStore();