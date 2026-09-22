# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Nodify** is a visual workflow automation tool (similar to n8n/Zapier) built with Next.js, React, and Firebase. Users create workflows by connecting nodes in a visual canvas powered by React Flow. Each node performs specific actions (webhooks, HTTP requests, AI operations, data transformations, etc.) with execution logic defined in JSON files.

## Development Commands

### Running the Application
```bash
npm run dev              # Start Next.js dev server on port 9003 with Turbopack
npm run build            # Production build
npm start                # Start production server
```

### Code Quality
```bash
npm run lint             # Run ESLint
npm run typecheck        # Type-check with TypeScript (tsc --noEmit)
```

### AI/Genkit Development
```bash
npm run genkit:dev       # Start Genkit dev server
npm run genkit:watch     # Start Genkit with watch mode
```

## Architecture

### Frontend Stack
- **Next.js 15** with App Router (uses route groups: `(app)` and `(auth)`)
- **TypeScript** with path alias `@/*` → `./src/*`
- **React Flow** for the workflow canvas editor
- **Tailwind CSS** + **shadcn/ui** components
- **Framer Motion** for animations
- **CodeMirror** for code editing in nodes

### Backend & Data
- **Firebase Authentication**: User authentication with strict ownership model
- **Firestore**: NoSQL database with user-scoped collections at `/users/{userId}/`
  - Collections: `workflows`, `credentials`, `tables`, `notifications`
  - Security rules enforce that users can only access their own data
- **Genkit (Firebase AI)**: AI flows for features like auto-generating node descriptions
  - Model: `googleai/gemini-2.5-flash`
  - API key stored in `.env` as `GEMINI_API_KEY`

### Core Concepts

#### 1. Workflows (`src/lib/types.ts`)
A workflow consists of:
- **Nodes**: Individual units of work (triggers, actions, logic gates)
- **Connections**: Edges connecting node outputs to inputs
- Each workflow has a status: `active`, `inactive`, or `draft`

#### 2. Node System (`src/nodes/`)
- Node definitions are JSON files in `src/nodes/` (e.g., `webhook.json`, `http_request.json`)
- Each node definition includes:
  - **Properties**: Configurable fields (string, number, boolean, options, JSON, color, etc.)
  - **Ports**: Input/output connection points
  - **executionCode**: JavaScript code snippet executed when the node runs
  - **Category**: `trigger`, `action`, `logic`, `data`, `ai`, `other`
  - **Visual appearance**: shape, color, icon

#### 3. Node Execution Context
The `executionCode` in each node has access to a global `context` object:
- `context.data`: Output data from the previous node
- `context.node.properties`: Current node's configured properties
- This allows dynamic, data-driven execution

#### 4. Group Stickers
Special visual grouping nodes (`groupSticker.json`) that:
- Can contain other nodes as children (parent-child relationships via `parentId`)
- Have adjustable size and background color
- Always render at `zIndex: 0` (below regular nodes)

#### 5. Custom Nodes (Node Labs)
Users can create custom nodes via the Node Labs interface:
- Define properties, ports, appearance, and execution logic
- Stored as user-specific data in Firestore

### Key Files & Directories

#### Application Routes (`src/app/`)
- **`page.tsx`**: Landing page
- **`(auth)/`**: Authentication routes (login, register)
- **`(app)/`**: Protected application routes
  - `workflows/`: Workflow list and editor
  - `tables/`: Custom database tables
  - `credentials/`: Secure credential storage
  - `node-labs/`: Custom node creation interface
  - `settings/`: User settings

#### Workflow Editor (`src/components/workflow/`)
- **`editor.tsx`**: Main workflow canvas component
  - Uses `useDoc()` hook to load workflow from Firestore
  - Manages node/edge state and React Flow integration
  - Handles context menus, drag-drop, node insertion
  - Parent-child relationships for group stickers handled in `onNodeDragStop`
- **`react-flow-node.tsx`**: Custom node renderer
- **`custom-edge.tsx`**: Custom edge renderer
- **`node-palette.tsx`**: Drawer for adding new nodes
- **`node-settings.tsx`**: Side panel for configuring node properties
- **`group-sticker.tsx`**: Resizable group container component

#### Firebase Integration (`src/firebase/`)
- **`provider.tsx`**: Firebase context provider
- **`firestore/use-doc.tsx`**: Hook for real-time Firestore document listening
- **`firestore/use-collection.tsx`**: Hook for real-time collection listening
- **`config.ts`**: Firebase config initialization

#### AI Integration (`src/ai/`)
- **`genkit.ts`**: Genkit AI instance configuration
- **`flows/generate-node-description.ts`**: AI flow for generating node descriptions
- **`dev.ts`**: Genkit dev server entry point

#### Type Definitions (`src/lib/types.ts`)
Central type definitions for:
- `Workflow`, `NodeData`, `Connection`
- `NodeDefinition`, `NodeProperty`, `NodePort`
- `NodeCategory`, `NodeShape`

