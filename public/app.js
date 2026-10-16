let currentPass = null;

document.addEventListener('DOMContentLoaded', () => {
  initLivePreviewDefaults();
  loadPasses();
  setupEventListeners();
});

function initLivePreviewDefaults() {
  document.getElementById('preview-name').textContent = 'Cardholder Name';
  document.getElementById('preview-label').textContent = 'BALANCE';
  document.getElementById('preview-value').textContent = '40';
  document.getElementById('preview-id').textContent = '7K9P-4X2B';

  document.getElementById('preview-qr').src =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150"><rect width="150" height="150" fill="%23ffffff"/><path d="M15 15h40v40h-40zM25 25h20v20h-20zM95 15h40v40h-40zM105 25h20v20h-20zM15 95h40v40h-40zM25 105h20v20h-20zM65 25h10v10h-10zM75 45h10v20h-10zM45 65h20v10h-20zM75 75h10v10h-10zM95 75h10v20h-10zM115 65h20v10h-20zM65 95h20v10h-20zM95 105h30v10h-30zM65 125h10v10h-10zM85 125h20v10h-20zM115 125h20v10h-20z" fill="%231e293b"/></svg>';
}

function setupEventListeners() {
  const createForm = document.getElementById('create-pass-form');
  createForm.addEventListener('submit', handleCreatePass);

  const updateForm = document.getElementById('update-pass-form');
  updateForm.addEventListener('submit', handleUpdatePass);

  document.getElementById('input-name').addEventListener('input', (e) => {
    document.getElementById('preview-name').textContent = e.target.value.trim() || 'Cardholder Name';
  });

  document.getElementById('input-label').addEventListener('input', (e) => {
    document.getElementById('preview-label').textContent = (e.target.value.trim() || 'BALANCE').toUpperCase();
  });

  document.getElementById('input-value').addEventListener('input', (e) => {
    document.getElementById('preview-value').textContent = e.target.value || '0';
  });
}

async function handleCreatePass(e) {
  e.preventDefault();

  const name = document.getElementById('input-name').value.trim();
  const label = document.getElementById('input-label').value.trim();
  const value = document.getElementById('input-value').value.trim();

  const btn = document.getElementById('btn-create');
  btn.disabled = true;

  try {
    const res = await fetch('/passes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        label,
        value: Number(value),
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to create pass');
    }

    setActivePass(data.pass);
    await loadPasses();
  } catch (err) {
    alert(`Creation Error: ${err.message}`);
  } finally {
    btn.disabled = false;
  }
}

async function handleUpdatePass(e) {
  e.preventDefault();

  if (!currentPass) return;

  const newValueInput = document.getElementById('input-new-value');
  const newValue = Number(newValueInput.value.trim());

  if (isNaN(newValue)) {
    alert('Please enter a valid number.');
    return;
  }

  const btn = document.getElementById('btn-update');
  const alertBox = document.getElementById('update-alert');

  btn.disabled = true;
  alertBox.style.display = 'none';

  try {
    const res = await fetch(`/passes/${encodeURIComponent(currentPass.id)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value: newValue,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update pass');
    }

    currentPass = data.pass;

    const metricElem = document.getElementById('preview-value');
    metricElem.textContent = String(newValue);
    metricElem.classList.add('pulse');
    setTimeout(() => metricElem.classList.remove('pulse'), 900);

    alertBox.className = 'alert-box success';
    alertBox.innerHTML = `<strong>Pass Live Updated:</strong> ${currentPass.label} is now <strong>${newValue}</strong>. Android device updated live without re-adding.`;
    alertBox.style.display = 'block';

    updateCurl(currentPass.id, newValue);
    await loadPasses();
  } catch (err) {
    alertBox.className = 'alert-box error';
    alertBox.textContent = `Update Failed: ${err.message}`;
    alertBox.style.display = 'block';
  } finally {
    btn.disabled = false;
  }
}

function setActivePass(pass) {
  currentPass = pass;

  document.getElementById('preview-name').textContent = pass.name;
  document.getElementById('preview-label').textContent = pass.label.toUpperCase();
  document.getElementById('preview-value').textContent = String(pass.value);
  document.getElementById('preview-id').textContent = pass.id;
  if (pass.qrCodeDataUrl) {
    document.getElementById('preview-qr').src = pass.qrCodeDataUrl;
  }

  const saveLink = document.getElementById('save-link');
  saveLink.href = pass.saveUrl;
  document.getElementById('save-actions').style.display = 'flex';

  document.getElementById('no-pass-hint').style.display = 'none';
  document.getElementById('update-controls').style.display = 'block';
  document.getElementById('active-pass-id').textContent = pass.id;

  document.getElementById('input-new-value').value = '55';
  updateCurl(pass.id, 55);

  document.getElementById('update-alert').style.display = 'none';
}

function updateCurl(passId, value) {
  const origin = window.location.origin || 'http://localhost:3001';
  const snippet = `curl -X POST ${origin}/passes/${passId} \\
  -H "Content-Type: application/json" \\
  -d '{"value": ${value}}'`;
  document.getElementById('curl-snippet').textContent = snippet;
}

async function loadPasses() {
  const tbody = document.getElementById('passes-tbody');

  try {
    const res = await fetch('/passes');
    const data = await res.json();

    if (!data.success || !data.passes || data.passes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No passes created yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.passes
      .map((p) => {
        const isSelected = currentPass && currentPass.id === p.id;
        return `
        <tr style="${isSelected ? 'background: rgba(37, 99, 235, 0.08);' : ''}">
          <td><strong>${escapeHtml(p.name)}</strong></td>
          <td>${escapeHtml(p.label)}</td>
          <td><span style="color:#6ee7b7; font-weight:700;">${p.value}</span></td>
          <td><code style="font-size:0.75rem; color:var(--text-sub);">${p.id}</code></td>
          <td>
            <a class="link-action" onclick="selectPass('${p.id}')">
              ${isSelected ? 'Active' : 'Select'}
            </a>
            &nbsp;|&nbsp;
            <a class="link-action" href="${p.saveUrl}" target="_blank">
              Save
            </a>
          </td>
        </tr>
      `;
      })
      .join('');
  } catch (err) {
    console.error('Failed to load passes:', err);
  }
}

async function selectPass(id) {
  try {
    const res = await fetch(`/passes/${id}`);
    const data = await res.json();
    if (data.success && data.pass) {
      setActivePass(data.pass);
    }
  } catch (err) {
    alert(`Could not select pass: ${err.message}`);
  }
}

function copyCurl() {
  const snippet = document.getElementById('curl-snippet').textContent;
  navigator.clipboard.writeText(snippet);
  const btn = document.getElementById('btn-copy-curl');
  btn.textContent = 'Copied!';
  setTimeout(() => (btn.textContent = 'Copy'), 1200);
}

function copySaveLink() {
  if (!currentPass || !currentPass.saveUrl) return;
  navigator.clipboard.writeText(currentPass.saveUrl);
  alert('Google Wallet Save URL copied to clipboard!');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
