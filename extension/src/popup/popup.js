// Sidecar Popup Script

// ============================================================================
// State
// ============================================================================

let situations = [];
let capturedContent = null;

// ============================================================================
// DOM Elements
// ============================================================================

const elements = {
  openSidepanel: document.getElementById('openSidepanel'),
  captureBtn: document.getElementById('captureBtn'),
  newSituationBtn: document.getElementById('newSituationBtn'),
  situationCount: document.getElementById('situationCount'),
  situationsList: document.getElementById('situationsList'),
  newSituationForm: document.getElementById('newSituationForm'),
  newTitle: document.getElementById('newTitle'),
  newDescription: document.getElementById('newDescription'),
  cancelNew: document.getElementById('cancelNew'),
  createNew: document.getElementById('createNew'),
  captureForm: document.getElementById('captureForm'),
  capturePreview: document.getElementById('capturePreview'),
  situationSelect: document.getElementById('situationSelect'),
  cancelCapture: document.getElementById('cancelCapture'),
  confirmCapture: document.getElementById('confirmCapture'),
  llmStatus: document.getElementById('llmStatus'),
};

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  await loadSituations();
  await checkLlmStatus();
  setupEventListeners();
});

// ============================================================================
// Event Listeners
// ============================================================================

function setupEventListeners() {
  // Open side panel
  elements.openSidepanel.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
    window.close();
  });

  // Capture selection
  elements.captureBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' });

      if (response && response.content) {
        capturedContent = response;
        showCaptureForm(response);
      } else {
        showNotification('No content selected. Highlight text on the page first.');
      }
    } catch (error) {
      showNotification('Cannot capture from this page. Try Slack or Gmail.');
    }
  });

  // New situation button
  elements.newSituationBtn.addEventListener('click', () => {
    elements.newSituationForm.classList.remove('hidden');
    elements.newTitle.focus();
  });

  // Cancel new situation
  elements.cancelNew.addEventListener('click', () => {
    elements.newSituationForm.classList.add('hidden');
    elements.newTitle.value = '';
    elements.newDescription.value = '';
  });

  // Create new situation
  elements.createNew.addEventListener('click', createSituation);
  elements.newTitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createSituation();
  });

  // Cancel capture
  elements.cancelCapture.addEventListener('click', () => {
    elements.captureForm.classList.add('hidden');
    capturedContent = null;
  });

  // Situation select change
  elements.situationSelect.addEventListener('change', () => {
    elements.confirmCapture.disabled = !elements.situationSelect.value;
  });

  // Confirm capture
  elements.confirmCapture.addEventListener('click', addCapturedContent);
}

// ============================================================================
// Data Loading
// ============================================================================

async function loadSituations() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SITUATIONS' });

    if (response.success) {
      situations = response.data || [];
      renderSituations();
      updateSituationSelect();
    }
  } catch (error) {
    console.error('Failed to load situations:', error);
  }
}

async function checkLlmStatus() {
  try {
    const settings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    const endpoint = settings.data?.localLlmEndpoint || 'http://localhost:11434';

    const response = await fetch(`${endpoint}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });

    if (response.ok) {
      elements.llmStatus.classList.add('connected');
      elements.llmStatus.innerHTML = `
        <span class="status-dot"></span>
        <span>Local LLM: Ready</span>
      `;
    } else {
      throw new Error('Not responding');
    }
  } catch (error) {
    elements.llmStatus.classList.add('error');
    elements.llmStatus.innerHTML = `
      <span class="status-dot"></span>
      <span>Local LLM: Not connected</span>
    `;
  }
}

// ============================================================================
// Rendering
// ============================================================================

function renderSituations() {
  const activeSituations = situations.filter(s => s.status !== 'resolved');
  elements.situationCount.textContent = activeSituations.length;

  if (activeSituations.length === 0) {
    elements.situationsList.innerHTML = `
      <div class="empty-state">
        <p>No active situations</p>
        <p class="hint">Create one to start tracking</p>
      </div>
    `;
    return;
  }

  elements.situationsList.innerHTML = activeSituations
    .slice(0, 5)
    .map(s => `
      <div class="situation-item" data-id="${s.id}">
        <div class="title">
          <span class="status-dot ${s.status}"></span>
          <span>${escapeHtml(s.title)}</span>
        </div>
        <div class="meta">
          <span>${s.participants?.length || 0} people</span>
          <span>${s.communications?.length || 0} messages</span>
        </div>
      </div>
    `)
    .join('');

  // Add click handlers
  elements.situationsList.querySelectorAll('.situation-item').forEach(item => {
    item.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'OPEN_SIDEPANEL',
        payload: { situationId: item.dataset.id }
      });
      window.close();
    });
  });
}

function updateSituationSelect() {
  const options = situations
    .filter(s => s.status !== 'resolved')
    .map(s => `<option value="${s.id}">${escapeHtml(s.title)}</option>`)
    .join('');

  elements.situationSelect.innerHTML = `
    <option value="">Select a situation...</option>
    ${options}
  `;
}

function showCaptureForm(content) {
  elements.capturePreview.textContent = content.content.slice(0, 200) +
    (content.content.length > 200 ? '...' : '');
  elements.captureForm.classList.remove('hidden');
  elements.situationSelect.value = '';
  elements.confirmCapture.disabled = true;
}

// ============================================================================
// Actions
// ============================================================================

async function createSituation() {
  const title = elements.newTitle.value.trim();
  if (!title) return;

  const description = elements.newDescription.value.trim();

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CREATE_SITUATION',
      payload: { title, description }
    });

    if (response.success) {
      elements.newSituationForm.classList.add('hidden');
      elements.newTitle.value = '';
      elements.newDescription.value = '';
      await loadSituations();
      showNotification('Situation created!');
    } else {
      showNotification('Failed to create situation');
    }
  } catch (error) {
    showNotification('Error creating situation');
  }
}

async function addCapturedContent() {
  if (!capturedContent || !elements.situationSelect.value) return;

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'ADD_COMMUNICATION',
      payload: {
        situationId: elements.situationSelect.value,
        communication: {
          source: capturedContent.source || 'manual',
          sourceId: capturedContent.sourceId || `manual-${Date.now()}`,
          sourceUrl: capturedContent.url,
          timestamp: new Date().toISOString(),
          participants: capturedContent.participants || [],
          content: capturedContent.content,
          metadata: capturedContent.metadata || {}
        }
      }
    });

    if (response.success) {
      elements.captureForm.classList.add('hidden');
      capturedContent = null;
      await loadSituations();
      showNotification('Content added to situation!');
    } else {
      showNotification('Failed to add content');
    }
  } catch (error) {
    showNotification('Error adding content');
  }
}

// ============================================================================
// Utilities
// ============================================================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message) {
  // Simple notification - could be enhanced with a toast component
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 60px;
    left: 16px;
    right: 16px;
    padding: 10px 16px;
    background: var(--text-primary);
    color: var(--bg-primary);
    border-radius: 8px;
    font-size: 12px;
    text-align: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => notification.remove(), 200);
  }, 2000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(10px); }
  }
`;
document.head.appendChild(style);
