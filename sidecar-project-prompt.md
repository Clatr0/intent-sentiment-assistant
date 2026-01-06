# Sidecar: AI Management Communication Assistant

## Project Vision

Build a privacy-first desktop application that helps engineering leaders and managers resolve workplace issues faster by analyzing communication across Slack, Zoom, and Gmail. The core value proposition is **removing emotion and ambiguity from work** — surfacing intent, connecting related problems across channels, and suggesting resolution paths.

This is NOT a meeting notes tool or search tool. It's a **situation resolution engine** that treats complex interpersonal/project issues like case files to be actively managed toward closure.

## Core Principles

1. **Privacy-first architecture**: Sensitive analysis stays local. Only anonymized patterns go to cloud models if needed.
2. **Async-first**: Post-conversation synthesis, not real-time coaching (for MVP).
3. **Personal tool**: Individual manager owns their data, not org-level analytics.
4. **Intent over content**: Focus on *why* things were said and *what's unresolved*, not transcription.

## Target User

VP/Director-level engineering leaders managing:
- 10-50+ direct/indirect reports
- Multiple concurrent projects
- Cross-functional stakeholders
- Personnel situations requiring nuanced handling

## MVP Feature Set

### 1. Integration Layer
- **Slack**: OAuth integration, read access to DMs and channels user is member of
- **Gmail**: OAuth integration, read access to inbox/sent
- **Zoom**: OAuth integration, access to cloud recordings and transcripts
- Store credentials securely in system keychain

### 2. Situation Tracking
- User can create "Situations" (case files) with:
  - Title and brief description
  - Tagged people involved
  - Linked conversations/threads/recordings across any integrated channel
- Situations have status: Active, Monitoring, Resolved

### 3. Communication Ingestion
- Pull relevant communications for tagged situations
- Extract and store:
  - Raw content (encrypted at rest)
  - Participants and timestamps
  - Channel/medium metadata
  - Threaded conversation structure

### 4. Analysis Engine
- For each Situation, generate:
  - **Stakeholder map**: Who's involved, their stated positions
  - **Intent inference**: What each party likely wants/needs (beyond what they said)
  - **Tone trajectory**: How communication tone has evolved over time
  - **Unresolved threads**: Questions asked but not answered, commitments made but not confirmed
  - **Risk signals**: Disengagement patterns, escalating tension, misalignment indicators

### 5. Resolution Support
- **Situation Brief**: On-demand summary with current state and recommended next actions
- **Suggested questions**: What to ask in next interaction to move toward resolution
- **Connection detection**: "This may be related to [other Situation]" based on people/topics

## Technical Architecture

### Stack Recommendation
- **Runtime**: Electron or Tauri (prefer Tauri for security/performance)
- **Frontend**: React + TypeScript
- **Local Storage**: SQLite with SQLCipher encryption
- **Local LLM**: Ollama integration for sensitive analysis (llama3, mistral, or similar)
- **Cloud LLM**: Anthropic Claude API for complex reasoning (anonymized data only)
- **Language**: TypeScript throughout, Rust for Tauri backend if using Tauri

### Data Flow
```
[Slack/Gmail/Zoom APIs] 
    → [Ingestion Service] 
    → [Encrypted Local DB]
    → [Local LLM: Sensitive Analysis]
    → [Anonymizer]
    → [Cloud LLM: Complex Reasoning]
    → [UI: Situation Dashboard]
```

### Privacy Architecture
- All PII and raw communications stored only locally, encrypted at rest
- Local LLM handles: tone analysis, intent inference on raw text
- Cloud LLM receives only: anonymized summaries, pattern descriptions, reasoning queries
- User can audit exactly what leaves their machine

## File Structure (Initial Scaffold)

