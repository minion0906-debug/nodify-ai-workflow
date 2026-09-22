try {
const doFetch = (typeof globalThis !== 'undefined' && globalThis.fetch) ? globalThis.fetch.bind(globalThis) : (await import('node-fetch')).default;
const auth = node.properties.authentication?.value || 'credentials';
const credentialId = node.properties.credentials?.value;
const manualApiKey = node.properties.apiKey?.value;
const model = node.properties.model?.value || 'gpt-4o-mini';
const systemPrompt = node.properties.systemPrompt?.value || '';
const temperature = node.properties.temperature?.value ?? 0.7;
const maxTokens = parseInt(node.properties.maxTokens?.value || 1000);
const maxIterations = parseInt(node.properties.maxIterations?.value || 4);
const historyWindow = parseInt(node.properties.historyWindow?.value || 10);
const toolChoice = node.properties.toolChoice?.value || 'auto';
const jsonMode = node.properties.jsonMode?.value === true;

helpers.log('[AI Agent] Starting execution');

let apiKey = null;
if (auth === 'credentials') {
  if (credentialId && typeof helpers?.getCredentialData === 'function') {
    const credData = await helpers.getCredentialData(credentialId);
    apiKey = credData?.apiKey || null;
  } else if (env?.OPENAI_API_KEY) {
    apiKey = env.OPENAI_API_KEY;
  }
} else if (auth === 'manual') {
  apiKey = manualApiKey;
}

const mainInput = $input.first() || {};
let toolsInput = (mainInput?.__ports?.tools) || (execution['Tools']?.output);
let memoryInput = (mainInput?.__ports?.memory) || (execution['Memory']?.output);
let modelInput = (mainInput?.__ports?.model) || (execution['Model']?.output);

helpers.log(`Memory input source: ${memoryInput ? (mainInput?.__ports?.memory ? '__ports.memory' : 'execution.Memory') : 'none'}`);
if (memoryInput) {
  helpers.log(`Memory input type: ${typeof memoryInput}, has messages: ${Array.isArray(memoryInput.messages)}`);
  if (memoryInput.messages) {
    helpers.log(`Memory messages count: ${memoryInput.messages.length}`);
  }
}

if (!memoryInput && Array.isArray(mainInput?.messages)) {
  memoryInput = mainInput;
  helpers.log('Using mainInput.messages as memory');
}

if (toolsInput && !Array.isArray(toolsInput)) {
  toolsInput = [toolsInput];
} else if (!toolsInput) {
  toolsInput = [];
}

let provider = 'openai';
let endpoint = 'https://api.openai.com/v1/chat/completions';
let modelName = model;

if (modelInput) {
  if (modelInput.provider) provider = String(modelInput.provider);
  if (modelInput.model) modelName = String(modelInput.model);
  if (provider === 'openai') {
    if (modelInput.apiKey) apiKey = modelInput.apiKey;
    else if (modelInput.credentialId && typeof helpers?.getCredentialData === 'function') {
      const c = await helpers.getCredentialData(modelInput.credentialId);
      if (c?.apiKey) apiKey = c.apiKey;
    }
    if (modelInput.endpoint) endpoint = String(modelInput.endpoint);
  }
}

if (!apiKey) {
  helpers.error('No API key provided');
  return { error: 'No API key provided' };
}

const userMessage = mainInput.message || mainInput.prompt || mainInput.text || JSON.stringify(mainInput);
const chatId = mainInput.chatId || mainInput.chat?.id;
const sessionId = mainInput.sessionId || 'default';

helpers.log(`Model provider: ${provider}, model: ${modelName}`);
helpers.log(`Tool choice: ${toolChoice}, tools connected: ${Array.isArray(toolsInput)?toolsInput.length:0}`);
helpers.log(`User message: ${String(userMessage).substring(0, 100)}...`);
helpers.log(`Chat ID: ${chatId || 'none'}, Session: ${sessionId}`);

const messages = [];
if (systemPrompt) {
  messages.push({ role: 'system', content: systemPrompt });
  helpers.log('System prompt added');
}

let memLoaded = 0;

// Priority 1: Memory node connected
if (memoryInput && Array.isArray(memoryInput.messages)) {
  for (const msg of memoryInput.messages) {
    if (msg?.role && msg?.content) {
      messages.push({ role: msg.role, content: String(msg.content) });
      memLoaded++;
    }
  }
  helpers.log(`Loaded ${memLoaded} messages from Memory input`);
}
// Priority 2: Chat Trigger history (mainInput.history)
else if (mainInput?.history && (Array.isArray(mainInput.history.user) || Array.isArray(mainInput.history.agent))) {
  try {
    const userHist = Array.isArray(mainInput.history.user) ? mainInput.history.user : [];
    const agentHist = Array.isArray(mainInput.history.agent) ? mainInput.history.agent : [];
    const maxLen = Math.max(userHist.length, agentHist.length);
    const start = Math.max(0, maxLen - historyWindow);

    for (let i = start; i < maxLen; i++) {
      const u = userHist[i];
      const a = agentHist[i];
      if (u !== undefined) {
        messages.push({ role: 'user', content: String(u) });
        memLoaded++;
      }
      if (a !== undefined) {
        messages.push({ role: 'assistant', content: String(a) });
        memLoaded++;
      }
    }
    helpers.log(`Loaded ${memLoaded} messages from input.history`);
  } catch (e) {
    helpers.warn('Failed to load history from input:', e?.message || e);
  }
}
// Priority 3: Session Memory from execution context
else if (execution['__sessionMemory'] && execution['__sessionMemory'][sessionId]) {
  try {
    const sessionMessages = execution['__sessionMemory'][sessionId];
    if (Array.isArray(sessionMessages)) {
      // Apply history window
      const startIdx = Math.max(0, sessionMessages.length - (historyWindow * 2));
      const recentMessages = sessionMessages.slice(startIdx);

      for (const msg of recentMessages) {
        if (msg?.role && msg?.content) {
          messages.push({ role: msg.role, content: String(msg.content) });
          memLoaded++;
        }
      }
      helpers.log(`Loaded ${memLoaded} messages from __sessionMemory`);
    }
  } catch (e) {
    helpers.warn('Failed to load from __sessionMemory:', e?.message || e);
  }
}
// Priority 4: Scan execution context for memory outputs
else {
  try {
    const keys = Object.keys(execution || {});
    for (let i = keys.length - 1; i >= 0; i--) {
      const out = execution[keys[i]]?.output;
      if (out && Array.isArray(out.messages)) {
        for (const msg of out.messages) {
          if (msg?.role && msg?.content) {
            messages.push({ role: msg.role, content: String(msg.content) });
            memLoaded++;
          }
        }
        break;
      }
    }
    if (memLoaded > 0) {
      helpers.log(`Loaded ${memLoaded} messages from execution context memory`);
    } else {
      helpers.log('No memory provided - starting fresh conversation');
    }
  } catch (e) {
    helpers.warn('Failed to scan execution context for memory:', e?.message || e);
  }
}

messages.push({ role: 'user', content: String(userMessage || '') });

const toolSpecs = [];
const toolsMap = {};

if (toolsInput.length > 0 && toolChoice !== 'none') {
  for (const tool of toolsInput) {
    if (tool && tool.name && tool.enabled !== false) {
      let schema = tool.schema;
      if (typeof schema === 'string') {
        try { schema = JSON.parse(schema); } catch { schema = null; }
      }
      if (!schema || typeof schema !== 'object') {
        schema = { type: 'object', properties: {} };
      }

      toolSpecs.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description || '',
          parameters: schema
        }
      });

      toolsMap[tool.name] = {
        code: tool.code || '',
        schema,
        executor: tool.executor
      };
    }
  }
  helpers.log(`Registered ${toolSpecs.length} tools`);
} else if (toolChoice === 'none') {
  helpers.log('Tools disabled by configuration');
} else {
  helpers.log('No tools connected - agent will respond without tool calling');
}

