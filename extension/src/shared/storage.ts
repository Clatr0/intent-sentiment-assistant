// Chrome Extension Storage Utilities
import type {
  Situation,
  Communication,
  ExtensionSettings,
  DEFAULT_SETTINGS,
  SituationBrief
} from './types';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  SITUATIONS: 'sidecar_situations',
  SETTINGS: 'sidecar_settings',
  BRIEFS: 'sidecar_briefs',
  LAST_SYNC: 'sidecar_last_sync',
} as const;

// ============================================================================
// Situation Storage
// ============================================================================

export async function getSituations(): Promise<Situation[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SITUATIONS);
  return result[STORAGE_KEYS.SITUATIONS] || [];
}

export async function getSituation(id: string): Promise<Situation | undefined> {
  const situations = await getSituations();
  return situations.find(s => s.id === id);
}

export async function saveSituation(situation: Situation): Promise<void> {
  const situations = await getSituations();
  const index = situations.findIndex(s => s.id === situation.id);

  if (index >= 0) {
    situations[index] = situation;
  } else {
    situations.unshift(situation);
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.SITUATIONS]: situations });
}

export async function deleteSituation(id: string): Promise<void> {
  const situations = await getSituations();
  const filtered = situations.filter(s => s.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEYS.SITUATIONS]: filtered });

  // Also delete associated brief
  await deleteBrief(id);
}

export async function createSituation(
  title: string,
  description: string = ''
): Promise<Situation> {
  const now = new Date().toISOString();
  const situation: Situation = {
    id: generateId(),
    title,
    description,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    participants: [],
    communications: [],
  };

  await saveSituation(situation);
  return situation;
}

export async function updateSituation(
  id: string,
  updates: Partial<Omit<Situation, 'id' | 'createdAt'>>
): Promise<Situation | undefined> {
  const situation = await getSituation(id);
  if (!situation) return undefined;

  const updated: Situation = {
    ...situation,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveSituation(updated);
  return updated;
}

// ============================================================================
// Communication Storage
// ============================================================================

export async function addCommunication(
  situationId: string,
  communication: Omit<Communication, 'id' | 'situationId'>
): Promise<Communication | undefined> {
  const situation = await getSituation(situationId);
  if (!situation) return undefined;

  const newComm: Communication = {
    ...communication,
    id: generateId(),
    situationId,
  };

  situation.communications.push(newComm);
  situation.updatedAt = new Date().toISOString();

  await saveSituation(situation);
  return newComm;
}

export async function removeCommunication(
  situationId: string,
  communicationId: string
): Promise<void> {
  const situation = await getSituation(situationId);
  if (!situation) return;

  situation.communications = situation.communications.filter(
    c => c.id !== communicationId
  );
  situation.updatedAt = new Date().toISOString();

  await saveSituation(situation);
}

// ============================================================================
// Participant Storage
// ============================================================================

export async function addParticipant(
  situationId: string,
  participant: Omit<import('./types').Participant, 'id'>
): Promise<import('./types').Participant | undefined> {
  const situation = await getSituation(situationId);
  if (!situation) return undefined;

  const newParticipant = {
    ...participant,
    id: generateId(),
  };

  situation.participants.push(newParticipant);
  situation.updatedAt = new Date().toISOString();

  await saveSituation(situation);
  return newParticipant;
}

export async function removeParticipant(
  situationId: string,
  participantId: string
): Promise<void> {
  const situation = await getSituation(situationId);
  if (!situation) return;

  situation.participants = situation.participants.filter(
    p => p.id !== participantId
  );
  situation.updatedAt = new Date().toISOString();

  await saveSituation(situation);
}

// ============================================================================
// Brief Storage
// ============================================================================

export async function getBriefs(): Promise<Record<string, SituationBrief>> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.BRIEFS);
  return result[STORAGE_KEYS.BRIEFS] || {};
}

export async function getBrief(situationId: string): Promise<SituationBrief | undefined> {
  const briefs = await getBriefs();
  return briefs[situationId];
}

export async function saveBrief(brief: SituationBrief): Promise<void> {
  const briefs = await getBriefs();
  briefs[brief.situationId] = brief;
  await chrome.storage.local.set({ [STORAGE_KEYS.BRIEFS]: briefs });
}

export async function deleteBrief(situationId: string): Promise<void> {
  const briefs = await getBriefs();
  delete briefs[situationId];
  await chrome.storage.local.set({ [STORAGE_KEYS.BRIEFS]: briefs });
}

// ============================================================================
// Settings Storage
// ============================================================================

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
  const defaultSettings: ExtensionSettings = {
    localLlmEndpoint: 'http://localhost:11434',
    localLlmModel: 'llama3:8b',
    cloudLlmEnabled: false,
    theme: 'system',
    autoCapture: false,
    captureSlack: true,
    captureGmail: true,
  };
  return { ...defaultSettings, ...result[STORAGE_KEYS.SETTINGS] };
}

export async function updateSettings(
  updates: Partial<ExtensionSettings>
): Promise<ExtensionSettings> {
  const current = await getSettings();
  const updated = { ...current, ...updates };
  await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: updated });
  return updated;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function getStorageUsage(): Promise<{
  used: number;
  total: number;
  percentage: number;
}> {
  const bytesInUse = await chrome.storage.local.getBytesInUse();
  const quota = chrome.storage.local.QUOTA_BYTES;
  return {
    used: bytesInUse,
    total: quota,
    percentage: (bytesInUse / quota) * 100,
  };
}

export async function exportData(): Promise<string> {
  const situations = await getSituations();
  const settings = await getSettings();
  const briefs = await getBriefs();

  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    situations,
    settings,
    briefs,
  }, null, 2);
}

export async function importData(jsonData: string): Promise<void> {
  const data = JSON.parse(jsonData);

  if (data.situations) {
    await chrome.storage.local.set({ [STORAGE_KEYS.SITUATIONS]: data.situations });
  }
  if (data.settings) {
    await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: data.settings });
  }
  if (data.briefs) {
    await chrome.storage.local.set({ [STORAGE_KEYS.BRIEFS]: data.briefs });
  }
}

export async function clearAllData(): Promise<void> {
  await chrome.storage.local.clear();
  await chrome.storage.sync.clear();
}
