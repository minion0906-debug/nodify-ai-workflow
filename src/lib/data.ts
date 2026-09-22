import type { Workflow } from "./types";
import { getNodeDefinition } from "./nodes";

const initializeNodeData = (type: string) => {
  const definition = getNodeDefinition(type as any);
  if (!definition) return { config: {}, description: '' };
  
  const config = (definition.properties || []).reduce((acc, prop) => {
    if (prop.default !== undefined) {
      acc[prop.name] = prop.default;
    }
    return acc;
  }, {} as Record<string, any>);

  return { config, description: definition.description };
}

export const workflows: Workflow[] = [
  {
    id: "wf-1",
    name: "User Onboarding Email",
    description: "Sends a welcome email to new users after they sign up.",
    status: "active",
    lastRun: "2 hours ago",
    nodes: [
      {
        id: "node-1-1",
        type: "webhook",
        position: { x: 50, y: 150 },
        ...initializeNodeData("webhook"),
        isError: false,
        isCompleted: false,
        isExecuting: false
      },
      {
        id: "node-1-2",
        type: "delayWait",
        position: { x: 350, y: 150 },
        ...initializeNodeData("delayWait"),
        isError: false,
        isCompleted: false,
        isExecuting: false
      },
      {
        id: "node-1-3",
        type: "httpRequest",
        position: { x: 650, y: 150 },
        ...initializeNodeData("httpRequest"),
        isError: false,
        isCompleted: false,
        isExecuting: false
      },
    ],
    connections: [
        { id: 'conn-1-1', sourceNodeId: 'node-1-1', sourceHandle: 'main', targetNodeId: 'node-1-2', targetHandle: 'main' },
        { id: 'conn-1-2', sourceNodeId: 'node-1-2', sourceHandle: 'main', targetNodeId: 'node-1-3', targetHandle: 'main' },
    ]
  },
  {
    id: "wf-2",
    name: "Daily Sales Report",
    description: "Generates and emails a sales report every morning at 9 AM.",
    status: "active",
    lastRun: "1 day ago",
    nodes: [
        {
          id: 'node-2-1',
          type: 'cron',
          position: { x: 50, y: 200 },
          ...initializeNodeData('cron'),
          isError: false,
          isCompleted: false,
          isExecuting: false
        },
        {
          id: 'node-2-2',
          type: 'dataStore',
          position: { x: 350, y: 200 },
          ...initializeNodeData('dataStore'),
          isError: false,
          isCompleted: false,
          isExecuting: false
        },
        {
          id: 'node-2-3',
          type: 'code',
          position: { x: 650, y: 200 },
          ...initializeNodeData('code'),
          isError: false,
          isCompleted: false,
          isExecuting: false
        }
    ],
    connections: [
        { id: 'conn-2-1', sourceNodeId: 'node-2-1', sourceHandle: 'main', targetNodeId: 'node-2-2', targetHandle: 'main' },
        { id: 'conn-2-2', sourceNodeId: 'node-2-2', sourceHandle: 'main', targetNodeId: 'node-2-3', targetHandle: 'main' },
    ]
  },
  {
    id: "wf-3",
    name: "Customer Support Ticket Routing",
    description: "Routes incoming support tickets based on their category.",
    status: "inactive",
    lastRun: "3 weeks ago",
    nodes: [],
    connections: [],
  },
  {
    id: "wf-4",
    name: "Social Media Post Scheduler",
    description: "A draft workflow to schedule social media posts.",
    status: "draft",
    nodes: [],
    connections: [],
  },
];

export const getWorkflowById = (id: string): Workflow | undefined => {
  return workflows.find((wf) => wf.id === id);
};
    