async function callLLM(payload) {
  if (provider === 'openai') {
    const res = await doFetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!res.ok) return { error: 'OpenAI API error', status: res.status, details: json };
    return { data: json };
  } else {
    return { error: `Unsupported provider: ${provider}` };
  }
}

const usedTools = [];
let lastResponse = null;
let iterations = 0;

helpers.log('Starting tool-calling loop...');

while (iterations++ < maxIterations) {
  helpers.log(`Iteration ${iterations}/${maxIterations}`);

  const payload = { model: modelName, messages, temperature, max_tokens: maxTokens };

  if (toolSpecs.length > 0 && toolChoice !== 'none') {
    payload.tools = toolSpecs;
    payload.tool_choice = 'auto';
  }

  if (jsonMode && provider === 'openai') {
    payload.response_format = { type: 'json_object' };
  }

  const resp = await callLLM(payload);
  if (resp.error) {
    helpers.error(`LLM error: ${JSON.stringify(resp.error)}`);
    return resp;
  }

  const result = resp.data;
  lastResponse = result;
  const choice = result.choices && result.choices[0];
  const assistantMsg = choice?.message || {};

  if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0 && toolSpecs.length > 0 && toolChoice !== 'none') {
    messages.push({
      role: 'assistant',
      content: assistantMsg.content || null,
      tool_calls: assistantMsg.tool_calls
    });

    for (const tc of assistantMsg.tool_calls) {
      const tName = tc.function?.name;
      const argsJson = tc.function?.arguments || '{}';

      let args;
      try { args = JSON.parse(argsJson); } catch { args = { _raw: argsJson }; }

      let output = '';
      const toolDef = toolsMap[tName];

      if (toolDef) {
        try {
          let r;
          if (toolDef.executor && typeof toolDef.executor === 'function') {
            r = await toolDef.executor(args, helpers, modules, require, env, mainInput);
          } else if (toolDef.code) {
            const AsyncFn = Object.getPrototypeOf(async function(){}).constructor;
            const toolFn = new AsyncFn('args','helpers','modules','require','env','data', toolDef.code);
            r = await toolFn(args, helpers, modules, require, env, mainInput);
          } else {
            throw new Error('Tool has no code or executor');
          }

          output = typeof r === 'string' ? r : JSON.stringify(r);
        } catch (e) {
          output = JSON.stringify({ error: String(e?.message || e) });
        }
      } else {
        output = JSON.stringify({ error: `Tool not found: ${tName}` });
      }

      usedTools.push({
        name: tName,
        args,
        outputPreview: String(output).slice(0, 200)
      });

      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: String(output)
      });
    }

    continue;
  } else {
    const content = assistantMsg.content || '';

    // Save to session memory
    try {
      if (!execution['__sessionMemory']) execution['__sessionMemory'] = {};
      if (!execution['__sessionMemory'][sessionId]) execution['__sessionMemory'][sessionId] = [];

      execution['__sessionMemory'][sessionId].push({
        role: 'user',
        content: String(userMessage || '')
      });

      execution['__sessionMemory'][sessionId].push({
        role: 'assistant',
        content: String(content || '')
      });

      helpers.log(`Saved conversation to __sessionMemory[${sessionId}], total messages: ${execution['__sessionMemory'][sessionId].length}`);
    } catch (e) {
      helpers.warn('Failed to save to __sessionMemory:', e?.message || e);
    }

    return {
      message: content,
      raw: lastResponse,
      tools: usedTools,
      metadata: {
        model: modelName,
        provider,
        iterations,
        toolsUsed: usedTools.length,
        chatId,
        sessionId
      }
    };
  }
}

// Max iterations reached - still save user message
try {
  if (!execution['__sessionMemory']) execution['__sessionMemory'] = {};
  if (!execution['__sessionMemory'][sessionId]) execution['__sessionMemory'][sessionId] = [];
  execution['__sessionMemory'][sessionId].push({
    role: 'user',
    content: String(userMessage || '')
  });
} catch {}

return { error: 'Max tool iterations reached without final answer', tools: usedTools };

} catch (error) {
  return {
    error: 'AI Agent failed',
    message: error?.message || String(error),
    stack: error?.stack
  };
}
