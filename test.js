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

        const result = await codeRefactor(originalCode);

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

async function refactorCode() {
    const code = editor.getValue();
    const API_KEY = "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"

    try{
        const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: `
                        You exist solely to refactor code.
                        Return only valid JSON:
                        
                        {
                        "refactoredCode": "...",
                        "reasoning": "..."
                        }`
                    },
                    {
                        role: "user",
                        content: code
                    }
                ]
            })
        }
        );

        const data = await response.json();

        const result = JSON.parse(data.choices[0].message.content);

        showDiff(code, result.refactoredCode);

        document.getElementById("aiReasoning").textContent = result.reasoning;
    }   catch (error) {
            console.error(error);
            alert("Refactoring failed.");
        }
}