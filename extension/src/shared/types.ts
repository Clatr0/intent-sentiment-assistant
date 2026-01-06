// Sidecar Chrome Extension - Shared Types

// ============================================================================
// Situation Types
// ============================================================================

export type SituationStatus = 'active' | 'monitoring' | 'resolved';

export interface Situation {
  id: string;
  title: string;
  description: string;
  status: SituationStatus;
  createdAt: string; // ISO string for storage
  updatedAt: string;
  participants: Participant[];
  communications: Communication[];
  analysis?: SituationAnalysis;
}

export interface Participant {
  id: string;
  name: string;
  email?: string;
  slackId?: string;
  role?: string;
  statedPosition?: string;
  inferredIntent?: string;
}

// ============================================================================
// Communication Types
// ============================================================================

export type CommunicationSource = 'slack' | 'gmail' | 'zoom' | 'manual';

export interface Communication {
  id: string;
  situationId: string;
  source: CommunicationSource;
  sourceId: string;
  sourceUrl?: string; // URL to original message
  timestamp: string;
  participants: string[];
  content: string; // Stored encrypted in production
  metadata: CommunicationMetadata;
}

export interface CommunicationMetadata {
  channel?: string;
  channelId?: string;
  subject?: string;
  threadId?: string;
  duration?: number;
  isThread?: boolean;
}

// ============================================================================
// Analysis Types
// ============================================================================

export interface SituationAnalysis {
  generatedAt: string;
  summary: string;
  stakeholderAnalysis: StakeholderAnalysis[];
  toneTrajectory: ToneDataPoint[];
  unresolvedThreads: UnresolvedThread[];
  riskSignals: RiskSignal[];
  suggestedActions: SuggestedAction[];
  relatedSituations: string[];
}

export interface StakeholderAnalysis {
  participantId: string;
  statedPosition: string;
  inferredIntent: string;
  communicationStyle: string;
  engagementLevel: 'high' | 'medium' | 'low';
}

export interface ToneDataPoint {
  timestamp: string;
  participant: string;
  sentiment: number; // -1 to 1
  markers: string[];
}

export interface UnresolvedThread {
  id: string;
  description: string;
  raisedBy: string;
  raisedAt: string;
  type: 'question' | 'commitment' | 'decision' | 'action_item';
  context: string;
}

export type RiskSignalType = 'disengagement' | 'escalation' | 'misalignment' | 'blocker';
export type RiskSeverity = 'low' | 'medium' | 'high';

export interface RiskSignal {
  type: RiskSignalType;
  severity: RiskSeverity;
  description: string;
  evidence: string[];
}

export interface SuggestedAction {
  priority: number;
  action: string;
  rationale: string;
  suggestedQuestions?: string[];
}

// ============================================================================
// Brief Types
// ============================================================================

export interface SituationBrief {
  situationId: string;
  generatedAt: string;
  title: string;
  summary: string;
  stakeholders: BriefStakeholder[];
  unresolvedItems: UnresolvedThread[];
  suggestedNextSteps: SuggestedAction[];
  riskLevel: RiskSeverity;
  topRisks: RiskSignal[];
}

export interface BriefStakeholder {
  participantId: string;
  name: string;
  role: string;
  currentStance: string;
  recentTone: 'positive' | 'neutral' | 'negative' | 'mixed';
  keyPoints: string[];
  suggestedApproach: string;
}

// ============================================================================
// Settings Types
// ============================================================================

export interface ExtensionSettings {
  localLlmEndpoint: string;
  localLlmModel: string;
  cloudLlmEnabled: boolean;
  cloudLlmApiKey?: string;
  theme: 'light' | 'dark' | 'system';
  autoCapture: boolean;
  captureSlack: boolean;
  captureGmail: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  localLlmEndpoint: 'http://localhost:11434',
  localLlmModel: 'llama3:8b',
  cloudLlmEnabled: false,
  theme: 'system',
  autoCapture: false,
  captureSlack: true,
  captureGmail: true,
};

// ============================================================================
// Message Types (for extension communication)
// ============================================================================

export type MessageType =
  | 'GET_SITUATIONS'
  | 'GET_SITUATION'
  | 'CREATE_SITUATION'
  | 'UPDATE_SITUATION'
  | 'DELETE_SITUATION'
  | 'ADD_COMMUNICATION'
  | 'CAPTURE_SELECTION'
  | 'GENERATE_BRIEF'
  | 'ANALYZE_SITUATION'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'OPEN_SIDEPANEL';

export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload?: T;
}

export interface ExtensionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Captured Content Types
// ============================================================================

export interface CapturedContent {
  source: CommunicationSource;
  sourceUrl: string;
  content: string;
  participants: string[];
  timestamp: string;
  metadata: CommunicationMetadata;
}

export interface SlackMessageCapture {
  messageId: string;
  channelId: string;
  channelName: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
  threadTs?: string;
  url: string;
}

export interface GmailThreadCapture {
  threadId: string;
  subject: string;
  participants: string[];
  messages: Array<{
    id: string;
    from: string;
    to: string[];
    date: string;
    snippet: string;
  }>;
  url: string;
}
