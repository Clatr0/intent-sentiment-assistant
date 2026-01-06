// Sidecar Side Panel Script

// ============================================================================
// State
// ============================================================================

let state = {
  situations: [],
  currentSituation: null,
  currentBrief: null,
  filter: 'all',
  settings: null,
};

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  setupEventListeners();
  await checkLlmStatus();
});

async function loadData() {
  // Load situations
  const situationsResponse = await sendMessage({ type: 'GET_SITUATIONS' });
  if (situationsResponse.success) {
    state.situations = situationsResponse.data || [];
    renderSituationsList();
  }

  // Load settings
  const settingsResponse = await sendMessage({ type: 'GET_SETTINGS' });
  if (settingsResponse.success) {
    state.settings = settingsResponse.data;
    populateSettings();
  }

  // Calculate storage usage
  updateStorageUsage();
}

// ============================================================================
// Event Listeners
// ============================================================================

function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.view));
  });

  // Filter tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.filter = tab.dataset.filter;
      renderSituationsList();
    });
  });

  // New situation button
  document.getElementById('newSituationBtn').addEventListener('click', () => {
    showModal('newSituationModal');
  });

  // Modal close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal').classList.add('hidden');
    });
  });

  // Create situation
  document.getElementById('modalCreate').addEventListener('click', createSituation);

  // Add participant
  document.getElementById('modalAddParticipant').addEventListener('click', addParticipant);

  // Settings
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('testLlm').addEventListener('click', testLlmConnection);
  document.getElementById('exportData').addEventListener('click', exportData);
  document.getElementById('importData').addEventListener('click', importData);
  document.getElementById('clearData').addEventListener('click', clearData);
}

function switchView(viewName) {
  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  // Update views
  document.querySelectorAll('.view').forEach(view => {
    view.classList.toggle('active', view.id === `${viewName}View`);
  });
}

// ============================================================================
// Rendering
// ============================================================================

