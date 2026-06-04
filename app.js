let originalContent = null;
let modifiedContent = null;
let originalFilename = '';
let modifiedFilename = '';
let diffEditor = null;
let editableEditor = null;

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/api/refactor', async (req, res) => {
  const { code, description } = req.body;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "user", content: `Refactor the following code based on this description: ${description}\n\n${code}` }
      ]
    });

    const refactoredCode = response.choices[0].message.content;

    res.json({ refactoredCode });
  } catch (error) {
    console.error('Error occurred while refactoring:', error);
    res.status(500).json({ error: 'Failed to refactor code' });
  }
});

require.config({
  paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }
});

require(['vs/editor/editor.main'], function () {
  document.getElementById('fileOriginal').addEventListener('change', e => handleFile(e, 'original'));
  document.getElementById('fileModified').addEventListener('change', e => handleFile(e, 'modified'));
  document.getElementById('inlineToggle').addEventListener('change', toggleInlineMode);
});

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

    if (originalContent !== null && modifiedContent !== null) {
      showDiff();
    }
  };
  reader.readAsText(file);

  event.target.value = '';
}

function markLoaded(side, filename) {
  const btn   = document.querySelector(`#slot${side} .upload-btn`);
  const label = document.getElementById(`label${side}`);
  const badge = document.getElementById(`badge${side}`);

  btn.classList.add('loaded');
  label.textContent = '✓ ' + filename;
  badge.textContent = '';
}

function showDiff() {
  const lang = detectLanguage(originalFilename || modifiedFilename);

  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('workspace').style.display = 'flex';

  if (!editableEditor) {
    editableEditor = monaco.editor.create(
      document.getElementById('editableEditor'),
      {
        value: originalContent,
        language: lang,
        theme: 'vs-dark',
        fontSize: 13,
        fontFamily: "'IBM Plex Mono', monospace",
        minimap: { enabled: false }
      }
    );

    editableEditor.onDidChangeModelContent(() => {
      originalContent = editableEditor.getValue();

      diffEditor.setModel({
        original: monaco.editor.createModel(originalContent, lang),
        modified: monaco.editor.createModel(modifiedContent, lang)
      });

      updateStatusBar();
    });
  }

  if (!diffEditor) {
    diffEditor = monaco.editor.createDiffEditor(
      document.getElementById('diffViewer'),
      {
        theme: 'vs-dark',
        renderSideBySide: false,
        readOnly: true,
        fontSize: 13,
        fontFamily: "'IBM Plex Mono', monospace"
      }
    );
  }

  editableEditor.setValue(originalContent);

  diffEditor.setModel({
    original: monaco.editor.createModel(originalContent, lang),
    modified: monaco.editor.createModel(modifiedContent, lang)
  });

  updateStatusBar();
}

function toggleInlineMode() {
  if (!diffEditor) return;
  const inline = document.getElementById('inlineToggle').checked;
  diffEditor.updateOptions({ renderSideBySide: !inline });
}

function updateStatusBar() {
  const bar = document.getElementById('statusBar');

  const origLines = (originalContent || '').split('\n');
  const modLines  = (modifiedContent  || '').split('\n');

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

function clearAll() {
  originalContent  = null;
  modifiedContent  = null;
  originalFilename = '';
  modifiedFilename = '';

  ['Original', 'Modified'].forEach(side => {
    const btn   = document.querySelector(`#slot${side} .upload-btn`);
    const label = document.getElementById(`label${side}`);
    btn.classList.remove('loaded');
    label.textContent = `Upload ${side}`;
  });

  if (diffEditor) {
    diffEditor.dispose();
    diffEditor = null;
  }

  if (editableEditor) {
    editableEditor.dispose();
    editableEditor = null;
  }

  document.getElementById('workspace').style.display = 'none';
  document.getElementById('emptyState').style.display   = 'flex';
  document.getElementById('statusBar').innerHTML =
    '<span class="status-hint">Upload two files to compare them</span>';
}

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

async function refactorCode() {
  if (!editableEditor) return;

  const code = editableEditor.getValue();
  try {
    const response = await fetch('http://localhost:5000/refactor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    const result = await response.json();

    document.getElementById('explanationContent').innerHTML = 
      `
      <strong>Summary</strong><br>
      ${result.summary.join('<br>')}
      <br><br>
      <strong>Explanation</strong><br>
      ${result.detailedReasoning}
      `;

    const lang = detectLanguage(originalFilename);
    diffEditor.setModel({
      original: monaco.editor.createModel(code, lang),
      modified: monaco.editor.createModel(result.refactoredCode, lang)
    });
  } catch (error) {
      document.getElementById('explanationContent').textContent = "Refactoring failed" + error.message;
  }
}