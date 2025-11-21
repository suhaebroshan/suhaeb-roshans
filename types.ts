
export enum UserRole {
  USER = 'USER',
  COUNSELOR = 'COUNSELOR',
  ADMIN = 'ADMIN'
}

export enum PlanType {
  HUMAN = 'HUMAN',
  AI = 'AI'
}

export enum SessionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED'
}

export interface PricingPlan {
  id: string;
  durationMinutes: number;
  cost: number;
  label: string;
  description: string;
  type: PlanType;
}

export interface User {
  id: string;
  nickname: string;
  role: UserRole;
  isOnline?: boolean;
  lastSeen?: number; // Timestamp for heartbeat
}

export interface Attachment {
  type: 'image' | 'audio';
  url: string; // Base64 data string
  mimeType?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isAiGenerated?: boolean;
  attachment?: Attachment;
}

export interface ChatSession {
  id: string;
  userId: string;
  counselorId?: string; // "AI_AGENT_GEMINI" if AI
  status: SessionStatus;
  plan: PricingPlan;
  startTime?: number; // timestamp when status became ACTIVE
  messages: Message[];
  createdAt: number;
  rating?: number;
  feedback?: string;
}

// WebRTC Signaling Data
export interface CallSignal {
  sessionId: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  callerCandidates: RTCIceCandidateInit[];
  calleeCandidates: RTCIceCandidateInit[];
  status: 'offering' | 'answered' | 'ended';
  createdAt: number;
}

// Payment Mock Interface
export interface PaymentDetails {
  cardNumber: string;
  expiry: string;
  cvv: string;
  name: string;
}