function renderSituationsList() {
  const list = document.getElementById('situationsList');
  let situations = [...state.situations];

  // Apply filter
  if (state.filter !== 'all') {
    situations = situations.filter(s => s.status === state.filter);
  }

  if (situations.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <p>No situations found</p>
        <p class="hint">Create one to start tracking</p>
      </div>
    `;
    return;
  }

  list.innerHTML = situations.map(s => `
    <div class="situation-item ${state.currentSituation?.id === s.id ? 'selected' : ''}"
         data-id="${s.id}">
      <div class="header">
        <span class="status-badge ${s.status}">${s.status}</span>
        <span class="date">${formatDate(s.updatedAt)}</span>
      </div>
      <div class="title">${escapeHtml(s.title)}</div>
      <div class="meta">
        <span>${s.participants?.length || 0} people</span>
        <span>${s.communications?.length || 0} messages</span>
      </div>
    </div>
  `).join('');

  // Add click handlers
  list.querySelectorAll('.situation-item').forEach(item => {
    item.addEventListener('click', () => selectSituation(item.dataset.id));
  });
}

function renderSituationDetail() {
  const panel = document.getElementById('detailPanel');
  const s = state.currentSituation;

  if (!s) {
    panel.innerHTML = `
      <div class="empty-detail">
        <div class="empty-icon">📋</div>
        <h3>Select a Situation</h3>
        <p>Choose a situation from the list to view details</p>
      </div>
    `;
    return;
  }

  panel.innerHTML = `
    <div class="situation-detail">
      <div class="detail-header">
        <h1>${escapeHtml(s.title)}</h1>
        ${s.description ? `<p class="description">${escapeHtml(s.description)}</p>` : ''}
        <div class="detail-meta">
          <label>Status:
            <select id="statusSelect">
              <option value="active" ${s.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="monitoring" ${s.status === 'monitoring' ? 'selected' : ''}>Monitoring</option>
              <option value="resolved" ${s.status === 'resolved' ? 'selected' : ''}>Resolved</option>
            </select>
          </label>
          <span>Created: ${formatDate(s.createdAt)}</span>
        </div>
      </div>

      <div class="detail-actions">
        <button id="generateBriefBtn" class="btn-primary">📋 Generate Brief</button>
        <button id="addParticipantBtn" class="btn-secondary">+ Add Participant</button>
        <button id="deleteSituationBtn" class="btn-danger">Delete</button>
      </div>

      <div class="detail-tabs">
        <button class="detail-tab active" data-tab="overview">Overview</button>
        <button class="detail-tab" data-tab="participants">Participants (${s.participants?.length || 0})</button>
        <button class="detail-tab" data-tab="communications">Messages (${s.communications?.length || 0})</button>
        <button class="detail-tab" data-tab="brief">Brief</button>
      </div>

      <div id="overviewTab" class="tab-content active">
        ${renderOverviewTab(s)}
      </div>
      <div id="participantsTab" class="tab-content">
        ${renderParticipantsTab(s)}
      </div>
      <div id="communicationsTab" class="tab-content">
        ${renderCommunicationsTab(s)}
      </div>
      <div id="briefTab" class="tab-content">
        ${renderBriefTab()}
      </div>
    </div>
  `;

  // Setup detail event listeners
  setupDetailEventListeners();
}

function renderOverviewTab(s) {
  const recentComms = s.communications?.slice(0, 3) || [];

  return `
    <div class="participants-section">
      <h3>Participants</h3>
      ${s.participants?.length ? `
        <div class="participants-grid">
          ${s.participants.map(p => `
            <div class="participant-card">
              <div class="name">${escapeHtml(p.name)}</div>
              ${p.role ? `<div class="role">${escapeHtml(p.role)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : '<p class="empty-state">No participants yet</p>'}
    </div>

    ${s.analysis ? `
      <div class="brief-section">
        <h3>Latest Analysis</h3>
        <div class="brief-summary">${escapeHtml(s.analysis.summary)}</div>
      </div>
    ` : ''}
  `;
}

function renderParticipantsTab(s) {
  if (!s.participants?.length) {
    return `
      <div class="empty-state">
        <p>No participants yet</p>
        <p class="hint">Add people involved in this situation</p>
      </div>
    `;
  }

  return `
    <div class="participants-grid">
      ${s.participants.map(p => `
        <div class="participant-card" data-id="${p.id}">
          <div class="name">${escapeHtml(p.name)}</div>
          ${p.email ? `<div class="role">${escapeHtml(p.email)}</div>` : ''}
          ${p.role ? `<div class="role">${escapeHtml(p.role)}</div>` : ''}
          <button class="remove-btn" data-participant="${p.id}">&times;</button>
        </div>
      `).join('')}
    </div>
  `;
}

function renderCommunicationsTab(s) {
  if (!s.communications?.length) {
    return `
      <div class="empty-state">
        <p>No communications yet</p>
        <p class="hint">Use the capture button to add messages from Slack or Gmail</p>
      </div>
    `;
  }

  return `
    <div class="communications-list">
      ${s.communications.map(c => `
        <div class="communication-item">
          <div class="header">
            <span class="source">${c.source}</span>
            <span class="date">${formatDate(c.timestamp)}</span>
          </div>
          <div class="content">${escapeHtml(c.content.slice(0, 300))}${c.content.length > 300 ? '...' : ''}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderBriefTab() {
  if (!state.currentBrief) {
    return `
      <div class="empty-state">
        <p>No brief generated yet</p>
        <p class="hint">Click "Generate Brief" to create an AI analysis</p>
      </div>
    `;
  }

  const brief = state.currentBrief;
  return `
    <div class="brief-content">
      <div class="brief-section">
        <h3>Summary</h3>
        <div class="brief-summary">${escapeHtml(brief.summary)}</div>
      </div>

      ${brief.suggestedNextSteps?.length ? `
        <div class="brief-section">
          <h3>Suggested Actions</h3>
          <div class="actions-list">
            ${brief.suggestedNextSteps.map(a => `
              <div class="action-item">
                <span class="priority">${a.priority}</span>
                <span class="action-text">${escapeHtml(a.action)}</span>
                <p class="rationale">${escapeHtml(a.rationale)}</p>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function setupDetailEventListeners() {
  // Tab switching
  document.querySelectorAll('.detail-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}Tab`).classList.add('active');
    });
  });

  // Status change
  document.getElementById('statusSelect')?.addEventListener('change', async (e) => {
    await updateSituation({ status: e.target.value });
  });

  // Generate brief
  document.getElementById('generateBriefBtn')?.addEventListener('click', generateBrief);

  // Add participant
  document.getElementById('addParticipantBtn')?.addEventListener('click', () => {
    showModal('addParticipantModal');
  });

  // Delete situation
  document.getElementById('deleteSituationBtn')?.addEventListener('click', deleteSituation);

  // Remove participant buttons
  document.querySelectorAll('.remove-btn[data-participant]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeParticipant(btn.dataset.participant);
    });
  });
}

