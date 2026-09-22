# Gemini Project Context: Nodify

## Project Overview

Nodify is a visual workflow automation tool, similar in concept to n8n or Zapier. It allows users to create, connect, and automate tasks using a node-based graphical interface. The project is built on a modern web stack, leveraging AI for enhanced capabilities.

**Core Technologies:**

*   **Frontend:** Next.js, React, TypeScript
*   **Backend & Database:** Firebase (Authentication, Firestore)
*   **Workflow Canvas:** React Flow
*   **Styling:** Tailwind CSS, ShadCN/UI
*   **AI Integration:** Genkit (likely for features like AI-powered node suggestions or data transformation)
*   **Code Editor:** Monaco Editor (for custom code nodes)

**Architecture:**

The application consists of a Next.js frontend that provides the user interface for building workflows. The core logic is handled by a `WorkflowEngine` class (`src/lib/workflow-engine.ts`) that executes the workflows. Each node in a workflow is defined by a JSON file (`src/nodes/*.json`) which specifies its properties, inputs, outputs, and the `executionCode` (a JavaScript snippet) that runs when the node is executed.

Workflows, user data, and execution logs are stored in Firestore, with data access rules ensuring user privacy. The application also integrates Firebase Authentication for user management.

## Building and Running

**1. Installation:**

```bash
npm install
```

**2. Running the Development Server:**

To run the app in development mode with hot-reloading:

```bash
npm run dev
```

The application will be available at `http://localhost:9003`.

**3. Building for Production:**

To create a production-ready build:

```bash
npm run build
```

**4. Starting the Production Server:**

To run the built application:

```bash
npm run start
```

**5. Linting and Type-Checking:**

To check for code quality and type errors:

```bash
npm run lint
npm run typecheck
```

## Development Conventions

*   **Language:** The project is written in TypeScript.
*   **Directory Structure:**
    *   `src/app`: Main application routes and pages.
    *   `src/components`: Reusable React components.
    *   `src/lib`: Core application logic, including the `WorkflowEngine`.
    *   `src/nodes`: JSON definitions for all available nodes.
    *   `src/docs`: Project documentation.
    *   `src/firebase`: Firebase configuration and utility functions.
*   **Node Definitions:** New nodes can be added by creating a new JSON file in the `src/nodes` directory. These definitions control the node's appearance, properties, and execution logic.
*   **Styling:** The project uses Tailwind CSS with `shadcn/ui` components. Follow the existing conventions for styling.
*   **Error Handling:** The `next.config.ts` file is currently configured to ignore TypeScript and ESLint errors during builds. It is recommended to fix these errors rather than ignoring them.
