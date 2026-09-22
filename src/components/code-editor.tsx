'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import Editor, { OnMount, BeforeMount } from '@monaco-editor/react';
import type { editor, languages, IDisposable } from 'monaco-editor';
import type { CustomNode } from '@/lib/custom-nodes-types';
import { Node } from 'reactflow';
import { NodeData } from '@/lib/types';
import { getNodeDefinition } from '@/lib/nodes';

interface ExecutionContextByName {
  [nodeName: string]: {
    input: any;
    output: any;
  };
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string | number;
  node: CustomNode | null;
  allNodes?: Node<NodeData>[];
  oneLine?: boolean;
  executionContext?: ExecutionContextByName;
  readOnly?: boolean;
  language?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  height = '100%',
  node,
  allNodes = [],
  oneLine = false,
  executionContext = {},
  readOnly = false,
  language = 'javascript'
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);
  const disposablesRef = useRef<IDisposable[]>([]);
  const decorationsRef = useRef<string[]>([]);

  // ============================================
  // 🔹 FUNCIÓN DE EVALUACIÓN DE EXPRESIONES
  // ============================================
  const evaluateExpression = useCallback((expression: string): { valid: boolean; value: any } => {
    try {
      // Crear contexto seguro para evaluación
      const safeContext = {
        $: executionContext,
        execution: executionContext,
        $node: executionContext,
        data: executionContext ? Object.values(executionContext)[0]?.output : undefined,
        $json: executionContext ? Object.values(executionContext)[0]?.output : undefined,
        items: executionContext ? Object.values(executionContext).map(e => ({ json: e.output })) : [],
        node: node || {},
        $input: {
          first: () => executionContext ? Object.values(executionContext)[0]?.output : undefined,
          last: () => executionContext ? Object.values(executionContext)[Object.values(executionContext).length - 1]?.output : undefined,
          all: () => executionContext ? Object.values(executionContext).map(e => ({ json: e.output })) : [],
        }
      };

      // Crear función evaluadora con el contexto
      const evaluator = new Function(...Object.keys(safeContext), `return ${expression}`);
      const result = evaluator(...Object.values(safeContext));

      return { valid: true, value: result };
    } catch (error) {
      return { valid: false, value: undefined };
    }
  }, [executionContext, node]);

  // ============================================
  // 🔹 GENERACIÓN DE TIPOS DINÁMICOS
  // ============================================
  const generateDynamicTypes = (context: ExecutionContextByName): string => {
    const nodeTypes: string[] = [];
    for (const [nodeName, execution] of Object.entries(context)) {
      if (execution?.output) {
        const outputType = generateTypeFromValue(execution.output, 2);
        const inputType = generateTypeFromValue(execution.input, 2);
        const safeNodeName = `"${nodeName}"`;
        nodeTypes.push(`  ${safeNodeName}: { output: ${outputType}; input: ${inputType} };`);
      }
    }
    const nodeTypesStr = nodeTypes.length > 0 
      ? `{\n${nodeTypes.join('\n')}\n}` 
      : 'Record<string, { input: any; output: any }>';

    return `
// 🎯 Nodify Global Variables - Auto-generated from execution
declare const execution: ${nodeTypesStr};
declare const $: typeof execution;
declare const $node: typeof execution;

// Previous node output
declare const data: any; 
declare const $json: any;

// n8n-style helpers
declare const items: Array<any>;
declare const $input: {
  first: () => any;
  last: () => any;
  all: () => Array<any>;
};

// Current node metadata
declare const node: {
  id: string;
  name: string;
  properties: Record<string, { value: any }>;
};
`;
  };

  const generateTypeFromValue = (value: any, indent: number = 0): string => {
    const spaces = '  '.repeat(indent);
    if (value === null || value === undefined) return 'any';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'any[]';
      const itemTypes = new Set(value.map(v => generateTypeFromValue(v, indent)));
      return `Array<${Array.from(itemTypes).join(' | ')}>`;
    }
    if (typeof value === 'object') {
      const props = Object.entries(value).map(([key, val]) => {
        const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
        return `${spaces}  ${safeKey}: ${generateTypeFromValue(val, indent + 1)}`;
      });
      return props.length > 0 ? `{\n${props.join(';\n')};\n${spaces}}` : 'Record<string, any>';
    }
    return typeof value;
  };

  // ============================================
  // 🔹 ACTUALIZACIÓN DE TIPOS DINÁMICOS
  // ============================================
  useEffect(() => {
    if (!monacoRef.current) return;
    const monaco = monacoRef.current;
    
    const dynamicTypes = generateDynamicTypes(executionContext || {});

    // Eliminar tipos anteriores
    const oldLib = disposablesRef.current.find(d => (d as any)._uri?.path.includes('nodify-dynamic'));
    if (oldLib) {
      oldLib.dispose();
      disposablesRef.current = disposablesRef.current.filter(d => d !== oldLib);
    }

    // Agregar nuevos tipos
    const lib = monaco.languages.typescript.javascriptDefaults.addExtraLib(
      dynamicTypes,
      'ts:nodify-dynamic.d.ts'
    );
    disposablesRef.current.push(lib);

    console.log('[Nodify Editor] Types updated for nodes:', Object.keys(executionContext));
  }, [executionContext]);

  // ============================================
  // 🔹 CONFIGURACIÓN INICIAL DE MONACO
  // ============================================
  const providersRegisteredRef = useRef(false);

  const handleBeforeMount: BeforeMount = (monaco) => {
    monacoRef.current = monaco;

    // Verificar si ya existen providers registrados globalmente
    if (!providersRegisteredRef.current) {
      providersRegisteredRef.current = true;
    } else {
      // Si ya están registrados, no hacer nada más y salir temprano
      return;
    }

    // 🎨 TEMA PERSONALIZADO - Acorde a tu paleta
    monaco.editor.defineTheme('nodify-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'd28b5c', fontStyle: 'bold' },       // cobre - keywords
        { token: 'string', foreground: 'b6c68a' },                           // verde oliva tenue
        { token: 'number', foreground: 'e0b070' },                           // dorado pálido
        { token: 'comment', foreground: '7a7a7a', fontStyle: 'italic' },     // gris cálido
        { token: 'variable', foreground: 'e6e0d9' },                         // texto principal
        { token: 'type', foreground: 'd1bfa5' },                             // beige claro (tipos)
        { token: 'function', foreground: 'e6cbb5' },                         // arena suave (funciones)
        { token: 'identifier', foreground: 'e6e0d9' },                       // texto normal
        { token: 'delimiter', foreground: '9a8f88' },                        // delimitadores sutiles

        /* === Tokens especiales para Nodify === */
        { token: 'variable.nodify', foreground: 'd28b5c', fontStyle: 'bold' },  // cobre brillante
        { token: 'number.nodify', foreground: 'e0b070' },                       // dorado pálido
        { token: 'string.nodify', foreground: 'b6c68a' },                       // verde oliva
        { token: 'delimiter.nodify', foreground: 'd28b5c' },                    // cobre
        { token: 'delimiter.bracket', foreground: 'd1bfa5', fontStyle: 'bold' } // beige para brackets
      ],

     colors: {
      /* === Base === */
      'editor.background': '#1c1c1c',             // Fondo carbón (igual que el theme)
      'editor.foreground': '#e6e0d9',             // Texto principal (gris cálido)

      /* === Números de línea === */
      'editorLineNumber.foreground': '#555555',   // Gris medio
      'editorLineNumber.activeForeground': '#d28b5c', // Cobre (primary)

      /* === Selección y cursor === */
      'editor.selectionBackground': '#d28b5c33',        // Cobre con transparencia
      'editor.inactiveSelectionBackground': '#d28b5c1a',
      'editorCursor.foreground': '#d28b5c',             // Cobre

      /* === Línea actual === */
      'editor.lineHighlightBackground': '#2a2a2a40',   // Resalte sutil
      'editor.lineHighlightBorder': '#00000000',       // Sin borde

      /* === Widgets (hover, autocomplete, etc.) === */
      'editorWidget.background': '#212121',            // Fondo tarjetas
      'editorWidget.border': '#2e2e2e',                // Borde gris oscuro
      'editorWidget.foreground': '#e6e0d9',

      'editorHoverWidget.background': '#212121',
      'editorHoverWidget.border': '#d28b5c55',         // Borde cobre translúcido

      'editorSuggestWidget.background': '#212121',
      'editorSuggestWidget.border': '#2e2e2e',
      'editorSuggestWidget.foreground': '#e6e0d9',
      'editorSuggestWidget.selectedBackground': '#2e2e2e66',
      'editorSuggestWidget.highlightForeground': '#d28b5c',
      'editorSuggestWidget.focusHighlightForeground': '#d28b5c',

      /* === Listas y menús === */
      'list.hoverBackground': '#2e2e2e44',
      'list.activeSelectionBackground': '#2e2e2e',
      'list.inactiveSelectionBackground': '#2e2e2e33',
      'list.highlightForeground': '#d28b5c',

      /* === Scrollbar === */
      'scrollbarSlider.background': '#2e2e2e44',
      'scrollbarSlider.hoverBackground': '#2e2e2e66',
      'scrollbarSlider.activeBackground': '#2e2e2e',

      /* === Guías de indentación === */
      'editorIndentGuide.background': '#2e2e2e33',
      'editorIndentGuide.activeBackground': '#2e2e2e',

      /* === Sugerencias de coincidencia === */
      'editor.findMatchBackground': '#d28b5c33',
      'editor.findMatchHighlightBackground': '#d28b5c22',
      'editor.wordHighlightBackground': '#d28b5c11',
    }

    });

    // 📝 Registrar lenguaje personalizado
    monaco.languages.register({ id: 'nodifyLang' });

    // 📝 Definir tokenizer para nodifyLang
    monaco.languages.setMonarchTokensProvider('nodifyLang', {
      tokenizer: {
        root: [
          [/{{/, { token: 'delimiter.bracket', next: '@expression' }],
          [/./, 'variable'], // Default token for plain text
        ],
        expression: [
          [/}}/, { token: 'delimiter.bracket', next: '@pop' }],
          [/[a-zA-Z_$][a-zA-Z0-9_$]*/, 'variable.nodify'], // Highlight variables
          [/\d+\.\d+|\d+/, 'number.nodify'], // Highlight numbers
          [/['"].*?['"]/, 'string.nodify'], // Highlight strings
          [/\.|\(|\[|\]|\)|\?|:/, 'delimiter.nodify'], // Highlight operators/delimiters
          [/./, 'variable.nodify'], // Catch-all for other characters in expression
        ],
      },
    });

    // 🎯 CONFIGURACIÓN TYPESCRIPT/JAVASCRIPT
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      allowJs: true,
      checkJs: false,
    });

    // Deshabilitar diagnósticos molestos
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: [1108, 1005, 1109, 2304, 2552, 2792], // Códigos innecesarios
    });

    // ============================================
    // 🔥 PROVEEDOR DE SUGERENCIAS MEJORADO
    // ============================================
    const completionProvider = monaco.languages.registerCompletionItemProvider(['javascript', 'nodifyLang'], {
      triggerCharacters: ['.', '[', "'", '"', '{', '$'],
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
        
        // Detectar si estamos dentro de {{ }}
        const expressionMatch = textUntilPosition.match(/{{([^}]*)$/);
        const content = expressionMatch ? expressionMatch[1] : textUntilPosition;

        // ============================================
        // CASO 1: Acceso a propiedades de nodo después del bracket cerrado
        // Ejemplo: $['Set 1'].  o  execution['HTTP'].
        // ============================================
        const nodeAccessMatch = content.match(/(?:\$|execution|\$node)\[['"]([^'"]+)['"]\]\.$/);
        if (nodeAccessMatch) {
          const nodeName = nodeAccessMatch[1];
          const nodeExists = allNodes.some(n => (n.data.label || n.data.type) === nodeName);
          
          if (nodeExists) {
            return {
              suggestions: [
                { 
                  label: 'output', 
                  kind: monaco.languages.CompletionItemKind.Property, 
                  insertText: 'output', 
                  documentation: {
                    value: '**📤 Output Data**\n\nThe data returned by this node after execution',
                    isTrusted: true
                  },
                  range, 
                  sortText: '0_output',
                  detail: 'Node output'
                },
                { 
                  label: 'input', 
                  kind: monaco.languages.CompletionItemKind.Property, 
                  insertText: 'input', 
                  documentation: {
                    value: '**📥 Input Data**\n\nThe data received by this node',
                    isTrusted: true
                  },
                  range, 
                  sortText: '1_input',
                  detail: 'Node input'
                },
              ],
            };
          }
        }

        // ============================================
        // CASO 2: Propiedades anidadas del output/input
        // Ejemplo: $['Set 1'].output.user.
        // ============================================
        const outputAccessMatch = content.match(/(?:\$|execution|\$node)\[['"]([^'"]+)['"]\]\.(?:output|input)\.(.*)$/);
        if (outputAccessMatch) {
          const nodeName = outputAccessMatch[1];
          const path = outputAccessMatch[2];
          const nodeExec = executionContext[nodeName];
          
          if (nodeExec?.output) {
            let currentData = nodeExec.output;
            const pathParts = path.split('.').slice(0, -1);
            
            // Navegar por el path
            for (const part of pathParts) {
              if (currentData && typeof currentData === 'object' && part in currentData) {
                currentData = currentData[part];
              } else {
                currentData = null;
                break;
              }
            }

            if (currentData && typeof currentData === 'object') {
              return {
                suggestions: Object.keys(currentData).map((key, index) => {
                  const val = currentData[key];
                  let preview = '';
                  
                  try {
                    if (val === null || val === undefined) {
                      preview = String(val);
                    } else if (typeof val === 'object') {
                      preview = Array.isArray(val) ? '[Array]' : '{Object}';
                    } else if (typeof val === 'string' && val.length > 50) {
                      preview = `"${val.substring(0, 50)}..."`;
                    } else {
                      preview = JSON.stringify(val);
                    }
                  } catch {
                    preview = typeof val;
                  }

                  return {
                    label: key,
                    kind: monaco.languages.CompletionItemKind.Property,
                    insertText: key,
                    documentation: {
                      value: `**Property: \`${key}\`**\n\nValue: \`${preview}\`\n\nType: \`${typeof val}\``,
                      isTrusted: true
                    },
                    range,
                    sortText: `2_${index.toString().padStart(3, '0')}_${key}`,
                    detail: preview
                  };
                }),
              };
            }
          }
        }
        
        // ============================================
        // CASO 3 MEJORADO: Sugerencia de nombres de nodos
        // Activado desde: $[  o  $['  o  $['Se
        // ============================================
        const nodeNameSuggestionMatch = content.match(/(?:\$|execution|\$node)\[(['"]?)([^'"\]]*)$/);
        if (nodeNameSuggestionMatch) {
          const quote = nodeNameSuggestionMatch[1]; // ' o " o vacío
          const partialName = nodeNameSuggestionMatch[2]; // Lo que ya escribió
          
          // Calcular el range correcto
          const rangeStart = position.column - partialName.length;
          const suggestionRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: rangeStart,
            endColumn: position.column,
          };

          return {
            suggestions: allNodes
              .filter(n => {
                const nodeName = n.data.label || n.data.type;
                return nodeName.toLowerCase().includes(partialName.toLowerCase());
              })
              .map((n, index) => {
                const nodeDef = getNodeDefinition(n.data.type);
                const nodeName = n.data.label || n.data.type;
                
                // Si ya hay comilla, solo insertar el nombre + cierre
                // Si no hay comilla, insertar con comillas
                const insertText = quote 
                  ? `${nodeName}']` 
                  : `'${nodeName}']`;
                
                return {
                  label: nodeName,
                  kind: monaco.languages.CompletionItemKind.Module,
                  insertText: insertText,
                  documentation: {
                    value: `**🔷 ${nodeDef?.name || n.data.type}**\n\n${nodeDef?.description || 'Workflow node'}\n\n---\n\nNode ID: \`${n.id}\``,
                    isTrusted: true
                  },
                  range: suggestionRange,
                  sortText: `3_${index.toString().padStart(3, '0')}`,
                  detail: nodeDef?.description || 'Workflow node',
                  command: { 
                    id: 'editor.action.triggerSuggest', 
                    title: 'Trigger suggestions' 
                  }
                };
              }),
          };
        }

        // ============================================
        // CASO 4: Variables globales al inicio
        // ============================================
        if (content.trim() === '' || /[{\s]$/.test(content)) {
          return {
            suggestions: [
              { 
                label: '$', 
                kind: monaco.languages.CompletionItemKind.Variable, 
                insertText: "$[", 
                documentation: {
                  value: '**🌐 Global Execution Context**\n\nAccess any node by name\n\n```javascript\n$[\'HTTP Request\'].output\n$[\'Set 1\'].input\n```',
                  isTrusted: true
                },
                range, 
                command: { id: 'editor.action.triggerSuggest', title: 'Trigger' },
                sortText: '0_$',
                detail: 'Nodify global'
              },
              { 
                label: '$node', 
                kind: monaco.languages.CompletionItemKind.Variable, 
                insertText: "$node[", 
                documentation: {
                  value: '**🔗 Node Accessor (n8n compatible)**\n\nAlias for execution context\n\n```javascript\n$node[\'HTTP Request\'].output.json\n```',
                  isTrusted: true
                },
                range,
                command: { id: 'editor.action.triggerSuggest', title: 'Trigger' },
                sortText: '0_node',
                detail: 'Nodify global'
              },
              { 
                label: 'execution', 
                kind: monaco.languages.CompletionItemKind.Variable, 
                insertText: "execution[", 
                documentation: {
                  value: '**📋 Execution History**\n\nComplete execution context object\n\n```javascript\nexecution[\'Set 1\'].output\n```',
                  isTrusted: true
                },
                range,
                command: { id: 'editor.action.triggerSuggest', title: 'Trigger' },
                sortText: '0_execution',
                detail: 'Nodify global'
              },
              { 
                label: 'data', 
                kind: monaco.languages.CompletionItemKind.Variable, 
                insertText: 'data', 
                documentation: {
                  value: '**📦 Previous Node Output**\n\nShortcut to first input item\n\n```javascript\ndata.user.email\ndata.id\n```',
                  isTrusted: true
                },
                range,
                sortText: '1_data',
                detail: 'Nodify global'
              },
              { 
                label: '$json', 
                kind: monaco.languages.CompletionItemKind.Variable, 
                insertText: '$json', 
                documentation: {
                  value: '**📦 Data Alias**\n\nAnother way to access previous output',
                  isTrusted: true
                },
                range,
                sortText: '1_json',
                detail: 'Nodify global'
              },
              { 
                label: 'items', 
                kind: monaco.languages.CompletionItemKind.Variable, 
                insertText: 'items', 
                documentation: {
                  value: '**📚 Input Items Array**\n\nAll items from previous node\n\n```javascript\nitems[0].json.name\nitems.map(i => i.json.id)\n```',
                  isTrusted: true
                },
                range,
                sortText: '2_items',
                detail: 'Nodify global'
              },
              { 
                label: '$input', 
                kind: monaco.languages.CompletionItemKind.Interface, 
                insertText: '$input', 
                documentation: {
                  value: '**🔍 Input Helper**\n\nUtility methods for input access\n\n```javascript\n$input.first().json\n$input.last().json\n$input.all()\n```',
                  isTrusted: true
                },
                range,
                sortText: '3_input',
                detail: 'Nodify helper'
              },
              { 
                label: 'node', 
                kind: monaco.languages.CompletionItemKind.Struct, 
                insertText: 'node', 
                documentation: {
                  value: '**⚙️ Current Node**\n\nMetadata and properties\n\n```javascript\nnode.id\nnode.name\nnode.properties.url.value\n```',
                  isTrusted: true
                },
                range,
                sortText: '4_node',
                detail: 'Nodify global'
              },
            ],
          };
        }

        // No mostrar sugerencias nativas de JS
        return { suggestions: [] };
      },
    });

    // ============================================
    // 💬 HOVER PROVIDER MEJORADO
    // ============================================
    const hoverProvider = monaco.languages.registerHoverProvider(['javascript', 'nodifyLang'], {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position);

        const hoverTexts: Record<string, string> = {
          execution: '**🌐 Execution Context**\n\nObject containing all executed nodes\' data.\n\n```javascript\nexecution[\'Node Name\'].output\nexecution[\'Node Name\'].input\n```\n\nAccess any node in the workflow by its label.',
          $: '**🌐 Execution Context (Shortcut)**\n\nAlias for `execution`\n\n```javascript\n$[\'Set 1\'].output.value\n$[\'HTTP Request\'].output.body\n```',
          $node: '**🔗 Node Accessor**\n\nn8n-compatible syntax\n\n```javascript\n$node[\'HTTP Request\'].json\n$node[\'Set Variables\'].output\n```',
          items: '**📚 Input Items Array**\n\nAll data items from the previous node\n\n```javascript\nitems[0].json.id\nitems.map(item => item.json.name)\nitems.length\n```',
          data: '**📦 Input Data**\n\nShortcut for `items[0]` - the first input item\n\n```javascript\ndata.user.name\ndata.id\ndata.email\n```',
          $json: '**📦 Input Data (Alias)**\n\nAlias for `data`\n\n```javascript\n$json.user.email\n$json.status\n```',
          node: '**⚙️ Current Node**\n\nAccess properties and metadata of the current node\n\n```javascript\nnode.id // Node unique identifier\nnode.name // Node type name\nnode.properties.url.value // Property values\n```',
          $input: '**🔍 Input Helper**\n\nUtility methods for input access (n8n-style)\n\n```javascript\n$input.first() // Get first item\n$input.last() // Get last item\n$input.all() // Get all items\n```'
        };

        // Check for static hover texts first
        if (word && hoverTexts[word.word]) {
          return {
            contents: [{
              value: hoverTexts[word.word],
              isTrusted: true,
              supportHtml: true
            }]
          };
        }

        // Dynamic hover for expressions like {{...}}
        const lineContent = model.getLineContent(position.lineNumber);
        const offset = model.getOffsetAt(position);
        const lineOffset = model.getOffsetAt({ lineNumber: position.lineNumber, column: 1 });
        const columnOffset = offset - lineOffset;

        // Buscar expresiones {{...}} en la línea actual
        const regex = /\{\{([^}]+)\}\}/g;
        let match;

        while ((match = regex.exec(lineContent)) !== null) {
          const startCol = match.index + 1; // Monaco columns are 1-indexed
          const endCol = startCol + match[0].length;

          // Verificar si el cursor está dentro de esta expresión
          if (columnOffset >= match.index && columnOffset <= match.index + match[0].length) {
            const expression = match[1].trim();
            const hasContext = executionContext && Object.keys(executionContext).length > 0;

            if (!hasContext) {
              return {
                range: new monaco.Range(position.lineNumber, startCol, position.lineNumber, endCol),
                contents: [{
                  value: '**⏳ Pending Validation**\n\nRun the workflow to get live data and validate this variable.',
                  isTrusted: true,
                  supportHtml: true
                }]
              };
            }

            // Evaluar la expresión
            const { valid, value: resolvedValue } = evaluateExpression(expression);

            if (valid) {
              let displayValue = '';
              try {
                if (resolvedValue === null || resolvedValue === undefined) {
                  displayValue = String(resolvedValue);
                } else if (typeof resolvedValue === 'object') {
                  displayValue = JSON.stringify(resolvedValue, null, 2);
                  if (displayValue.length > 500) {
                    displayValue = displayValue.substring(0, 500) + '\n... (truncated)';
                  }
                } else if (typeof resolvedValue === 'string' && resolvedValue.length > 200) {
                  displayValue = `"${resolvedValue.substring(0, 200)}..." (truncated)`;
                } else {
                  displayValue = JSON.stringify(resolvedValue);
                }
              } catch {
                displayValue = String(resolvedValue);
              }

              return {
                range: new monaco.Range(position.lineNumber, startCol, position.lineNumber, endCol),
                contents: [{
                  value: `**✓ Valid Variable**\n\n\`\`\`json\n${displayValue}\n\`\`\`\n\n**Type:** \`${typeof resolvedValue}\``,
                  isTrusted: true,
                  supportHtml: true
                }]
              };
            } else {
              return {
                range: new monaco.Range(position.lineNumber, startCol, position.lineNumber, endCol),
                contents: [{
                  value: `**✗ Invalid Variable**\n\n\`${expression}\`\n\nThis variable cannot be resolved with the current execution context.`,
                  isTrusted: true,
                  supportHtml: true
                }]
              };
            }
          }
        }

        return null;
      }
    });

    monaco.editor.setTheme('nodify-dark');

    disposablesRef.current.push(completionProvider, hoverProvider);
  };
  
  // ============================================
  // 🔹 MONTAJE DEL EDITOR
  // ============================================
  const handleOnMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance;

    monacoRef.current.editor.setTheme('nodify-dark');

    // Detect if mobile for responsive options
    const isMobileDevice = window.innerWidth < 640;

    // ============================================
    // 🔹 CLICK HANDLER FOR MOBILE TOOLTIPS
    // ============================================
    if (isMobileDevice) {
      editorInstance.onMouseDown((e) => {
        if (!e.target.position) return;

        const position = e.target.position;
        const model = editorInstance.getModel();
        if (!model) return;

        const lineContent = model.getLineContent(position.lineNumber);
        const offset = model.getOffsetAt(position);
        const lineOffset = model.getOffsetAt({ lineNumber: position.lineNumber, column: 1 });
        const columnOffset = offset - lineOffset;

        // Buscar expresiones {{...}} en la línea actual
        const regex = /\{\{([^}]+)\}\}/g;
        let match;

        while ((match = regex.exec(lineContent)) !== null) {
          const startCol = match.index;
          const endCol = startCol + match[0].length;

          // Verificar si el click está dentro de esta expresión
          if (columnOffset >= match.index && columnOffset <= match.index + match[0].length) {
            const expression = match[1].trim();
            const hasContext = executionContext && Object.keys(executionContext).length > 0;

            if (hasContext) {
              // Evaluar la expresión
              const { valid, value: resolvedValue } = evaluateExpression(expression);

              if (valid) {
                let displayValue = '';
                try {
                  if (resolvedValue === null || resolvedValue === undefined) {
                    displayValue = String(resolvedValue);
                  } else if (typeof resolvedValue === 'object') {
                    displayValue = JSON.stringify(resolvedValue, null, 2);
                    if (displayValue.length > 500) {
                      displayValue = displayValue.substring(0, 500) + '\n... (truncated)';
                    }
                  } else if (typeof resolvedValue === 'string' && resolvedValue.length > 200) {
                    displayValue = `"${resolvedValue.substring(0, 200)}..." (truncated)`;
                  } else {
                    displayValue = JSON.stringify(resolvedValue);
                  }
                } catch {
                  displayValue = String(resolvedValue);
                }

                // Show hover widget manually for mobile
                editorInstance.trigger('keyboard', 'editor.action.showHover', {});
              }
            }
            break;
          }
        }
      });
    }

    // Aplicar decoraciones iniciales después de montar
    setTimeout(() => {
      updateDecorations();
    }, 100);

    const editorOptions: editor.IStandaloneEditorConstructionOptions = {
      // Layout
      minimap: { enabled: false },
      lineNumbers: oneLine ? 'off' : 'on',
      glyphMargin: !oneLine,
      folding: !oneLine,
      lineDecorationsWidth: oneLine ? 5 : undefined,
      lineNumbersMinChars: oneLine ? 0 : (isMobileDevice ? 2 : 3),

      // Scroll - Larger scrollbars on mobile for touch
      scrollBeyondLastLine: false,
      scrollbar: {
        vertical: oneLine ? 'hidden' : 'auto',
        horizontal: 'auto',
        useShadows: true,
        verticalScrollbarSize: isMobileDevice ? 14 : 10,
        horizontalScrollbarSize: isMobileDevice ? 14 : 10,
        handleMouseWheel: true,
        alwaysConsumeMouseWheel: false,
      },

      // Hide iPad keyboard button
      showUnused: false,
      showDeprecated: false,
      
      // Wrapping
      wordWrap: 'off',
      wrappingStrategy: 'advanced',
      
      // Visual
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      renderLineHighlight: oneLine ? 'none' : 'line',
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      renderWhitespace: 'all', // Renderiza todos los caracteres de espacio en blanco
      renderControlCharacters: false,
      fontLigatures: true,
      bracketPairColorization: { enabled: true },
      
      // Sugerencias - SIN BASURA DE JS NATIVO
      suggest: {
        snippetsPreventQuickSuggestions: false,
        showWords: false, // ❌ Sin palabras del código
        showSnippets: false, // ❌ Sin snippets nativos
        showMethods: false, // ❌ Sin métodos nativos
        showFunctions: false, // ❌ Sin funciones nativas
        showConstructors: false, // ❌ Sin constructores
        showDeprecated: false, // ❌ Sin deprecated
        showClasses: false, // ❌ Sin clases nativas
        showStructs: false, // ❌ Sin structs
        showInterfaces: false, // ❌ Sin interfaces
        showModules: false, // ❌ Sin módulos
        showProperties: true, // ✅ Solo propiedades personalizadas
        showEvents: false, // ❌ Sin eventos
        showOperators: false, // ❌ Sin operadores
        showUnits: false, // ❌ Sin unidades
        showValues: false, // ❌ Sin valores
        showConstants: false, // ❌ Sin constantes
        showEnums: false, // ❌ Sin enums
        showEnumMembers: false, // ❌ Sin enum members
        showKeywords: false, // ❌ Sin keywords de JS
        showColors: false, // ❌ Sin colores
        showFiles: false, // ❌ Sin archivos
        showReferences: false, // ❌ Sin referencias
        showFolders: false, // ❌ Sin carpetas
        showTypeParameters: false, // ❌ Sin type parameters
        showIssues: false, // ❌ Sin issues
        showUsers: false, // ❌ Sin users
        showVariables: true, // ✅ Solo variables personalizadas
        insertMode: 'insert', // Insertar en lugar de reemplazar
        filterGraceful: true,
        localityBonus: true,
        preview: false, // Desactivar preview que puede interferir
        previewMode: 'prefix', // Modo prefix para mejor compatibilidad
      },
      
      // Comportamiento
      padding: {
        top: oneLine ? 8 : (isMobileDevice ? 12 : 10),
        bottom: oneLine ? 8 : (isMobileDevice ? 12 : 10)
      },
      contextmenu: !oneLine && !isMobileDevice, // Disable context menu on mobile
      fixedOverflowWidgets: true,
      quickSuggestions: {
        other: 'on',
        comments: false,
        strings: 'on'
      },
      quickSuggestionsDelay: 100,
      acceptSuggestionOnCommitCharacter: false, // NO aceptar sugerencias con Space u otros caracteres
      acceptSuggestionOnEnter: 'on',
      suggestOnTriggerCharacters: true,
      wordBasedSuggestions: 'off', // Desactivar sugerencias basadas en palabras
      readOnly,
      tabSize: 2,
      insertSpaces: true,
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      formatOnPaste: true,
      formatOnType: true,
    };
    
    editorInstance.updateOptions(editorOptions);


    // Manejar eventos de teclado
    const keyDownDisposable = editorInstance.onKeyDown((e) => {
      // Stop Space from bubbling to global listeners (keeps space working in editor)
      if (e.keyCode === monacoRef.current?.KeyCode.Space) {
        e.stopPropagation();
        return;
      }
      // Bloquear solo Enter en modo oneLine
      if (oneLine && e.keyCode === monacoRef.current?.KeyCode.Enter) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    });

    disposablesRef.current.push(keyDownDisposable);

    // Actualizar decoraciones cuando el contenido cambie
    const model = editorInstance.getModel();
    if (model) {
      let debounceTimer: NodeJS.Timeout;

      const changeDisposable = model.onDidChangeContent(() => {
        // Limpiar timer anterior
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        // Crear nuevo timer para debounce
        debounceTimer = setTimeout(() => {
          updateDecorations();
        }, 300);
      });

      disposablesRef.current.push(changeDisposable);
    }
  };

  // ============================================
  // 🔹 VALIDACIÓN Y DECORACIÓN DE VARIABLES
  // ============================================
  const updateDecorations = useCallback(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const text = model.getValue();
    const decorations: any[] = [];
    const hasContext = executionContext && Object.keys(executionContext).length > 0;

    // Detectar todas las expresiones {{...}}
    const regex = /\{\{([^}]+)\}\}/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const expression = match[1].trim();
      const startPos = model.getPositionAt(match.index);
      const endPos = model.getPositionAt(match.index + match[0].length);

      let className = 'variable-pending';
      let hoverMessage = {
        value: `**⏳ Pending Validation**\n\nRun the workflow to get live data and validate this variable.`
      };

      if (hasContext) {
        const { valid, value } = evaluateExpression(expression);
        className = valid ? 'variable-valid' : 'variable-invalid';
        
        let preview = '';
        if (valid) {
          try {
            if (value === null || value === undefined) {
              preview = String(value);
            } else if (typeof value === 'object') {
              preview = Array.isArray(value) ? `[Array(${value.length})]` : '[Object]';
            } else if (typeof value === 'string' && value.length > 100) {
              preview = `\"${value.substring(0, 100)}...\"`;
            } else {
              preview = JSON.stringify(value);
            }
          } catch {
            preview = String(value);
          }
        }

        hoverMessage = valid
          ? {
              value: `**✓ Valid Variable**\n\n\`\`\`json\n${preview}\n\`\`\`\n\n**Type:** \`${typeof value}\``
            }
          : {
              value: `**✗ Invalid Variable**\n\nExpression: \`${expression}\`\n\nThis variable cannot be resolved with the current execution context.`
            };
      }

      decorations.push({
        range: new monacoRef.current.Range(
          startPos.lineNumber,
          startPos.column,
          endPos.lineNumber,
          endPos.column
        ),
        options: {
          className,
          hoverMessage,
          inlineClassName: hasContext ? (evaluateExpression(expression).valid ? 'variable-inline-valid' : 'variable-inline-invalid') : ''
        },
      });
    }

    // Aplicar decoraciones
    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, decorations);
  }, [executionContext, node, value, evaluateExpression]);

  // Actualizar decoraciones cuando cambie el contexto o el valor
  useEffect(() => {
    if (editorRef.current) {
      const timer = setTimeout(() => {
        updateDecorations();
      }, 300); // Debounce

      return () => clearTimeout(timer);
    }
  }, [executionContext, value, updateDecorations]);

  // ============================================
  // 🔹 CLEANUP
  // ============================================
  useEffect(() => {
    return () => {
      disposablesRef.current.forEach(d => d.dispose());
    };
  }, []);

  const editorHeight = oneLine ? 44 : height;

  // Detect mobile screen size for responsive font size
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div
      style={{
        height: oneLine ? 'auto' : height,
        minHeight: oneLine ? 44 : 'none'
      }}
      className="rounded-lg overflow-hidden"
    >
      <Editor
        width="100%"
        height={editorHeight}
        language={oneLine ? 'nodifyLang' : language}
        theme="nodify-dark"
        value={value}
        onChange={(val) => onChange(val || '')}
        beforeMount={handleBeforeMount}
        onMount={handleOnMount}
        options={{
          fontSize: isMobile ? 11 : 13,
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          automaticLayout: true,
          fontLigatures: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;