## Important Implementation Details

### Next.js Configuration
- **TypeScript & ESLint errors ignored during builds** (`next.config.ts`)
  - This is intentional for rapid prototyping
- **Image domains whitelisted**: placehold.co, unsplash.com, picsum.photos

### Firestore Structure
All data is scoped under `/users/{userId}/`:
```
/users/{userId}
  /workflows/{workflowId}
  /credentials/{credentialId}
  /tables/{tableId}
  /notifications/{notificationId}
```

### React Flow Integration
- Custom node types: `custom` (regular nodes) and `groupSticker`
- Custom edge type with double-click to insert nodes
- Nodes can be parented to group stickers via drag-and-drop
- Context menu (right-click/double-click) for edit, duplicate, delete
- Zoom controls and viewport persistence

### State Management
- Workflow editor uses local React state with Firestore sync via `useDoc()`
- No global state management library (Redux, Zustand, etc.)
- Real-time updates from Firestore automatically reflected in UI

## Common Development Patterns

### Reading Node Definitions
```typescript
import { getNodeDefinition } from '@/lib/nodes';
const nodeDef = getNodeDefinition('webhook');
```

### Firestore Operations
```typescript
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';

const { user } = useUser();
const firestore = useFirestore();
const workflowRef = doc(firestore, 'users', user.uid, 'workflows', workflowId);
const { data, isLoading, error } = useDoc<Workflow>(workflowRef);
```

### Adding New Node Types
1. Create JSON definition in `src/nodes/` following existing patterns
2. Include: `id`, `name`, `description`, `category`, `properties`, `inputs`, `outputs`, `executionCode`
3. Node will automatically appear in Node Palette

### Node Debug Logging Best Practices
All nodes should include `helpers.log()`, `helpers.warn()`, and `helpers.error()` calls in their `executionCode` to provide debug information. These logs are captured and displayed in the Debug tab of the node settings panel during workflow execution.

**Required logging points:**
- Log at the start of execution to indicate what the node is doing
- Log input values (especially from node properties)
- Log key decisions or conditions being evaluated
- Log the outcome/result before returning
- Use `helpers.warn()` for non-critical issues
- Use `helpers.error()` for errors or failures

**Example:**
```javascript
helpers.log('Evaluating IF condition');
const left = node.properties.leftValue.value;
helpers.log(`Left value: ${JSON.stringify(left)}`);
// ... evaluation logic ...
helpers.log(`Condition evaluated to: ${condition}`);
return { ...data, condition, path };
```

**Benefits:**
- Users can see exactly what happened during node execution
- Helps debug issues with data flow and transformations
- Makes it easier to understand conditional logic decisions
- Provides visibility into API calls and external operations

### Debug Tab UI (`src/components/workflow/node-settings.tsx`)

The Node Settings panel has a **Debug tab** that displays execution logs:

**Location:** Lines 942-1069 in `node-settings.tsx`

**Features:**
- **Node selector dropdown**: Choose which executed node to inspect
- **Log count badge**: Shows number of logs per node
- **Terminal-style console**: Black background with colored log types
  - `[LOG]` - Gray (general info)
  - `[INFO]` - Blue (important info)
  - `[WARN]` - Yellow (warnings)
  - `[ERROR]` - Red (errors)
- **Timestamps**: Precise timing with milliseconds (HH:MM:SS.mmm)
- **Auto-scroll**: Latest logs visible immediately

**Log Structure (`LogEntry` in `workflow-engine.ts`):**
```typescript
interface LogEntry {
  timestamp: Date;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  args?: any[];
}
```

**How Logs Flow:**
1. Node calls `helpers.log()` during execution
2. `workflow-engine.ts` captures logs in `context[nodeId].logs[]`
3. Engine passes logs via `onNodeEnd(nodeId, input, output, duration, logs)`
4. Editor stores logs in `executionData[nodeId].logs`
5. UI reads from `executionData` and displays in Debug tab

## Documentation
Comprehensive documentation exists in `docs/`:
- `what-is-nodify.md`: Platform overview
- `how-it-works.md`: Architecture explanation (in Spanish)
- `workflows.md`: Workflow concepts
- `credentials.md`: Credential management
- `tables.md`: Custom tables
- `nodes-documentation.md`: Node type reference
- `backend.json`: Backend API structure reference

## Testing & Debugging

### Console Logging Pattern
When debugging workflow execution or node behavior, add console logs with a recognizable prefix:
```javascript
console.log('[WorkflowEditor] Processing node:', nodeId);
```

### Common Issues
- If nodes aren't rendering, check that the node type exists in `src/nodes/`
- If Firestore operations fail, verify user authentication state
- If AI features don't work, ensure `GEMINI_API_KEY` is set in `.env`
- TypeScript errors during builds are intentionally ignored (see next.config.ts)
