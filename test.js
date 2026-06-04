let originalCode = "";
let originalFilename = "";

let editor = null;
let diffEditor = null;

require.config({
    paths: {
        vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs"
    }
});

require(["vs/editor/editor.main"], function () {
    document
        .getElementById("fileOriginal")
        .addEventListener("change", loadFile);

    createEditors();
});

function createEditors() {
    editor = monaco.editor.create(
        document.getElementById("editableEditor"),
        {
            value: "",
            language: "javascript",
            theme: "vs-dark",
            automaticLayout: true
        }
    );

    diffEditor = monaco.editor.createDiffEditor(
        document.getElementById("diffViewer"),
        {
            theme: "vs-dark",
            readOnly: true,
            automaticLayout: true
        }
    );
}

function loadFile(event) {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    originalFilename = file.name;

    const reader = new FileReader();

    reader.onload = function (e) {

        originalCode = e.target.result;

        editor.setValue(originalCode);
    };

    reader.readAsText(file);

    event.target.value = "";
}

async function refactorCode() {
    originalCode = editor.getValue();

    if (originalCode.trim() === "") {
        alert("Enter some code first.");
        return;
    }

    try {

        const result = await AIRefactor(originalCode);

        showDiff(
            originalCode,
            result.refactoredCode
        );

        document.getElementById("aiReasoning").textContent =
            result.reasoning;

    } catch (error) {

        alert("Refactoring failed.");

        console.error(error);
    }
}

function showDiff(original, refactored) {
    const language =
        detectLanguage(originalFilename);

    const originalModel =
        monaco.editor.createModel(
            original,
            language
        );

    const modifiedModel =
        monaco.editor.createModel(
            refactored,
            language
        );

    diffEditor.setModel({
        original: originalModel,
        modified: modifiedModel
    });
}

function detectLanguage(filename) {
    const ext =
        filename.split(".").pop().toLowerCase();

    const map = {
        js: "javascript",
        jsx: "javascript",
        py: "python",
        java: "java",
        cpp: "cpp",
        c: "cpp",
        cs: "csharp",
    };

    return map[ext] || "plaintext";
}


async function testRefactor(code) {
    return {
        refactoredCode:
            code.replaceAll("var ", "let "),
        reasoning:
            "Changed var declarations to let declarations."
    };
}

async function AIRefactor(code) {
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AQ.Ab8RN6LiBt6fEKbLr3NRMtOIQJDXAf6IvbXJUHDay4eOUn5emA",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Your sole purpose is to refactor the following code.
Return ONLY valid JSON:
{
  "refactoredCode": "...",
  "reasoning": "..."
}
Code:
${code}`
            }]
          }]
        })
      }
    );

    const data = await response.json();

    // ✅ Correctly extract text from Gemini response
    const text = data.candidates[0].content.parts[0].text;
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleaned);

    showDiff(code, result.refactoredCode);
    document.getElementById("aiReasoning").textContent = result.reasoning;

  } catch (error) {
    console.error(error);
    alert("Refactoring failed.");
  }
}