// ============================================================================
// Actions
// ============================================================================

async function selectSituation(id) {
  const response = await sendMessage({ type: 'GET_SITUATION', payload: { id } });
  if (response.success) {
    state.currentSituation = response.data;

    // Load brief if exists
    const briefResponse = await sendMessage({ type: 'GET_BRIEF', payload: { situationId: id } });
    state.currentBrief = briefResponse.success ? briefResponse.data : null;

    renderSituationsList();
    renderSituationDetail();
  }
}

async function createSituation() {
  const title = document.getElementById('modalTitle').value.trim();
  const description = document.getElementById('modalDescription').value.trim();

  if (!title) return;

  const response = await sendMessage({
    type: 'CREATE_SITUATION',
    payload: { title, description }
  });

  if (response.success) {
    state.situations.unshift(response.data);
    state.currentSituation = response.data;
    renderSituationsList();
    renderSituationDetail();
    hideModal('newSituationModal');
    document.getElementById('modalTitle').value = '';
    document.getElementById('modalDescription').value = '';
  }
}

async function updateSituation(updates) {
  if (!state.currentSituation) return;

  const response = await sendMessage({
    type: 'UPDATE_SITUATION',
    payload: { id: state.currentSituation.id, ...updates }
  });

  if (response.success) {
    state.currentSituation = { ...state.currentSituation, ...updates };
    const index = state.situations.findIndex(s => s.id === state.currentSituation.id);
    if (index >= 0) {
      state.situations[index] = state.currentSituation;
    }
    renderSituationsList();
  }
}

async function deleteSituation() {
  if (!state.currentSituation) return;
  if (!confirm('Are you sure you want to delete this situation?')) return;

  const response = await sendMessage({
    type: 'DELETE_SITUATION',
    payload: { id: state.currentSituation.id }
  });

  if (response.success) {
    state.situations = state.situations.filter(s => s.id !== state.currentSituation.id);
    state.currentSituation = null;
    state.currentBrief = null;
    renderSituationsList();
    renderSituationDetail();
  }
}

async function addParticipant() {
  if (!state.currentSituation) return;

  const name = document.getElementById('participantName').value.trim();
  const email = document.getElementById('participantEmail').value.trim();
  const role = document.getElementById('participantRole').value.trim();

  if (!name) return;

  const response = await sendMessage({
    type: 'ADD_PARTICIPANT',
    payload: {
      situationId: state.currentSituation.id,
      participant: { name, email, role }
    }
  });

  if (response.success) {
    state.currentSituation.participants.push(response.data);
    renderSituationDetail();
    hideModal('addParticipantModal');
    document.getElementById('participantName').value = '';
    document.getElementById('participantEmail').value = '';
    document.getElementById('participantRole').value = '';
  }
}

async function removeParticipant(participantId) {
  if (!state.currentSituation) return;
  if (!confirm('Remove this participant?')) return;

  const response = await sendMessage({
    type: 'REMOVE_PARTICIPANT',
    payload: {
      situationId: state.currentSituation.id,
      participantId
    }
  });

  if (response.success) {
    state.currentSituation.participants = state.currentSituation.participants.filter(
      p => p.id !== participantId
    );
    renderSituationDetail();
  }
}

async function generateBrief() {
  if (!state.currentSituation) return;

  const btn = document.getElementById('generateBriefBtn');
  btn.disabled = true;
  btn.textContent = 'Generating...';

  const response = await sendMessage({
    type: 'GENERATE_BRIEF',
    payload: { situationId: state.currentSituation.id }
  });

  if (response.success) {
    state.currentBrief = response.data;
    // Switch to brief tab
    document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-tab="brief"]').classList.add('active');
    document.getElementById('briefTab').classList.add('active');
    renderSituationDetail();
  } else {
    alert('Failed to generate brief. Make sure your LLM is running.');
  }

  btn.disabled = false;
  btn.textContent = '📋 Generate Brief';
}