```
sidecar/
├── src/
│   ├── main/                    # Electron/Tauri main process
│   │   ├── integrations/
│   │   │   ├── slack.ts
│   │   │   ├── gmail.ts
│   │   │   └── zoom.ts
│   │   ├── database/
│   │   │   ├── schema.ts
│   │   │   └── encryption.ts
│   │   ├── analysis/
│   │   │   ├── local-llm.ts
│   │   │   ├── cloud-llm.ts
│   │   │   └── anonymizer.ts
│   │   └── index.ts
│   ├── renderer/                # React frontend
│   │   ├── components/
│   │   │   ├── SituationList.tsx
│   │   │   ├── SituationDetail.tsx
│   │   │   ├── StakeholderMap.tsx
│   │   │   ├── Timeline.tsx
│   │   │   └── Brief.tsx
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── App.tsx
│   └── shared/
│       └── types.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Data Models

```typescript
interface Situation {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'monitoring' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
  participants: Participant[];
  communications: Communication[];
  analysis?: SituationAnalysis;
}

interface Participant {
  id: string;
  name: string;
  email?: string;
  slackId?: string;
  role?: string;  // Their role in this situation
  statedPosition?: string;
  inferredIntent?: string;
}

interface Communication {
  id: string;
  situationId: string;
  source: 'slack' | 'gmail' | 'zoom';
  sourceId: string;  // Original ID in source system
  timestamp: Date;
  participants: string[];  // Participant IDs
  contentEncrypted: string;  // Encrypted raw content
  metadata: {
    channel?: string;
    subject?: string;
    threadId?: string;
    duration?: number;  // For calls
  };
}

interface SituationAnalysis {
  generatedAt: Date;
  summary: string;
  stakeholderAnalysis: StakeholderAnalysis[];
  toneTrajectory: ToneDataPoint[];
  unresolvedThreads: UnresolvedThread[];
  riskSignals: RiskSignal[];
  suggestedActions: SuggestedAction[];
  relatedSituations: string[];  // Situation IDs
}

interface ToneDataPoint {
  timestamp: Date;
  participant: string;
  sentiment: number;  // -1 to 1
  markers: string[];  // "shorter responses", "formal language shift", etc.
}

interface RiskSignal {
  type: 'disengagement' | 'escalation' | 'misalignment' | 'blocker';
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: string[];  // References to communications
}

interface SuggestedAction {
  priority: number;
  action: string;
  rationale: string;
  suggestedQuestions?: string[];
}
```

## Phase 1 Deliverables (MVP)

1. **Working desktop app** with basic UI shell
2. **Slack integration** working (OAuth flow, message fetching)
3. **Local database** with encryption
4. **Situation CRUD** operations
5. **Basic analysis** using local LLM for a single situation
6. **Situation Brief** generation

## Phase 2 (Fast Follow)

1. Gmail integration
2. Zoom transcript integration
3. Cross-situation connection detection
4. Tone trajectory visualization
5. Cloud LLM integration with anonymization

## Development Notes

- Start with Slack integration only — it's the highest-signal channel for workplace dynamics
- Use Ollama with llama3:8b for local inference initially (good balance of quality/speed)
- Prioritize the "Situation Brief" output — that's the core value demonstration
- Build the anonymizer early, even if not using cloud LLM yet — it forces good architecture

## Success Criteria for MVP

A VP of Engineering can:
1. Connect their Slack account
2. Create a Situation for an ongoing team issue
3. Tag relevant Slack conversations
4. Generate a Situation Brief that accurately captures:
   - What each party wants
   - What's not being said directly
   - What questions to ask next

If the Brief saves them 30 minutes of re-reading threads and helps them see something they missed, MVP is validated.

---

## Prompt for IDE

Use the above specification to scaffold this project. Start with:

1. Initialize a Tauri + React + TypeScript project
2. Set up the file structure as specified
3. Implement the data models in `src/shared/types.ts`
4. Create the SQLite schema with SQLCipher encryption
5. Build out the Slack OAuth integration skeleton
6. Create the basic UI shell with Situation list and detail views

Prioritize getting a working end-to-end flow over feature completeness. We want to be able to create a Situation, manually add some test data, and generate a basic analysis as quickly as possible.
