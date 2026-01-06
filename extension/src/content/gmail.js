// Sidecar Gmail Content Script
// Captures selected emails and threads from Gmail

// ============================================================================
// Message Handler
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SELECTION') {
    const captured = captureSelection();
    sendResponse(captured);
  }
  return true;
});

// ============================================================================
// Selection Capture
// ============================================================================

function captureSelection() {
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();

  if (!selectedText) {
    return null;
  }

  // Try to get context from Gmail DOM
  const context = getGmailContext(selection);

  return {
    source: 'gmail',
    sourceId: context.threadId || `gmail-${Date.now()}`,
    url: window.location.href,
    content: selectedText,
    participants: context.participants,
    timestamp: context.timestamp || new Date().toISOString(),
    metadata: {
      subject: context.subject,
      threadId: context.threadId,
    }
  };
}

function getGmailContext(selection) {
  const context = {
    subject: '',
    threadId: '',
    timestamp: '',
    participants: [],
  };

  try {
    // Get thread ID from URL
    const urlMatch = window.location.hash.match(/#[a-z]+\/([a-zA-Z0-9]+)/);
    if (urlMatch) {
      context.threadId = urlMatch[1];
    }

    // Try to get subject from header
    const subjectEl = document.querySelector('h2[data-thread-perm-id]');
    if (subjectEl) {
      context.subject = subjectEl.textContent?.trim() || '';
    } else {
      // Fallback: try to find in conversation view
      const subjectFallback = document.querySelector('[data-legacy-thread-id] h2');
      if (subjectFallback) {
        context.subject = subjectFallback.textContent?.trim() || '';
      }
    }

    // Try to find the email container for the selection
    const range = selection?.getRangeAt(0);
    if (range) {
      let element = range.commonAncestorContainer;
      while (element && element !== document.body) {
        // Gmail email containers
        if (element.getAttribute?.('data-message-id')) {
          // Get sender
          const senderEl = element.querySelector('[email]');
          if (senderEl) {
            const email = senderEl.getAttribute('email');
            const name = senderEl.getAttribute('name') || senderEl.textContent?.trim();
            context.participants.push(name || email || 'Unknown');
          }

          // Get timestamp
          const dateEl = element.querySelector('[data-timestamp]');
          if (dateEl) {
            const timestamp = dateEl.getAttribute('data-timestamp');
            if (timestamp) {
              context.timestamp = new Date(parseInt(timestamp)).toISOString();
            }
          }

          break;
        }
        element = element.parentElement;
      }
    }

    // Get all participants from the thread
    const allParticipants = document.querySelectorAll('[data-hovercard-id][email]');
    const participantSet = new Set(context.participants);
    allParticipants.forEach(el => {
      const name = el.getAttribute('name') || el.textContent?.trim();
      if (name && !participantSet.has(name)) {
        participantSet.add(name);
      }
    });
    context.participants = Array.from(participantSet);

  } catch (error) {
    console.error('Error getting Gmail context:', error);
  }

  return context;
}

// ============================================================================
// Sidecar Button Injection
// ============================================================================

function injectSidecarButton() {
  // Add styles for the capture button
  const style = document.createElement('style');
  style.textContent = `
    .sidecar-gmail-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      background: #007aff;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      margin-left: 8px;
    }
    .sidecar-gmail-btn:hover {
      background: #0056b3;
    }
    .sidecar-email-btn {
      position: absolute;
      right: 48px;
      top: 8px;
      padding: 4px 8px;
      background: #007aff;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 1000;
    }
    .sidecar-email-btn:hover {
      background: #0056b3;
    }
  `;
  document.head.appendChild(style);

  // Observer to add button when thread view opens
  const observer = new MutationObserver((mutations) => {
    // Check for thread view toolbar
    const toolbar = document.querySelector('[gh="mtb"]');
    if (toolbar && !toolbar.querySelector('.sidecar-gmail-btn')) {
      addToolbarButton(toolbar);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function addToolbarButton(toolbar) {
  const btn = document.createElement('button');
  btn.className = 'sidecar-gmail-btn';
  btn.innerHTML = '📋 Add to Sidecar';
  btn.addEventListener('click', () => {
    captureCurrentThread();
  });

  toolbar.appendChild(btn);
}

function captureCurrentThread() {
  // Get the visible email content
  const emailBody = document.querySelector('[data-message-id] .a3s');
  const content = emailBody?.textContent?.trim() || '';

  // Get subject
  const subject = document.querySelector('h2[data-thread-perm-id]')?.textContent?.trim() ||
    document.querySelector('[data-legacy-thread-id] h2')?.textContent?.trim() || '';

  // Get participants
  const participants = [];
  document.querySelectorAll('[data-hovercard-id][email]').forEach(el => {
    const name = el.getAttribute('name') || el.textContent?.trim();
    if (name && !participants.includes(name)) {
      participants.push(name);
    }
  });

  // Get thread ID
  const urlMatch = window.location.hash.match(/#[a-z]+\/([a-zA-Z0-9]+)/);
  const threadId = urlMatch?.[1] || `gmail-${Date.now()}`;

  const captured = {
    source: 'gmail',
    sourceId: threadId,
    url: window.location.href,
    content: content.slice(0, 5000), // Limit content size
    participants,
    timestamp: new Date().toISOString(),
    metadata: {
      subject,
      threadId,
    }
  };

  // Send to background/sidepanel
  chrome.runtime.sendMessage({
    type: 'CAPTURE_CONTENT',
    payload: captured
  });

  // Open side panel
  chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
}

// Initialize
injectSidecarButton();
console.log('Sidecar Gmail content script loaded');
