'use client';

import React, { useRef, useEffect } from 'react';
import Editor, { OnMount, BeforeMount } from '@monaco-editor/react';
import type { editor, languages } from 'monaco-editor';
import formBuilderSchema from '@/lib/schemas/form-builder-schema.json';
import formBuilderExample from '@/lib/schemas/form-builder-example.json';

interface FormBuilderEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string | number;
}

const FormBuilderEditor: React.FC<FormBuilderEditorProps> = ({
  value,
  onChange,
  height = '400px'
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);

  const handleBeforeMount: BeforeMount = (monaco) => {
    monacoRef.current = monaco;

    // Configurar validación JSON con el schema
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        {
          uri: 'http://nodify.app/form-builder-schema.json',
          fileMatch: ['*'],
          schema: formBuilderSchema as any,
        },
      ],
    });

    // Tema personalizado para formularios
    monaco.editor.defineTheme('form-builder-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: '34D399', fontStyle: 'bold' }, // Verde para keys
        { token: 'string.value.json', foreground: 'FBBF24' }, // Amarillo para valores
        { token: 'number', foreground: 'F87171' }, // Rojo claro para números
        { token: 'keyword.json', foreground: 'A78BFA', fontStyle: 'bold' }, // Púrpura para keywords
        { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': '#0b1120',
        'editor.foreground': '#E0E7FF',
        'editorLineNumber.foreground': '#6B7280',
        'editor.selectionBackground': '#A78BFA33',
        'editorCursor.foreground': '#34D399',
        'editor.lineHighlightBackground': '#1E293B15',
        'editorWidget.background': '#1C2333',
        'editorWidget.border': '#2D3748',
        'editorSuggestWidget.background': '#1C2333',
        'editorSuggestWidget.border': '#34D399',
        'editorSuggestWidget.selectedBackground': '#2D374855',
        'editorSuggestWidget.highlightForeground': '#34D399',
      },
    });

    // Proveedor de auto-completado para variables {{}}
    const variableCompletionProvider = monaco.languages.registerCompletionItemProvider('json', {
      triggerCharacters: ['{', '}'],
      provideCompletionItems: (model, position) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // Detectar si estamos en una posición para variables
        const variableContext = textUntilPosition.match(/["']([^"']*\{\{?)$/);

        if (variableContext) {
          const suggestions: languages.CompletionItem[] = [
            {
              label: '{{data}}',
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: '{{data}}',
              documentation: {
                value: '**📦 Form Data**\n\nAccess submitted form data\n\n```javascript\n{{data.email}}\n{{data.name}}\n{{data.age}}\n```',
                isTrusted: true,
              },
              range,
              sortText: '0_data',
              detail: 'Form submission data'
            },
            {
              label: '{{user.email}}',
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: '{{user.email}}',
              documentation: 'Current user email (if authenticated)',
              range,
              sortText: '1_user_email',
            },
            {
              label: '{{user.name}}',
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: '{{user.name}}',
              documentation: 'Current user name (if authenticated)',
              range,
              sortText: '1_user_name',
            },
            {
              label: '{{timestamp}}',
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: '{{timestamp}}',
              documentation: 'Current timestamp',
              range,
              sortText: '2_timestamp',
            },
            {
              label: '{{formId}}',
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: '{{formId}}',
              documentation: 'Unique form identifier',
              range,
              sortText: '2_formId',
            },
          ];

          return { suggestions };
        }

        return { suggestions: [] };
      },
    });

    // Hover provider para mostrar ayuda
    const hoverProvider = monaco.languages.registerHoverProvider('json', {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const hoverTexts: Record<string, string> = {
          fields: '**📝 Form Fields**\n\nArray of field definitions.\n\nEach field can be: text, email, number, select, checkbox, etc.\n\nPress `Ctrl+Space` for suggestions.',
          styling: '**🎨 Form Styling**\n\nCustomize form appearance:\n- Container styles\n- Color theme\n- Typography\n- Spacing',
          layout: '**📐 Form Layout**\n\nControl form structure:\n- vertical/horizontal/grid\n- Responsive columns\n- Gap spacing',
          validation: '**✅ Form Validation**\n\nValidation rules:\n- Required fields\n- Pattern matching\n- Custom validators\n- Error messages',
          type: '**Input Type**\n\nSupported types:\ntext, email, password, number, tel, url, date, time, file, textarea, select, radio, checkbox, switch, button, submit',
          name: '**Field Name**\n\nUnique identifier for the field.\n\nUsed as key in submitted data.\n\nExample: email, fullName, phoneNumber',
          label: '**Field Label**\n\nDisplay text shown to users.\n\nExample: "Email Address", "Full Name"',
          placeholder: '**Placeholder Text**\n\nHint text shown when field is empty.\n\nSupports variables: {{user.name}}',
          required: '**Required Field**\n\nMakes the field mandatory.\n\ntrue = required\nfalse = optional',
          style: '**Field Styling**\n\nCustom CSS properties:\n- width, height\n- padding, margin\n- fontSize, color\n- border, borderRadius\n- etc.',
          className: '**CSS Classes**\n\nAdd custom CSS classes for styling.',
          options: '**Select Options**\n\nArray of options for select, radio, or checkbox fields.\n\n```json\n[\n  { "label": "Option 1", "value": "opt1" },\n  { "label": "Option 2", "value": "opt2" }\n]\n```',
          conditional: '**Conditional Display**\n\nShow/hide field based on another field\'s value.\n\n```json\n{\n  "when": "country",\n  "is": "USA",\n  "operator": "equals"\n}\n```',
        };

        if (hoverTexts[word.word]) {
          return {
            contents: [
              {
                value: hoverTexts[word.word],
                isTrusted: true,
                supportHtml: true,
              },
            ],
          };
        }

        return null;
      },
    });
  };

  const handleOnMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance;

    const editorOptions: editor.IStandaloneEditorConstructionOptions = {
      minimap: { enabled: false },
      lineNumbers: 'on',
      glyphMargin: true,
      folding: true,
      scrollBeyondLastLine: false,
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        useShadows: true,
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
      },
      wordWrap: 'off',
      renderLineHighlight: 'line',
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      renderWhitespace: 'selection',
      fontLigatures: true,
      bracketPairColorization: { enabled: true },
      suggest: {
        snippetsPreventQuickSuggestions: false,
        showSnippets: true,
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: true,
      },
      tabSize: 2,
      insertSpaces: true,
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      formatOnPaste: true,
      formatOnType: true,
    };

    editorInstance.updateOptions(editorOptions);

    // Acción para insertar ejemplo
    editorInstance.addAction({
      id: 'insert-example',
      label: 'Insert Example Form',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: (ed) => {
        ed.setValue(JSON.stringify(formBuilderExample, null, 2));
      },
    });

    // Acción para formatear
    editorInstance.addAction({
      id: 'format-json',
      label: 'Format JSON',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.6,
      run: (ed) => {
        try {
          const current = ed.getValue();
          const parsed = JSON.parse(current);
          ed.setValue(JSON.stringify(parsed, null, 2));
        } catch (e) {
          // Invalid JSON, skip
        }
      },
    });
  };

  return (
    <div className="rounded-lg overflow-hidden border border-border/50">
      <div className="bg-card/30 border-b border-border/50 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">📝 Form Builder</span>
          <span className="opacity-50">•</span>
          <span>Press Ctrl+Space for suggestions</span>
          <span className="opacity-50">•</span>
          <span>Use {'{{'} {'}'} for variables</span>
        </div>
        <button
          onClick={() => {
            if (editorRef.current) {
              editorRef.current.setValue(JSON.stringify(formBuilderExample, null, 2));
            }
          }}
          className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
        >
          Insert Example
        </button>
      </div>
      <Editor
        width="100%"
        height={height}
        language="json"
        theme="form-builder-dark"
        value={value}
        onChange={(val) => onChange(val || '')}
        beforeMount={handleBeforeMount}
        onMount={handleOnMount}
        options={{
          fontSize: 13,
          fontFamily: '"Fira Code", "Cascadia Code", Consolas, "Courier New", monospace',
          automaticLayout: true,
          fontLigatures: true,
        }}
      />
    </div>
  );
};

export default FormBuilderEditor;
