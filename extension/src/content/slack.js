// Sidecar Slack Content Script
// Captures selected messages and conversations from Slack

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

  // Try to get context from Slack DOM
  const context = getSlackContext(selection);

  return {
    source: 'slack',
    sourceId: context.messageId || `slack-${Date.now()}`,
    url: window.location.href,
    content: selectedText,
    participants: context.participants,
    timestamp: context.timestamp || new Date().toISOString(),
    metadata: {
      channel: context.channelName,
      channelId: context.channelId,
      threadId: context.threadId,
      isThread: context.isThread,
    }
  };
}

function getSlackContext(selection) {
  const context = {
    channelName: '',
    channelId: '',
    messageId: '',
    threadId: '',
    isThread: false,
    timestamp: '',
    participants: [],
  };

  try {
    // Get channel name from URL or header
    const urlMatch = window.location.pathname.match(/\/([A-Z0-9]+)/);
    if (urlMatch) {
      context.channelId = urlMatch[1];
    }

    // Try to get channel name from header
    const channelHeader = document.querySelector('[data-qa="channel_name"]');
    if (channelHeader) {
      context.channelName = channelHeader.textContent?.trim() || '';
    }

    // Check if we're in a thread
    const threadContainer = document.querySelector('[data-qa="thread_view"]');
    context.isThread = !!threadContainer;

    // Try to find the message container for the selection
    const range = selection?.getRangeAt(0);
    if (range) {
      let element = range.commonAncestorContainer;
      while (element && element !== document.body) {
        if (element.classList?.contains('c-message_kit__message')) {
          // Found a message container
          const timestamp = element.querySelector('time');
          if (timestamp) {
            context.timestamp = timestamp.getAttribute('datetime') || '';
          }

          const messageId = element.getAttribute('data-message-ts');
          if (messageId) {
            context.messageId = messageId;
          }

          // Get sender
          const sender = element.querySelector('[data-qa="message_sender_name"]');
          if (sender) {
            context.participants.push(sender.textContent?.trim() || 'Unknown');
          }

          break;
        }
        element = element.parentElement;
      }
    }

    // Get thread ID if in thread view
    if (context.isThread) {
      const threadTs = threadContainer?.getAttribute('data-thread-ts');
      if (threadTs) {
        context.threadId = threadTs;
      }
    }

  } catch (error) {
    console.error('Error getting Slack context:', error);
  }

  return context;
}

// ============================================================================
// Auto-capture (optional)
// ============================================================================

async function checkAutoCaptureEnabled() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    return response?.data?.autoCapture && response?.data?.captureSlack;
  } catch {
    return false;
  }
}

// ============================================================================
// Sidecar Button Injection
// ============================================================================

function injectSidecarButton() {
  // Add a subtle capture button near messages on hover
  const style = document.createElement('style');
  style.textContent = `
    .sidecar-capture-btn {
      position: absolute;
      right: 8px;
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
    .c-message_kit__message:hover .sidecar-capture-btn {
      opacity: 1;
    }
    .sidecar-capture-btn:hover {
      background: #0056b3;
    }
  `;
  document.head.appendChild(style);

  // Observer to add buttons to new messages
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const messages = node.querySelectorAll?.('.c-message_kit__message') || [];
          messages.forEach(addCaptureButton);
          if (node.classList?.contains('c-message_kit__message')) {
            addCaptureButton(node);
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Add to existing messages
  document.querySelectorAll('.c-message_kit__message').forEach(addCaptureButton);
}

function addCaptureButton(messageEl) {
  if (messageEl.querySelector('.sidecar-capture-btn')) return;

  const btn = document.createElement('button');
  btn.className = 'sidecar-capture-btn';
  btn.textContent = '📋 Sidecar';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    captureMessage(messageEl);
  });

  messageEl.style.position = 'relative';
  messageEl.appendChild(btn);
}

function captureMessage(messageEl) {
  const content = messageEl.querySelector('[data-qa="message-text"]')?.textContent || '';
  const sender = messageEl.querySelector('[data-qa="message_sender_name"]')?.textContent || '';
  const timestamp = messageEl.querySelector('time')?.getAttribute('datetime') || '';
  const messageId = messageEl.getAttribute('data-message-ts') || '';

  const captured = {
    source: 'slack',
    sourceId: messageId || `slack-${Date.now()}`,
    url: window.location.href,
    content: content.trim(),
    participants: sender ? [sender.trim()] : [],
    timestamp: timestamp || new Date().toISOString(),
    metadata: {
      channel: document.querySelector('[data-qa="channel_name"]')?.textContent?.trim() || '',
    }
  };

  // Open popup/sidepanel to add to situation
  chrome.runtime.sendMessage({
    type: 'CAPTURE_CONTENT',
    payload: captured
  });
}

// Initialize
injectSidecarButton();
console.log('Sidecar Slack content script loaded');