// ============================================================================
// Settings
// ============================================================================

function populateSettings() {
  if (!state.settings) return;

  document.getElementById('llmEndpoint').value = state.settings.localLlmEndpoint || '';
  document.getElementById('llmModel').value = state.settings.localLlmModel || 'llama3:8b';
  document.getElementById('cloudEnabled').checked = state.settings.cloudLlmEnabled || false;
  document.getElementById('cloudApiKey').value = state.settings.cloudLlmApiKey || '';
  document.getElementById('autoCapture').checked = state.settings.autoCapture || false;
  document.getElementById('captureSlack').checked = state.settings.captureSlack !== false;
  document.getElementById('captureGmail').checked = state.settings.captureGmail !== false;
}

async function saveSettings() {
  const settings = {
    localLlmEndpoint: document.getElementById('llmEndpoint').value,
    localLlmModel: document.getElementById('llmModel').value,
    cloudLlmEnabled: document.getElementById('cloudEnabled').checked,
    cloudLlmApiKey: document.getElementById('cloudApiKey').value,
    autoCapture: document.getElementById('autoCapture').checked,
    captureSlack: document.getElementById('captureSlack').checked,
    captureGmail: document.getElementById('captureGmail').checked,
  };

  const response = await sendMessage({
    type: 'UPDATE_SETTINGS',
    payload: settings
  });

  if (response.success) {
    state.settings = response.data;
    alert('Settings saved!');
  }
}

async function testLlmConnection() {
  const endpoint = document.getElementById('llmEndpoint').value || 'http://localhost:11434';
  const btn = document.getElementById('testLlm');
  btn.disabled = true;
  btn.textContent = 'Testing...';

  try {
    const response = await fetch(`${endpoint}/api/tags`, {
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      alert('Connection successful!');
    } else {
      alert('Connection failed: Server responded with error');
    }
  } catch (error) {
    alert(`Connection failed: ${error.message}`);
  }

  btn.disabled = false;
  btn.textContent = 'Test Connection';
}

async function exportData() {
  const response = await sendMessage({ type: 'EXPORT_DATA' });
  if (response.success) {
    const blob = new Blob([response.data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sidecar-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

async function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    const text = await file.text();

    const response = await sendMessage({
      type: 'IMPORT_DATA',
      payload: { data: text }
    });

    if (response.success) {
      alert('Data imported successfully!');
      await loadData();
    } else {
      alert('Failed to import data');
    }
  };
  input.click();
}

async function clearData() {
  if (!confirm('Are you sure you want to delete ALL data? This cannot be undone.')) return;
  if (!confirm('Really delete everything?')) return;

  const response = await sendMessage({ type: 'CLEAR_DATA' });
  if (response.success) {
    state.situations = [];
    state.currentSituation = null;
    state.currentBrief = null;
    renderSituationsList();
    renderSituationDetail();
    alert('All data cleared');
  }
}

async function updateStorageUsage() {
  const response = await sendMessage({ type: 'GET_STORAGE_USAGE' });
  if (response.success) {
    const { used, total, percentage } = response.data;
    document.getElementById('storageUsage').textContent =
      `Storage: ${formatBytes(used)} / ${formatBytes(total)} (${percentage.toFixed(1)}%)`;
  }
}

async function checkLlmStatus() {
  const statusEl = document.getElementById('llmStatus');
  const endpoint = state.settings?.localLlmEndpoint || 'http://localhost:11434';

  try {
    const response = await fetch(`${endpoint}/api/tags`, {
      signal: AbortSignal.timeout(3000)
    });

    if (response.ok) {
      statusEl.classList.add('connected');
      statusEl.innerHTML = '<span class="status-dot"></span><span>LLM: Connected</span>';
    } else {
      throw new Error('Not responding');
    }
  } catch {
    statusEl.innerHTML = '<span class="status-dot"></span><span>LLM: Not connected</span>';
  }
}

// ============================================================================
// Utilities
// ============================================================================

function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

function showModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function hideModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
