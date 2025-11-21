
import { PricingPlan, PlanType } from './types';

export const AI_COUNSELOR_ID = 'AI_AGENT_GEMINI';

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'p_10',
    label: 'Quick Vent',
    cost: 0,
    durationMinutes: 10,
    description: 'A quick 10-minute session to let off steam.',
    type: PlanType.HUMAN
  },
  {
    id: 'p_ai_free',
    label: 'AI Quick Chat',
    cost: 0,
    durationMinutes: 5,
    description: 'Try our AI Counselor for free (5 mins).',
    type: PlanType.AI
  },
  {
    id: 'p_15',
    label: 'Short Talk',
    cost: 1,
    durationMinutes: 15,
    description: '15 minutes of dedicated listening.',
    type: PlanType.HUMAN
  },
  {
    id: 'p_ai_30',
    label: 'AI Companion',
    cost: 5, // Updated to be a bit more premium than free
    durationMinutes: 30,
    description: 'Instant support from our Gemini AI Counselor.',
    type: PlanType.AI
  },
  {
    id: 'p_30',
    label: 'Deep Dive',
    cost: 5,
    durationMinutes: 30,
    description: '30 minutes to explore your thoughts.',
    type: PlanType.HUMAN
  },
  {
    id: 'p_60',
    label: 'Full Session',
    cost: 10,
    durationMinutes: 60,
    description: 'An hour of complete focus on you.',
    type: PlanType.HUMAN
  },
  {
    id: 'p_unlimited',
    label: 'Monthly Pass',
    cost: 100,
    durationMinutes: 9999,
    description: 'Unlimited sessions for a whole month.',
    type: PlanType.HUMAN
  }
];
