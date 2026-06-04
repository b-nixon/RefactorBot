// ── State ──
let originalContent  = null;
let modifiedContent  = null;
let originalFilename = '';
let modifiedFilename = '';
let diffEditor       = null;

// ── Monaco Setup ──
require.config({
  paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }
});

require(['vs/editor/editor.main'], function () {
  // Monaco is ready — wire up file inputs now
  document.getElementById('fileOriginal').addEventListener('change', e => handleFile(e, 'original'));
  document.getElementById('fileModified').addEventListener('change', e => handleFile(e, 'modified'));
  document.getElementById('inlineToggle').addEventListener('change', toggleInlineMode);
});

// ── File Reading ──
function handleFile(event, side) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const content = e.target.result;

    if (side === 'original') {
      originalContent  = content;
      originalFilename = file.name;
      markLoaded('Original', file.name);
    } else {
      modifiedContent  = content;
      modifiedFilename = file.name;
      markLoaded('Modified', file.name);
    }

    // Both files loaded — show the diff
    if (originalContent !== null && modifiedContent !== null) {
      showDiff();
    }
  };
  reader.readAsText(file);

  // Reset input so the same file can be re-uploaded
  event.target.value = '';
}

// ── Mark Upload Button as Loaded ──
function markLoaded(side, filename) {
  const btn   = document.querySelector(`#slot${side} .upload-btn`);
  const label = document.getElementById(`label${side}`);
  const badge = document.getElementById(`badge${side}`);

  btn.classList.add('loaded');
  label.textContent = '✓ ' + filename;
  badge.textContent = '';
}

// ── Show Monaco Diff ──
function showDiff() {
  const lang = detectLanguage(originalFilename || modifiedFilename);

  document.getElementById('emptyState').style.display  = 'none';
  document.getElementById('monacoEditor').style.display = 'block';

  if (diffEditor) {
    // Update existing editor models
    diffEditor.getOriginalEditor().getModel().setValue(originalContent);
    diffEditor.getModifiedEditor().getModel().setValue(modifiedContent);
  } else {
    // Create fresh diff editor
    diffEditor = monaco.editor.createDiffEditor(
      document.getElementById('monacoEditor'),
      {
        theme:               'vs-dark',
        renderSideBySide:    true,
        readOnly:            true,
        fontSize:            13,
        fontFamily:          "'IBM Plex Mono', monospace",
        lineNumbers:         'on',
        scrollBeyondLastLine: false,
        minimap:             { enabled: true },
        scrollbar:           { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
        renderLineHighlight: 'none',
        padding:             { top: 12 },
      }
    );

    diffEditor.setModel({
      original: monaco.editor.createModel(originalContent, lang),
      modified: monaco.editor.createModel(modifiedContent, lang),
    });
  }

  updateStatusBar();
}

// ── Inline / Side-by-side Toggle ──
function toggleInlineMode() {
  if (!diffEditor) return;
  const inline = document.getElementById('inlineToggle').checked;
  diffEditor.updateOptions({ renderSideBySide: !inline });
}

// ── Status Bar ──
function updateStatusBar() {
  const bar = document.getElementById('statusBar');

  // Compute line-level diff counts
  const origLines = (originalContent || '').split('\n');
  const modLines  = (modifiedContent  || '').split('\n');

  // Simple line count stats (Monaco handles the real diff rendering)
  const added   = Math.max(0, modLines.length - origLines.length);
  const removed = Math.max(0, origLines.length - modLines.length);

  bar.innerHTML = `
    <span class="stat">
      <span class="stat-dot added"></span>
      <span>${origLines.length} → ${modLines.length} lines</span>
    </span>
    <span class="stat">
      <span class="stat-dot added"></span>
      <span>+${added} added</span>
    </span>
    <span class="stat">
      <span class="stat-dot removed"></span>
      <span>−${removed} removed</span>
    </span>
    <span style="margin-left:auto; color: var(--muted)">
      ${originalFilename} &nbsp;⇄&nbsp; ${modifiedFilename}
    </span>
  `;
}

// ── Clear All ──
function clearAll() {
  originalContent  = null;
  modifiedContent  = null;
  originalFilename = '';
  modifiedFilename = '';

  // Reset upload buttons
  ['Original', 'Modified'].forEach(side => {
    const btn   = document.querySelector(`#slot${side} .upload-btn`);
    const label = document.getElementById(`label${side}`);
    btn.classList.remove('loaded');
    label.textContent = `Upload ${side}`;
  });

  // Destroy editor
  if (diffEditor) {
    diffEditor.dispose();
    diffEditor = null;
  }

  document.getElementById('monacoEditor').style.display = 'none';
  document.getElementById('emptyState').style.display   = 'flex';
  document.getElementById('statusBar').innerHTML =
    '<span class="status-hint">Upload two files to compare them</span>';
}

// ── Language Detection ──
function detectLanguage(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    js: 'javascript', jsx: 'javascript',
    py: 'python',
    java: 'java',
    cpp: 'cpp', 
    cs: 'csharp',
    rs: 'rust',
  };
  return map[ext] || 'plaintext';
}