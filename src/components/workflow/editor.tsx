

'use client';

import React, { useState, useCallback, useMemo, MouseEvent as ReactMouseEvent, useEffect, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  NodeDragHandler,
  useOnViewportChange,
  Viewport,
  XYPosition,
  SelectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';

import type { Workflow, NodeData, Connection as WorkflowConnection } from '@/lib/types';
import { NodeSettings } from './node-settings';
import { NodePalette } from './node-palette';
import { Button } from '@/components/ui/button';
import { Play, Plus, Minus, Undo, Redo, Share2, Download, Upload, ArrowLeft, GitBranchPlus, Trash2, Copy, Edit, Maximize2, LoaderCircle, Save, FileDown, FileSymlink, MousePointerSquareDashed, Ellipsis, BarChartHorizontal, Database, CopyPlus, CircleChevronUp, Menu, X, MousePointerClick, Clock, StopCircle, RotateCcw, MessageCircle, Terminal, CircleDot, Clipboard } from 'lucide-react';
import { getNodeDefinition, getNodeIcon } from '@/lib/nodes';
import { useToast } from '@/hooks/use-toast';
import CustomNode from './react-flow-node';
import Link from 'next/link';
import CustomEdge from './custom-edge';
import { Input } from '../ui/input';
import { CustomNode as CustomNodeDef } from '@/lib/custom-nodes-types';
import GroupSticker from './group-sticker';
import { useDoc, useFirestore, useUser, useCollection, errorEmitter, FirestorePermissionError } from "@/firebase";
import { doc, updateDoc, collection, addDoc, serverTimestamp, getDoc, setDoc, deleteDoc, query, orderBy, limit, onSnapshot, Unsubscribe } from "firebase/firestore";
import { notFound, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar"
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { WorkflowEngine } from '@/lib/workflow-engine';
import { SaveAsDialog } from './save-as-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { executeClientNode } from '@/lib/client-node-executor';
import { NodeHooksExecutor } from '@/lib/node-hooks-executor';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DataTablesModal } from './data-tables-modal';
import { ChatModal } from './chat-modal';
import { WorkflowLogsModal } from './workflow-logs-modal';

type WorkflowFragment = {
    nodes: Omit<Node<NodeData>, 'positionAbsolute' | 'width' | 'height'>[];
    edges: Omit<Edge, 'selected'>[];
};

type ContextMenu = {
  id: string | null;
  top: number;
  left: number;
  type: 'node' | 'edge' | 'pane';
};

type Folder = {
  id: string;
  name: string;
};

type ExecutionData = {
    [nodeId: string]: {
      input: any;
      output: any;
      files?: any;
      logs?: any[];
    };
  };

type ExecutionContextByName = {
  [nodeName: string]: {
    input: any;
    output: any;
  };
};

type EdgeExecutionData = {
    [edgeId: string]: {
        executionTime?: number;
        itemCount?: number;
    }
}

const getFolderNameFromId = (id: string | null) => {
    if (!id) return '';
    const parts = id.split('-');
    if (parts.length > 2) {
      const namePart = parts.slice(2).join(' ').replace(/-/g, ' ');
      return namePart;
    }
    return id;
}

function EditorCanvas({ workflow: workflowProp, folders: initialFolders }: { workflow: Workflow; folders: Folder[]; }) {
  const { screenToFlowPosition, getNode, getEdge, zoomIn, zoomOut, getViewport, setNodes, setEdges, getNodes, getEdges, project, fitView, setViewport } = useReactFlow();
  const [nodes, setNodesInternal] = useState<Node<NodeData>[]>([]);
  const [edges, setEdgesInternal] = useState<Edge[]>([]);
  const [workflow, setWorkflow] = useState(workflowProp);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [lastMousePosition, setLastMousePosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [workflowName, setWorkflowName] = useState(workflow.name);
  const router = useRouter();
  const isMobile = useIsMobile();
  const baseZoom = isMobile ? 0.7 : 0.9;
  const savedViewport = useMemo(() => {
    const vp = (workflow as any)?.metadata?.viewport as Partial<Viewport> | undefined;
    if (vp && typeof vp.x === 'number' && typeof vp.y === 'number' && typeof vp.zoom === 'number') {
      return { x: vp.x, y: vp.y, zoom: vp.zoom } as Viewport;
    }
    return undefined;
  }, [workflow]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [undoStack, setUndoStack] = useState<Array<{ nodes: Node<NodeData>[]; edges: Edge[] }>>([]);
  const [redoStack, setRedoStack] = useState<Array<{ nodes: Node<NodeData>[]; edges: Edge[] }>>([]);


  const [executingNodes, setExecutingNodes] = useState<Set<string>>(new Set());
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set());
  const [errorNodes, setErrorNodes] = useState<Set<string>>(new Set());
  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);
  const [executionData, setExecutionData] = useState<ExecutionData>({});
  const [executionContext, setExecutionContext] = useState<ExecutionContextByName>({});
  const [edgeExecutionData, setEdgeExecutionData] = useState<EdgeExecutionData>({});
  const [showEdgeMetrics, setShowEdgeMetrics] = useState(false);
  const [showPortLabels, setShowPortLabels] = useState(true);
  const [isSelectionModeActive, setSelectionModeActive] = useState(false);
  const [isEditModeOpen, setEditModeOpen] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const lastEventIdRef = useRef<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);


  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const workflowsQuery = useMemo(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'workflows');
  }, [user, firestore]);
  const { data: allWorkflows } = useCollection<Workflow>(workflowsQuery);
  
  const folders = useMemo(() => {
    if (!allWorkflows) return [];
    
    const folderIds = new Set<string>();
    allWorkflows.forEach(wf => {
      if (wf.folderId) {
        folderIds.add(wf.folderId);
      }
    });
    return Array.from(folderIds).map(id => ({ id, name: getFolderNameFromId(id) }));
  }, [allWorkflows]);


  const currentFolder = useMemo(() => {
    if (workflow.folderId && folders) {
      return folders.find(f => f.id === workflow.folderId);
    }
    return null;
  }, [workflow.folderId, folders]);
  
  useOnViewportChange({
    onStart: (viewport: Viewport) => {
        if (viewport) setZoomLevel(viewport.zoom);
    },
    onEnd: (viewport: Viewport) => {
      if (viewport) {
        setZoomLevel(viewport.zoom);
      }
    },
  });

  const handleZoomIn = () => {
    zoomIn({duration: 200});
  };
  
  const handleZoomOut = () => {
    zoomOut({duration: 200});
  };
  
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSecondNavbarOpen, setIsSecondNavbarOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [edgeForNodeInsertion, setEdgeForNodeInsertion] = useState<Edge | null>(null);
  const [sourceForNodeCreation, setSourceForNodeCreation] = useState<{sourceNodeId: string, sourceHandleId: string} | null>(null);
  const [nodeCreationPosition, setNodeCreationPosition] = useState<XYPosition | null>(null);
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);

  // Simple auto-organize: layer nodes left->right by BFS from triggers, with vertical spacing
  const organizeNodes = useCallback(() => {
    try {
      const rfNodes = getNodes();
      const rfEdges = getEdges();

      // Build maps
      const nodesById = new Map(rfNodes.map(n => [n.id, n] as const));
      const incoming = new Map<string, number>();
      const outgoing = new Map<string, string[]>();
      rfNodes.forEach(n => { incoming.set(n.id, 0); outgoing.set(n.id, []); });
      rfEdges.forEach(e => {
        if (!incoming.has(e.target)) incoming.set(e.target, 0);
        incoming.set(e.target, (incoming.get(e.target) || 0) + 1);
        const arr = outgoing.get(e.source) || [];
        arr.push(e.target);
        outgoing.set(e.source, arr);
      });

      // Identify triggers or sources as starting points
      const isTrigger = (id: string) => {
        const n = nodesById.get(id);
        if (!n) return false;
        const def = getNodeDefinition(n.data.type);
        return def?.category === 'trigger';
      };

      const queue: string[] = [];
      const layer = new Map<string, number>();

      rfNodes.forEach(n => {
        const indeg = incoming.get(n.id) || 0;
        if (isTrigger(n.id) || indeg === 0) {
          queue.push(n.id);
          layer.set(n.id, 0);
        }
      });

      // BFS layering
      while (queue.length) {
        const u = queue.shift()!;
        const lu = layer.get(u) || 0;
        const outs = outgoing.get(u) || [];
        outs.forEach(v => {
          if (!layer.has(v)) {
            layer.set(v, lu + 1);
            queue.push(v);
          }
        });
      }

      // Group nodes by layer
      const layers = new Map<number, string[]>();
      rfNodes.forEach(n => {
        const l = layer.has(n.id) ? (layer.get(n.id) as number) : 0;
        const arr = layers.get(l) || [];
        arr.push(n.id);
        layers.set(l, arr);
      });

      // Compute positions
      const baseX = 100; const baseY = 100; const hGap = 320; const vGap = 140;
      const newPos = new Map<string, { x: number; y: number }>();
      const sortedLayers = Array.from(layers.keys()).sort((a,b)=>a-b);
      sortedLayers.forEach((lIdx) => {
        const ids = layers.get(lIdx) || [];
        // Keep roughly the previous vertical order
        ids.sort((a,b) => (nodesById.get(a)?.position.y || 0) - (nodesById.get(b)?.position.y || 0));
        ids.forEach((id, i) => {
          const n = nodesById.get(id);
          if (!n) return;
          // Skip group stickers (do not reposition)
          if (n.type === 'groupSticker') return;
          // Keep children inside parents untouched
          if (n.parentId) return;
          newPos.set(id, { x: baseX + lIdx * hGap, y: baseY + i * vGap });
        });
      });

      setNodes(prev => prev.map(n => newPos.has(n.id) ? { ...n, position: newPos.get(n.id)! } : n));
      // Optionally fit view after arrange
      setTimeout(() => { try { fitView({ padding: 0.2, duration: 300 }); } catch {} }, 50);
    } catch (e) {
      console.error('[Editor] organizeNodes failed:', e);
    }
  }, [getNodes, getEdges, setNodes, fitView]);
  
  const handleSave = useCallback(async (nodesToSave: Node<NodeData>[], edgesToSave: Edge[]) => {
    if (!user || !workflow) return;

    const workflowDocRef = doc(firestore, 'users', user.uid, 'workflows', workflow.id);
    // Safety: avoid saving empty arrays due to async state races
    const effectiveNodes = (nodesToSave && nodesToSave.length > 0) ? nodesToSave : getNodes();
    const effectiveEdges = (edgesToSave && edgesToSave.length > 0) ? edgesToSave : getEdges();

    const nodesForDb = effectiveNodes.map(n => ({
      id: n.id,
      type: n.data.type,
      label: n.data.label,
      position: n.position,
      config: n.data.config,
      description: n.data.description,
      parentId: n.parentId || null,
    }));

    const connectionsForDb = effectiveEdges.map(e => ({
      id: e.id,
      sourceNodeId: e.source,
      sourceHandle: e.sourceHandle,
      targetNodeId: e.target,
      targetHandle: e.targetHandle,
    }));

    const webhookNode = nodesToSave.find(n => n.data.type === 'webhook_trigger');
    const webhookId = webhookNode ? webhookNode.data.config.webhookId : null;

    try {
      const { x, y, zoom } = getViewport();
      await updateDoc(workflowDocRef, {
        name: workflowName,
        nodes: nodesForDb,
        connections: connectionsForDb,
        // persist current camera/zoom as metadata
        'metadata.viewport': { x, y, zoom },
      });

      // ========== FIREBASE WEBHOOK REGISTRATION (COMMENTED FOR FUTURE USE) ==========
      // If you want to migrate back to Firebase, uncomment this section
      /*
      // Register/update webhook in public webhooks collection if there's a webhook trigger
      if (webhookId && webhookNode) {
        const webhookMappingRef = doc(firestore, 'webhook_mappings', webhookId);

        try {
          await setDoc(webhookMappingRef, {
            userId: user.uid,
            workflowId: workflow.id,
            nodeId: webhookNode.id,
            updatedAt: serverTimestamp(),
          });
          console.log(`[WorkflowEditor] Webhook mapping registered: ${webhookId} -> ${workflow.id}`);
        } catch (webhookError) {
          console.error('[WorkflowEditor] Failed to register webhook mapping:', webhookError);
        }
      }

      // Clean up old webhook mappings if a webhook node was removed
      const oldWebhookNodes = workflow.nodes.filter((n: any) => n.type === 'webhook_trigger');
      const newWebhookNodeIds = new Set(nodesToSave.filter(n => n.data.type === 'webhook_trigger').map(n => n.id));

      for (const oldNode of oldWebhookNodes) {
        if (!newWebhookNodeIds.has(oldNode.id) && oldNode.config.webhookId) {
          const oldWebhookMappingRef = doc(firestore, 'webhook_mappings', oldNode.config.webhookId);
          try {
            await deleteDoc(oldWebhookMappingRef);
            console.log(`[WorkflowEditor] Webhook mapping unregistered: ${oldNode.config.webhookId}`);
          } catch (webhookError) {
            console.error('[WorkflowEditor] Failed to unregister webhook mapping:', webhookError);
          }
        }
      }
      */
      // ========== END FIREBASE WEBHOOK REGISTRATION ==========

      // ========== SQLITE WEBHOOK REGISTRATION (ACTIVE) ==========
      // Register/update webhook in SQLite if there's a webhook trigger
      if (webhookId && webhookNode) {
        try {
          const httpMethod = webhookNode.data.config.method || 'POST';

          // Call API route to register webhook in SQLite
          const response = await fetch('/api/webhooks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              webhookId,
              userId: user.uid,
              workflowId: workflow.id,
              method: httpMethod,
              status: workflow.status || 'draft',
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to register webhook');
          }

          console.log(`[WorkflowEditor] Webhook registered in SQLite: ${webhookId} -> ${workflow.id} (${httpMethod})`);
        } catch (webhookError) {
          console.error('[WorkflowEditor] Failed to register webhook in SQLite:', webhookError);
        }
      }

      // Clean up old webhook mappings if a webhook node was removed
      // Get all old webhookIds
      const oldWebhookIds = new Set(
        workflow.nodes
          .filter((n: any) => n.type === 'webhook_trigger' && n.config?.webhookId)
          .map((n: any) => n.config.webhookId)
      );

      // Get all new webhookIds
      const newWebhookIds = new Set(
        nodesToSave
          .filter(n => n.data.type === 'webhook_trigger' && n.data.config?.webhookId)
          .map(n => n.data.config.webhookId)
      );

      // Delete webhooks that were removed (exist in old but not in new)
      for (const oldWebhookId of oldWebhookIds) {
        if (!newWebhookIds.has(oldWebhookId)) {
          try {
            // Call API route to delete webhook from SQLite
            const response = await fetch(`/api/webhooks?webhookId=${oldWebhookId}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              throw new Error('Failed to unregister webhook');
            }

            console.log(`[WorkflowEditor] Webhook unregistered from SQLite: ${oldWebhookId}`);
          } catch (webhookError) {
            console.error('[WorkflowEditor] Failed to unregister webhook from SQLite:', webhookError);
          }
        }
      }
      // ========== END SQLITE WEBHOOK REGISTRATION ==========

      // ========== SQLITE WHATSAPP REGISTRATION ==========
      const newWaNodes = nodesToSave.filter(n => n.data.type === 'whatsapp_trigger' && n.data.config?.whatsappId);
      for (const waNode of newWaNodes) {
        try {
          const whatsappId = waNode.data.config.whatsappId;
          const verifyToken = waNode.data.config.verifyToken || undefined;
          const appSecret = waNode.data.config.appSecret || undefined;
          const credentialId = waNode.data.config.credential || undefined;
          const response = await fetch('/api/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              whatsappId,
              userId: user.uid,
              workflowId: workflow.id,
              status: workflow.status || 'draft',
              verifyToken,
              appSecret,
              credentialId,
            }),
          });
          if (!response.ok) throw new Error('Failed to register WhatsApp');
          console.log(`[WorkflowEditor] WhatsApp registered in SQLite: ${whatsappId} -> ${workflow.id}`);
        } catch (err) {
          console.error('[WorkflowEditor] Failed to register WhatsApp in SQLite:', err);
        }
      }

      const oldWaIds = new Set(
        workflow.nodes
          .filter((n: any) => n.type === 'whatsapp_trigger' && n.config?.whatsappId)
          .map((n: any) => n.config.whatsappId)
      );
      const newWaIds = new Set(
        nodesToSave
          .filter(n => n.data.type === 'whatsapp_trigger' && n.data.config?.whatsappId)
          .map(n => n.data.config.whatsappId)
      );
      for (const oldWaId of oldWaIds) {
        if (!newWaIds.has(oldWaId)) {
          try {
            const res = await fetch(`/api/whatsapp?whatsappId=${oldWaId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to unregister WhatsApp');
            console.log(`[WorkflowEditor] WhatsApp unregistered from SQLite: ${oldWaId}`);
          } catch (err) {
            console.error('[WorkflowEditor] Failed to unregister WhatsApp from SQLite:', err);
          }
        }
      }
      // ========== END SQLITE WHATSAPP REGISTRATION ==========

      // ========== SQLITE FORM REGISTRATION (ACTIVE) ==========
      const formNode = nodesToSave.find(n => n.data.type === 'form_submit_trigger');
      const formId = formNode ? formNode.data.config.formId : null;

      if (formId && formNode) {
        try {
          const response = await fetch('/api/forms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              formId,
              userId: user.uid,
              workflowId: workflow.id,
              status: workflow.status || 'draft',
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to register form');
          }

          console.log(`[WorkflowEditor] Form registered in SQLite: ${formId} -> ${workflow.id}`);
        } catch (formError) {
          console.error('[WorkflowEditor] Failed to register form in SQLite:', formError);
        }
      }

      const oldFormIds = new Set(
        workflow.nodes
          .filter((n: any) => n.type === 'form_submit_trigger' && n.config?.formId)
          .map((n: any) => n.config.formId)
      );

      const newFormIds = new Set(
        nodesToSave
          .filter(n => n.data.type === 'form_submit_trigger' && n.data.config?.formId)
          .map(n => n.data.config.formId)
      );

      for (const oldFormId of oldFormIds) {
        if (!newFormIds.has(oldFormId)) {
          try {
            const response = await fetch(`/api/forms?formId=${oldFormId}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              throw new Error('Failed to unregister form');
            }

            console.log(`[WorkflowEditor] Form unregistered from SQLite: ${oldFormId}`);
          } catch (formError) {
            console.error('[WorkflowEditor] Failed to unregister form from SQLite:', formError);
          }
        }
      }
      // ========== END SQLITE FORM REGISTRATION ==========

      // ========== SQLITE CHAT REGISTRATION (ACTIVE) ==========
      const chatNode = nodesToSave.find(n => n.data.type === 'chat_trigger');
      const chatId = chatNode ? chatNode.data.config.chatId : null;

      if (chatId && chatNode) {
        try {
          const response = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId,
              userId: user.uid,
              workflowId: workflow.id,
              status: workflow.status || 'draft',
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to register chat');
          }

          console.log(`[WorkflowEditor] Chat registered in SQLite: ${chatId} -> ${workflow.id}`);
        } catch (chatError) {
          console.error('[WorkflowEditor] Failed to register chat in SQLite:', chatError);
        }
      }

      const oldChatIds = new Set(
        workflow.nodes
          .filter((n: any) => n.type === 'chat_trigger' && n.config?.chatId)
          .map((n: any) => n.config.chatId)
      );

      const newChatIds = new Set(
        nodesToSave
          .filter(n => n.data.type === 'chat_trigger' && n.data.config?.chatId)
          .map(n => n.data.config.chatId)
      );

      for (const oldChatId of oldChatIds) {
        if (!newChatIds.has(oldChatId)) {
          try {
            const response = await fetch(`/api/chats?chatId=${oldChatId}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              throw new Error('Failed to unregister chat');
            }

            console.log(`[WorkflowEditor] Chat unregistered from SQLite: ${oldChatId}`);
          } catch (chatError) {
            console.error('[WorkflowEditor] Failed to unregister chat from SQLite:', chatError);
          }
        }
      }
      // ========== END SQLITE CHAT REGISTRATION ==========

      toast({ title: 'Workflow Saved', description: 'Your changes have been saved.' });
    } catch (error) {
      console.error("[EditorCanvas] Error saving workflow:", error);
      toast({ title: 'Save Error', description: 'Could not save workflow.', variant: 'destructive' });
    }
  }, [user, workflow, firestore, workflowName, toast]);

  useEffect(() => {
    // Check if any chat_trigger nodes need chatId generation
    let needsUpdate = false;
    const updatedWorkflowNodes = (workflowProp.nodes || []).map(n => {
      if (n.type === 'chat_trigger' && (!n.config?.chatId || n.config.chatId === 'not_generated')) {
        needsUpdate = true;
        const newChatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`[WorkflowEditor] Auto-generating chatId for existing node: ${newChatId}`);
        return {
          ...n,
          config: {
            ...n.config,
            chatId: newChatId
          }
        };
      }
      if (n.type === 'whatsapp_trigger' && (!n.config?.whatsappId || n.config.whatsappId === 'not_generated')) {
        needsUpdate = true;
        const newWaId = `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`[WorkflowEditor] Auto-generating whatsappId for existing node: ${newWaId}`);
        return {
          ...n,
          config: {
            ...n.config,
            whatsappId: newWaId
          }
        };
      }
      return n;
    });

    const initialNodes = updatedWorkflowNodes.map(n => {
        const isGroupSticker = n.type === 'groupSticker';
        return {
            id: n.id,
            position: n.position,
            data: { ...n },
            type: isGroupSticker ? 'groupSticker' : 'custom',
            style: isGroupSticker ? { width: 400, height: 300, ...n.config } : undefined,
            zIndex: isGroupSticker ? 0 : 1,
            draggable: true,
            parentId: n.parentId,
            extent: n.parentId ? 'parent' : undefined,
        };
    });
    const initialEdges = (workflowProp.connections || []).map(c => ({
        id: c.id,
        source: c.sourceNodeId,
        sourceHandle: c.sourceHandle,
        target: c.targetNodeId,
        targetHandle: c.targetHandle,
        type: 'custom',
        data: {},
    }));
    setNodesInternal(initialNodes);
    setEdgesInternal(initialEdges);
    setWorkflowName(workflowProp.name);

    // If we updated any chatIds, save the workflow
    if (needsUpdate && user && firestore) {
      const workflowDocRef = doc(firestore, 'users', user.uid, 'workflows', workflowProp.id);
      const nodesForDb = updatedWorkflowNodes.map(n => ({
        id: n.id,
        type: n.type,
        label: n.label,
        position: n.position,
        config: n.config,
        description: n.description,
        parentId: n.parentId || null,
      }));

      updateDoc(workflowDocRef, {
        nodes: nodesForDb,
      }).then(() => {
        console.log('[WorkflowEditor] Auto-saved workflow with generated chatIds');
      }).catch(err => {
        console.error('[WorkflowEditor] Failed to auto-save chatIds:', err);
      });
    }

    // Apply saved viewport (camera position and zoom) if available
    const vp = (workflowProp as any)?.metadata?.viewport as Partial<Viewport> | undefined;
    if (vp && typeof vp.x === 'number' && typeof vp.y === 'number' && typeof vp.zoom === 'number') {
      try {
        setViewport({ x: vp.x, y: vp.y, zoom: vp.zoom }, { duration: 0 });
        setZoomLevel(vp.zoom);
      } catch (e) {
        console.warn('[EditorCanvas] Failed to set saved viewport:', e);
      }
    }
  }, [workflowProp, user, firestore]);

  // Save state for undo/redo
  const saveState = useCallback(() => {
    setUndoStack(prev => [...prev, { nodes: getNodes(), edges: getEdges() }]);
    setRedoStack([]); // Clear redo stack on new action
  }, [getNodes, getEdges]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    const currentState = { nodes: getNodes(), edges: getEdges() };
    const previousState = undoStack[undoStack.length - 1];
    
    setRedoStack(prev => [...prev, currentState]);
    setUndoStack(prev => prev.slice(0, -1));
    
    setNodesInternal(previousState.nodes);
    setEdgesInternal(previousState.edges);
    
    toast({ title: 'Undo', description: 'Action undone' });
  }, [undoStack, getNodes, getEdges, toast]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    
    const currentState = { nodes: getNodes(), edges: getEdges() };
    const nextState = redoStack[redoStack.length - 1];
    
    setUndoStack(prev => [...prev, currentState]);
    setRedoStack(prev => prev.slice(0, -1));
    
    setNodesInternal(nextState.nodes);
    setEdgesInternal(nextState.edges);
    
    toast({ title: 'Redo', description: 'Action redone' });
  }, [redoStack, getNodes, getEdges, toast]);

  const handleSelectAll = useCallback(() => {
    // Clear any text selection - múltiples métodos para asegurar compatibilidad
    if (window.getSelection) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
    }

    // Método alternativo para navegadores antiguos
    if (document.getSelection && (document.getSelection as any).empty) {
      try {
        (document.getSelection as any).empty();
      } catch (ex) {
        // Ignorar errores
      }
    }

    // Forzar el blur de cualquier elemento activo
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      const activeEl = document.activeElement;
      // Solo blur si no es un input o textarea que el usuario está usando
      if (!activeEl.matches('input, textarea, [contenteditable="true"]')) {
        activeEl.blur();
      }
    }

    // Select all nodes and edges - update internal state directly
    setNodesInternal(nds => {
      const updatedNodes = nds.map(n => ({ ...n, selected: true }));
      // Also update ReactFlow's state
      setNodes(updatedNodes);
      return updatedNodes;
    });

    setEdgesInternal(eds => {
      const updatedEdges = eds.map(e => ({ ...e, selected: true }));
      // Also update ReactFlow's state
      setEdges(updatedEdges);
      return updatedEdges;
    });

    const nodeCount = getNodes().length;
    const edgeCount = getEdges().length;
    toast({ title: 'Select All', description: `${nodeCount} nodes and ${edgeCount} edges selected` });
  }, [setNodes, setEdges, getNodes, getEdges, toast]);
  
  const handleUpdateNode = useCallback((nodeId: string, newConfig: any, newLabel?: string) => {
    // Build the updated nodes array synchronously to avoid saving an empty array due to async state batching
    const currentNodes = getNodes();
    let oldProperties: any = null;
    let updatedNode: Node<NodeData> | null = null;

    const newNodes = currentNodes.map(n => {
      if (n.id === nodeId) {
        oldProperties = n.data.config;
        const updatedData = {
          ...n.data,
          config: newConfig,
          label: newLabel !== undefined ? newLabel : n.data.label
        };
        const nodeToReturn: Node<NodeData> = { ...n, data: updatedData };

        if (n.type === 'groupSticker') {
          const { backgroundColor, width, height } = newConfig;
          const newStyle: React.CSSProperties = { ...n.style };
          if (width) newStyle.width = width;
          if (height) newStyle.height = height;
          if (backgroundColor) newStyle.backgroundColor = backgroundColor;
          nodeToReturn.style = newStyle;
        }

        updatedNode = nodeToReturn;
        return nodeToReturn;
      }
      return n;
    });

    // Update state using the computed array
    setNodesInternal(newNodes);

    // Execute onUpdate hook if it exists
    if (updatedNode) {
      const nodeDefinition = getNodeDefinition(updatedNode.data.type);
      if (nodeDefinition) {
        const nodeForHook = {
          id: updatedNode.id,
          type: updatedNode.data.type,
          label: updatedNode.data.label,
          properties: updatedNode.data.config,
          position: updatedNode.position
        };
        NodeHooksExecutor.onUpdate(nodeDefinition, nodeForHook, oldProperties, newConfig).catch(err => {
          console.error('[Editor] onUpdate hook error:', err);
        });
      }
    }

    // Save using the computed array to avoid race conditions
    handleSave(newNodes, getEdges());
  }, [getEdges, getNodes, handleSave]);

  // Keep a stable nodeTypes object to satisfy React Flow
  // The library warns if nodeTypes/edgeTypes identity changes between renders.
  const handleUpdateNodeRef = useRef(handleUpdateNode);
  useEffect(() => {
    handleUpdateNodeRef.current = handleUpdateNode;
  }, [handleUpdateNode]);

  const GroupStickerWithUpdate = useMemo(() => {
    const Comp = (props: any) => (
      <GroupSticker
        {...props}
        onUpdate={(...args: any[]) => (handleUpdateNodeRef.current as any)(...args)}
      />
    );
    return Comp;
  }, []);

  // Handle test chat messages - execute workflow in frontend with animations
  const handleTestChatMessage = useCallback(async (message: string, files?: File[]): Promise<string> => {
    console.log('[Editor] Handling test chat message:', message);

    // Find the chat trigger node
    const chatTriggerNode = nodes.find(n => n.data.type === 'chat_trigger');
    if (!chatTriggerNode) {
      console.error('[Editor] No chat trigger node found');
      return 'Error: No chat trigger configured';
    }

    try {
      // Clear previous execution state
      setExecutingNodes(new Set());
      setCompletedNodes(new Set());
      setErrorNodes(new Set());
      setExecutionData({});
      setExecutionContext({});
      setActiveEdgeId(null);

      // Create execution ID for tracking
      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCurrentExecutionId(executionId);

      console.log('[Editor] Starting workflow execution:', executionId);

      // Create workflow engine instance with all callbacks for visual feedback
      const engine = new WorkflowEngine(
        {
          ...workflow,
          nodes: getNodes().map(n => ({...n.data, position: n.position, parentId: n.parentId})),
          connections: getEdges().map(e => ({ id: e.id, sourceNodeId: e.source, sourceHandle: e.sourceHandle!, targetNodeId: e.target, targetHandle: e.targetHandle! })),
        },
        { db: firestore, user, doc, getDoc, setDoc, updateDoc, deleteDoc, errorEmitter, FirestorePermissionError },
        {
          onNodeStart: (nodeId) => {
            console.log('[Editor] Node started:', nodeId);
            setExecutingNodes(prev => new Set(prev).add(nodeId));
          },
          onNodeEnd: (nodeId, input, output, duration, logs) => {
            console.log('[Editor] Node ended:', nodeId, 'Output:', output);
            setExecutingNodes(prev => { const next = new Set(prev); next.delete(nodeId); return next; });
            if (output?.error || output?.path === 'error') setErrorNodes(prev => new Set(prev).add(nodeId));
            else setCompletedNodes(prev => new Set(prev).add(nodeId));
            setExecutionData(prev => ({ ...prev, [nodeId]: { input, output, files: output?.files || input?.files || null, logs: logs || [] } }));
          },
          onEdgeTraverse: (edgeId, executionTime, itemCount) => {
            console.log('[Editor] Edge traversed:', edgeId);
            setActiveEdgeId(edgeId);
            setEdgeExecutionData(prev => ({ ...prev, [edgeId]: { executionTime, itemCount } }));
          },
          onWorkflowEnd: () => {
            console.log('[Editor] Workflow execution completed');
            setActiveEdgeId(null);
            setExecutingNodes(new Set());
            // Emit workflow_end event for test runner consistency
            if (executionId) {
              fetch('/api/workflow/execution-events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ executionId, eventType: 'workflow_end' }),
              }).catch(err => console.error('[WorkflowEngine] Failed to emit workflow_end event:', err));
            }
            setCurrentExecutionId(null);
          },
          onExecutionUpdate: (execContext) => setExecutionContext(execContext),
          onClientNodeExecution: async (nodeId, definition, nodeContext, inputData) => {
            const output = await executeClientNode(definition, nodeContext, inputData, {
              alert: (message: string) => window.alert(message),
              toast: (options) => toast(options),
              log: (...args: any[]) => console.log(`[${nodeId}] [LOG]`, ...args),
              error: (...args: any[]) => console.error(`[${nodeId}] [ERROR]`, ...args),
              warn: (...args: any[]) => console.warn(`[${nodeId}] [WARN]`, ...args),
              info: (...args: any[]) => console.info(`[${nodeId}] [INFO]`, ...args),
              executeFromNode: async (targetNodeId: string, subInputData: any = {}) => {
                console.log(`[${nodeId}] Calling executeFromNode with target: ${targetNodeId}`);

                // Create a new sub-engine for isolated execution (avoid context conflicts)
                const subEngine = new WorkflowEngine(
                  {
                    ...workflow,
                    nodes: getNodes().map(n => ({...n.data, position: n.position, parentId: n.parentId})),
                    connections: getEdges().map(e => ({ id: e.id, sourceNodeId: e.source, sourceHandle: e.sourceHandle!, targetNodeId: e.target, targetHandle: e.targetHandle! })),
                  },
                  { db: firestore, user, doc, getDoc, setDoc, updateDoc, deleteDoc, errorEmitter, FirestorePermissionError },
                  {
                    // Pass through the same callbacks for consistent behavior
                    onNodeStart: (subNodeId) => {
                      console.log(`[${nodeId}] Sub-workflow node started:`, subNodeId);
                      setExecutingNodes(prev => new Set(prev).add(subNodeId));
                    },
                    onNodeEnd: (subNodeId, input, output, duration, logs) => {
                      console.log(`[${nodeId}] Sub-workflow node ended:`, subNodeId);
                      setExecutingNodes(prev => { const next = new Set(prev); next.delete(subNodeId); return next; });
                      if (output?.error || output?.path === 'error') setErrorNodes(prev => new Set(prev).add(subNodeId));
                      else setCompletedNodes(prev => new Set(prev).add(subNodeId));
                      setExecutionData(prev => ({ ...prev, [subNodeId]: { input, output, files: output?.files || input?.files || null, logs: logs || [] } }));
                    },
                    onEdgeTraverse: (edgeId, executionTime, itemCount) => {
                      console.log(`[${nodeId}] Sub-workflow edge traversed:`, edgeId);
                      setActiveEdgeId(edgeId);
                      setEdgeExecutionData(prev => ({ ...prev, [edgeId]: { executionTime, itemCount } }));
                    },
                    onClientNodeExecution: async (subNodeId, definition, nodeContext, inputData) => {
                      // Recursive client node execution support
                      const output = await executeClientNode(definition, nodeContext, inputData, {
                        alert: (message: string) => window.alert(message),
                        toast: (options) => toast(options),
                        log: (...args: any[]) => console.log(`[${subNodeId}] [LOG]`, ...args),
                        error: (...args: any[]) => console.error(`[${subNodeId}] [ERROR]`, ...args),
                        warn: (...args: any[]) => console.warn(`[${subNodeId}] [WARN]`, ...args),
                        info: (...args: any[]) => console.info(`[${subNodeId}] [INFO]`, ...args),
                      });
                      return output;
                    },
                  },
                  null,
                  'manual'
                );

                // Execute the sub-workflow
                const subContext = await subEngine.execute(targetNodeId, subInputData);
                console.log(`[${nodeId}] Sub-workflow completed. Context:`, subContext);

                // Return the output from the target node
                if (subContext[targetNodeId]) {
                  return subContext[targetNodeId].output;
                }
                return subContext;
              },
            });
            return output;
          },
        }
      );

      // Execute workflow starting from chat trigger
      const chatData = {
        message,
        files: files || [],
        sessionId: 'test_session',
        userId: 'test_user',
        timestamp: new Date().toISOString(),
      };

                        const executionContext = await engine.execute(chatTriggerNode.id, chatData);      console.log('[Editor] Execution context:', executionContext);

      // Extract response from the last executed node (excluding the trigger itself)
      const executedNodeIds = Object.keys(executionContext).filter(id => id !== chatTriggerNode.id);
      console.log('[Editor] Executed nodes (excluding trigger):', executedNodeIds);

      let result: any = null;
      if (executedNodeIds.length > 0) {
        // Get the output of the last node
        const lastNodeId = executedNodeIds[executedNodeIds.length - 1];
        result = executionContext[lastNodeId]?.output;
        console.log('[Editor] Last node output:', result);
      } else {
        // No nodes after chat trigger, use chat trigger output
        result = executionContext[chatTriggerNode.id]?.output;
        console.log('[Editor] Using trigger output:', result);
      }

      // Extract response content from result
      let responseContent = 'No response generated';

      if (!result) {
        console.warn('[Editor] No output from workflow execution');
        responseContent = 'Workflow executed but no output was generated';
      } else {
        // Try to get response from common output fields
        if (result?.message) {
          responseContent = result.message;
        } else if (result?.response) {
          responseContent = result.response;
        } else if (result?.text) {
          responseContent = result.text;
        } else if (result?.data?.message) {
          responseContent = result.data.message;
        } else if (result?.data?.response) {
          responseContent = result.data.response;
        } else if (result?.data?.text) {
          responseContent = result.data.text;
        } else if (typeof result === 'string') {
          responseContent = result;
        } else {
          // If result is an object, stringify it
          responseContent = JSON.stringify(result, null, 2);
        }
      }

      console.log('[Editor] Response content:', responseContent);
      return responseContent;

    } catch (error) {
      console.error('[Editor] Error executing workflow from chat:', error);
      setCurrentExecutionId(null);
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }, [nodes, workflow, getNodes, getEdges, firestore, user, toast]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodesInternal((nds) => {
        const nextNodes = applyNodeChanges(changes, nds);

        const selectionChange = changes.find(c => c.type === 'select');
        if (selectionChange && selectionChange.type === 'select') {
          if (selectionChange.selected) {
            setSelectedNodeId(selectionChange.id);
            setContextMenu(null);
          } else if (selectedNodeId === selectionChange.id) {
            setSelectedNodeId(null);
            setIsSettingsOpen(false);
          }
        }
  
        const selectedChange = changes.find(c => c.type === 'select' && c.selected);
        if (selectedChange) {
          return nextNodes.map(n => {
            const isGroupSticker = n.type === 'groupSticker';
            if (isGroupSticker) return { ...n, zIndex: 0 };
            if (n.id === selectedChange.id) {
              return { ...n, zIndex: 1000 };
            }
            return { ...n, zIndex: 1 };
          });
        }
        
        return nextNodes;
      }),
    [selectedNodeId]
  );

  // onEdgesChange defined after ensureLoopBackEdge to avoid TDZ issues

  // Ensure Loop branch tail always connects back to Loop's 'continue' input
  const ensureLoopBackEdge = useCallback((edgesList: Edge[]): Edge[] => {
    try {
      const rfNodes = getNodes();
      const rfEdges = edgesList;

      const nodesById = new Map(rfNodes.map(n => [n.id, n] as const));
      const outgoing = new Map<string, Edge[]>();
      rfEdges.forEach(e => {
        const arr = outgoing.get(e.source) || [];
        arr.push(e);
        outgoing.set(e.source, arr);
      });

      let updated = rfEdges.slice();
      let changed = false;

      const isLoopNode = (n: any) => {
        const def = getNodeDefinition(n?.data?.type || '');
        return def?.id === 'loop_node';
      };

      const loopNodes = rfNodes.filter(isLoopNode);
      for (const loopNode of loopNodes) {
        const loopId = loopNode.id;
        const loopOut = (outgoing.get(loopId) || []).filter(e => e.sourceHandle === 'loop');
        if (loopOut.length === 0) continue; // nothing to do

        // Traverse from all loopOut targets and find the deepest leaf that does not point back to loop
        const visited = new Set<string>();
        const dist = new Map<string, number>();
        const queue: string[] = [];
        // start points
        for (const e of loopOut) {
          if (!visited.has(e.target)) {
            visited.add(e.target);
            dist.set(e.target, 1);
            queue.push(e.target);
          }
        }

        const isBackToLoop = (e: Edge) => e.target === loopId && e.targetHandle === 'continue';

        while (queue.length) {
          const cur = queue.shift()!;
          const curOut = (outgoing.get(cur) || []).filter(e => e.target !== loopId); // don't follow edges back to loop
          for (const e of curOut) {
            if (isBackToLoop(e)) continue; // ignore explicit back-edge in traversal
            if (!visited.has(e.target)) {
              visited.add(e.target);
              dist.set(e.target, (dist.get(cur) || 0) + 1);
              queue.push(e.target);
            }
          }
        }

        // leaves: nodes with no outgoing edges to other nodes (excluding back-edge to loop)
        const leaves: Array<{ id: string; depth: number } > = [];
        visited.forEach(id => {
          const outs = (outgoing.get(id) || []).filter(e => e.target !== loopId);
          if (outs.length === 0) {
            leaves.push({ id, depth: dist.get(id) || 0 });
          }
        });
        if (leaves.length === 0) continue;

        // pick deepest leaf
        leaves.sort((a,b) => b.depth - a.depth);
        const tailId = leaves[0].id;

        // Remove any existing back-edges to loop.continue that are not from tail
        const beforeCount = updated.length;
        updated = updated.filter(e => !(e.target === loopId && e.targetHandle === 'continue' && e.source !== tailId));
        if (updated.length !== beforeCount) changed = true;

        // Ensure back-edge from tail to loop.continue exists
        let exists = false;
        updated = updated.map(e => {
          if (e.source === tailId && e.target === loopId && e.targetHandle === 'continue') {
            exists = true;
            return { ...e, data: { ...(e.data || {}), isLoopBack: true } } as Edge;
          }
          return e;
        });
        if (!exists) {
          // Pick default output handle 'main'
          const tailNode = nodesById.get(tailId);
          const tailDef = getNodeDefinition(tailNode?.data?.type || '');
          const outHandle = tailDef?.outputs?.[0]?.id || 'main';
          const newEdge: Edge = {
            id: `reactflow__edge-${tailId}${outHandle}-${loopId}continue`,
            source: tailId,
            sourceHandle: outHandle,
            target: loopId,
            targetHandle: 'continue',
            type: 'custom',
            data: { isLoopBack: true }
          } as Edge;
          updated = addEdge(newEdge, updated);
          changed = true;
        }
      }

      return changed ? updated : edgesList;
    } catch {
      return edgesList;
    }
  }, [getNodes]);

  // Apply loop back-edge normalization on every edges change
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdgesInternal((eds) => ensureLoopBackEdge(applyEdgeChanges(changes, eds))),
    [ensureLoopBackEdge]
  );

  const onConnect = useCallback(
  (connection: Connection) => {
    saveState();
    const { source, sourceHandle, target, targetHandle } = connection;
    if (!source || !target || !sourceHandle || !targetHandle) return;

    const sourceNode = getNode(source);
    const targetNode = getNode(target);
    if (!sourceNode || !targetNode) return;

    const sourceDef = getNodeDefinition(sourceNode.data.type);
    const targetDef = getNodeDefinition(targetNode.data.type);
    if (!sourceDef || !targetDef) return;

    // Bloquear conexiones inválidas
    if (targetDef.category === 'trigger') {
      toast({
        title: "Invalid Connection",
        description: "Trigger nodes cannot have incoming connections.",
        variant: 'destructive'
      });
      return;
    }

    const sourcePort = sourceDef.outputs?.find(p => p.id === sourceHandle);
    const targetPort = targetDef.inputs?.find(p => p.id === targetHandle);
    if (!sourcePort || !targetPort) return;

    const sourceType = sourcePort.type || 'any';
    const targetType = targetPort.type || 'any';
    if (sourceType !== 'any' && targetType !== 'any' && sourceType !== targetType) {
      toast({
        title: 'Connection Error',
        description: `Cannot connect type '${sourceType}' to type '${targetType}'.`,
        variant: 'destructive'
      });
      return;
    }

    // Enforce optional port-level accepts constraints (by node id/category/group/tags)
    const matchesAccepts = (port: any, otherDef: any) => {
      const accepts = port?.accepts;
      if (!accepts) return true;
      const { nodeIds, categories, groups, tags } = accepts as any;
      if (nodeIds && Array.isArray(nodeIds) && nodeIds.length > 0) {
        if (!nodeIds.includes(otherDef.id)) return false;
      }
      if (categories && Array.isArray(categories) && categories.length > 0) {
        if (!categories.includes(otherDef.category)) return false;
      }
      if (groups && Array.isArray(groups) && groups.length > 0) {
        if (!groups.includes(otherDef.group)) return false;
      }
      if (tags && Array.isArray(tags) && tags.length > 0) {
        const otherTags: string[] = (otherDef.tags || []) as string[];
        if (!otherTags.some(t => tags.includes(t))) return false;
      }
      return true;
    };

    const targetAcceptsOk = matchesAccepts(targetPort, targetDef && sourceDef);
    const sourceAcceptsOk = matchesAccepts(sourcePort, targetDef);
    if (!targetAcceptsOk || !sourceAcceptsOk) {
      const describe = (port: any) => {
        const acc = port?.accepts || {};
        const parts: string[] = [];
        if (acc.nodeIds?.length) parts.push(`types: ${acc.nodeIds.join(', ')}`);
        if (acc.categories?.length) parts.push(`categories: ${acc.categories.join(', ')}`);
        if (acc.groups?.length) parts.push(`groups: ${acc.groups.join(', ')}`);
        if (acc.tags?.length) parts.push(`tags: ${acc.tags.join(', ')}`);
        return parts.join(' | ');
      };
      toast({
        title: 'Incompatible Ports',
        description: `This connection doesn't meet port constraints. Target accepts { ${describe(targetPort)} }${sourcePort?.accepts ? `; Source accepts { ${describe(sourcePort)} }` : ''}.`,
        variant: 'destructive'
      });
      return;
    }

        const edge: Edge = {
            id: `reactflow__edge-${source}${sourceHandle}-${target}${targetHandle}`,
            ...connection,
            type: 'custom',
            data: {},
        };

    // Add the edge and then ensure loop back-edge integrity
    setEdgesInternal(eds => {
      const next = addEdge(edge, eds);
      return ensureLoopBackEdge(next);
    });

    // Execute onConnect hook for both source and target nodes
    const sourceNodeForHook = {
      id: sourceNode.id,
      type: sourceNode.data.type,
      label: sourceNode.data.label,
      properties: sourceNode.data.config,
      position: sourceNode.position
    };
    const targetNodeForHook = {
      id: targetNode.id,
      type: targetNode.data.type,
      label: targetNode.data.label,
      properties: targetNode.data.config,
      position: targetNode.position
    };

    // Execute hook for source node
    NodeHooksExecutor.onConnect(sourceDef, sourceNodeForHook, sourceNodeForHook, targetNodeForHook, connection).catch(err => {
      console.error('[Editor] onConnect hook error (source):', err);
    });

    // Execute hook for target node
    NodeHooksExecutor.onConnect(targetDef, targetNodeForHook, sourceNodeForHook, targetNodeForHook, connection).catch(err => {
      console.error('[Editor] onConnect hook error (target):', err);
    });
  },
  [getNode, toast, setEdgesInternal, saveState]
);

  
  const handleOpenContextMenu = useCallback((event: ReactMouseEvent | TouchEvent, id: string | null, type: 'node' | 'edge' | 'pane') => {
    event.preventDefault();
    event.stopPropagation();
    
    let clientX: number, clientY: number;
    
    if ('touches' in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if ('changedTouches' in event && event.changedTouches.length > 0) {
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    } else {
      const mouseEvent = event as ReactMouseEvent;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }
    
    const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!reactFlowBounds) return;

    const top = clientY - reactFlowBounds.top;
    const left = clientX - reactFlowBounds.left;
    if (type === 'pane') {
      setLastMousePosition({ x: left, y: top });
    }
    setContextMenu({ id, top, left, type });
  }, []);

  const onNodeContextMenu = useCallback((event: ReactMouseEvent, node: Node) => {
    handleOpenContextMenu(event, node.id, 'node');
  }, [handleOpenContextMenu]);
  
  const onEdgeContextMenu = useCallback((event: ReactMouseEvent, edge: Edge) => {
    handleOpenContextMenu(event, edge.id, 'edge');
  }, [handleOpenContextMenu]);

  const onPaneContextMenu = useCallback((event: ReactMouseEvent) => {
    if (event.target === event.currentTarget) {
      handleOpenContextMenu(event, null, 'pane');
    }
  }, [handleOpenContextMenu]);
  
  const onNodeDoubleClick = useCallback((event: ReactMouseEvent, node: Node) => {
    handleOpenContextMenu(event, node.id, 'node');
  }, [handleOpenContextMenu]);

  const onEdgeDoubleClick = useCallback((event: ReactMouseEvent, edge: Edge) => {
    handleOpenContextMenu(event, edge.id, 'edge');
  }, [handleOpenContextMenu]);

  const handleLongPress = useCallback((nodeId: string, event: React.MouseEvent | React.TouchEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setSelectedNodeId(nodeId);
      setIsSettingsOpen(true);
  }, []);

  const handleNodeDoubleClickFromNode = useCallback((event: any, nodeId: string) => {
      handleOpenContextMenu(event, nodeId, 'node');
  }, [handleOpenContextMenu]);

  const handleAddNodeRequest = useCallback(({ sourceNodeId, sourceHandleId }: { sourceNodeId: string, sourceHandleId: string }) => {
    setSourceForNodeCreation({ sourceNodeId, sourceHandleId });
    setIsPaletteOpen(true);
  }, []);

  const addNode = (nodeDefinition: CustomNodeDef, position?: XYPosition) => {
    saveState();
    const newNodeId = `${nodeDefinition.id}-${Date.now()}`;
    const isGroupSticker = nodeDefinition.id === 'groupSticker';

    let nodeType: string;
    if (isGroupSticker) {
      nodeType = 'groupSticker';
    } else {
      nodeType = 'custom';
    }
    
    const nodeConfig = nodeDefinition.properties
      ? (nodeDefinition.properties || []).reduce((acc: any, prop: any) => {
          if (prop.default !== undefined) {
            acc[prop.name] = prop.default;
          }
          return acc;
        }, {})
      : {};

    if (nodeDefinition.id === 'webhook_trigger') {
      nodeConfig.webhookId = `whook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    if (nodeDefinition.id === 'form_submit_trigger') {
      nodeConfig.formId = `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    if (nodeDefinition.id === 'chat_trigger') {
      nodeConfig.chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    if (nodeDefinition.id === 'whatsapp_trigger') {
      nodeConfig.whatsappId = `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    const baseName = nodeDefinition.name;
    const existingNodesOfType = getNodes().filter(n => n.data.type === nodeDefinition.id);
    const existingNumbers = existingNodesOfType.map(n => {
        const match = (n.data.label || '').match(new RegExp(`^${baseName} (\\d+)$`));
        return match ? parseInt(match[1], 10) : 0;
    }).filter(n => n > 0);

    let newNumber = 1;
    if (existingNodesOfType.length > 0 && !existingNodesOfType.some(n => n.data.label === baseName)) {
        // If there are numbered nodes but not a base "My Node"
    } else if (existingNumbers.length > 0) {
        const sortedNumbers = existingNumbers.sort((a, b) => a - b);
        for (let i = 0; i < sortedNumbers.length; i++) {
            if (sortedNumbers[i] !== i + 1) {
                newNumber = i + 1;
                break;
            }
            newNumber = sortedNumbers.length + 1;
        }
    }
    
    const newNodeLabel = newNumber > 0 ? `${baseName} ${newNumber}` : baseName;


    const commonNodeData: Omit<Node<NodeData>, 'id' | 'position'> = {
      data: {
        id: newNodeId,
        type: nodeDefinition.id,
        label: newNodeLabel,
        position: { x: 0, y: 0 },
        description: nodeDefinition.description,
        config: nodeConfig
      },
      type: nodeType,
      style: isGroupSticker ? { width: 400, height: 300 } : undefined,
      zIndex: isGroupSticker ? 0 : 1,
      draggable: true,
    };

    if (edgeForNodeInsertion) {
      const sourceNode = getNode(edgeForNodeInsertion.source);
      const targetNode = getNode(edgeForNodeInsertion.target);

      if (!sourceNode || !targetNode) return;

      const pos = {
        x: (sourceNode.position.x + targetNode.position.x) / 2,
        y: (sourceNode.position.y + targetNode.position.y) / 2,
      };

      const newNode: Node<NodeData> = {
        id: newNodeId,
        position: pos,
        ...commonNodeData,
      };

      setNodesInternal(nds => [...nds, newNode]);
      const newEdges = edges.filter(e => e.id !== edgeForNodeInsertion.id);

      const edge1: Edge = {
        id: `reactflow__edge-${edgeForNodeInsertion.source}${edgeForNodeInsertion.sourceHandle}-${newNodeId}main`,
        source: edgeForNodeInsertion.source,
        sourceHandle: edgeForNodeInsertion.sourceHandle,
        target: newNodeId,
        targetHandle: 'main',
        type: 'custom',
        data: {},
      };
      const edge2: Edge = {
        id: `reactflow__edge-${newNodeId}main-${edgeForNodeInsertion.target}${edgeForNodeInsertion.targetHandle}`,
        source: newNodeId,
        sourceHandle: 'main',
        target: edgeForNodeInsertion.target,
        targetHandle: edgeForNodeInsertion.targetHandle,
        type: 'custom',
        data: {},
      };

      setEdgesInternal([...newEdges, edge1, edge2]);
      setEdgeForNodeInsertion(null);
    } else if (sourceForNodeCreation) {
      const sourceNode = getNode(sourceForNodeCreation.sourceNodeId);
      if (!sourceNode) return;

      const pos = {
        x: sourceNode.position.x + (sourceNode.width || 200) + 150,
        y: sourceNode.position.y,
      };

      const newNode: Node<NodeData> = {
        id: newNodeId,
        position: pos,
        ...commonNodeData,
      };
      setNodesInternal(nds => [...nds, newNode]);

      const newEdge: Edge = {
        id: `reactflow__edge-${sourceForNodeCreation.sourceNodeId}${sourceForNodeCreation.sourceHandleId}-${newNodeId}main`,
        source: sourceForNodeCreation.sourceNodeId,
        sourceHandle: sourceForNodeCreation.sourceHandleId,
        target: newNodeId,
        targetHandle: 'main',
        type: 'custom',
        data: {},
      };
      setEdgesInternal(eds => [...eds, newEdge]);
      setSourceForNodeCreation(null);

    } else {
        const pos = position || nodeCreationPosition || screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
        const newNode: Node<NodeData> = {
            id: newNodeId,
            position: pos,
            ...commonNodeData,
        };
        setNodesInternal(nds => [...nds, newNode]);
        setNodeCreationPosition(null);
    }

    // Execute onCreate hook if it exists
    const newNodeForHook = {
      id: newNodeId,
      type: nodeDefinition.id,
      label: newNodeLabel,
      properties: nodeConfig,
      position: position || nodeCreationPosition || screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 3 })
    };
    NodeHooksExecutor.onCreate(nodeDefinition, newNodeForHook, workflow).catch(err => {
      console.error('[Editor] onCreate hook error:', err);
    });

    // Auto-save workflow when adding a chat trigger to register it in SQLite
    if (nodeDefinition.id === 'chat_trigger') {
      console.log('[Editor] Auto-saving workflow to register chat trigger');
      // Use setTimeout to allow the state to update first
      setTimeout(() => {
        const currentNodes = getNodes();
        const currentEdges = getEdges();
        handleSave(currentNodes, currentEdges);
        toast({
          title: 'Chat Registered',
          description: 'Chat trigger has been registered and is ready to use.',
        });
      }, 100);
    }

    setIsPaletteOpen(false);
  };

  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    setContextMenu(null);
    if ((event.target as HTMLElement).classList.contains('react-flow__pane')) {
      setNodesInternal(nds => nds.map(n => ({ ...n, selected: false })));
      setSelectedNodeId(null);
      setIsSettingsOpen(false);
    }
  }, []);

  const onNodeDragStop: NodeDragHandler = useCallback((event, node) => {
    saveState();
    setNodesInternal((currentNodes) => {
        const groupStickers = currentNodes.filter((n) => n.type === 'groupSticker');
        let parent: Node | null = null;

        for (const group of groupStickers) {
            const groupPos = group.positionAbsolute || group.position;
            const groupWidth = group.style?.width as number || group.width || 0;
            const groupHeight = group.style?.height as number || group.height || 0;
            const nodeWidth = node.width || 0;
            const nodeHeight = node.height || 0;
            const nodePos = node.positionAbsolute || node.position;

            if (
              node.type !== 'groupSticker' &&
              nodePos.x >= groupPos.x &&
              nodePos.x + nodeWidth <= groupPos.x + groupWidth &&
              nodePos.y >= groupPos.y &&
              nodePos.y + nodeHeight <= groupPos.y + groupHeight
            ) {
              parent = group;
              break;
            }
        }

        return currentNodes.map((n) => {
            if (n.id === node.id) {
                const newParentId = parent ? parent.id : undefined;
                if (n.parentId === newParentId) return n;

                let newPosition = { ...n.position };
                if (n.positionAbsolute) {
                    if (newParentId && parent?.positionAbsolute) {
                        newPosition = {
                            x: n.positionAbsolute.x - parent.positionAbsolute.x,
                            y: n.positionAbsolute.y - parent.positionAbsolute.y,
                        };
                    } else if (!newParentId && n.parentId) {
                        const oldParent = currentNodes.find(p => p.id === n.parentId);
                        if (oldParent?.positionAbsolute) {
                           newPosition = {
                                x: n.position.x + oldParent.positionAbsolute.x,
                                y: n.position.y + oldParent.positionAbsolute.y,
                           };
                        }
                    } else {
                       newPosition = n.positionAbsolute;
                    }
                }

                return {
                    ...n,
                    parentId: newParentId,
                    position: newPosition,
                    extent: newParentId ? 'parent' : undefined,
                };
            }
            return n;
        });
    });
}, [setNodesInternal, saveState]);

  // Optimize node updates - only update data for nodes with changed execution state
  const nodesWithHandlers = useMemo(() => {
    return nodes.map(node => {
      const isExecuting = executingNodes.has(node.id);
      const isCompleted = completedNodes.has(node.id);
      const isError = errorNodes.has(node.id);

      // Only create new data object if execution state actually changed
      const needsUpdate =
        node.data.isExecuting !== isExecuting ||
        node.data.isCompleted !== isCompleted ||
        node.data.isError !== isError ||
        node.data.showPortLabels !== showPortLabels;

      if (!needsUpdate && node.data.onAddNode && node.data.onLongPress && node.data.onDoubleClickNode) {
        return node; // Return existing node to prevent re-render
      }

      return {
        ...node,
        selected: node.selected,
        data: {
          ...node.data,
          onAddNode: handleAddNodeRequest,
          onLongPress: (id, event) => handleLongPress(id, event),
          onDoubleClickNode: (event: any, id: string) => handleNodeDoubleClickFromNode(event, id),
          isExecuting,
          isCompleted,
          isError,
          showPortLabels,
        }
      };
    });
  }, [nodes, handleAddNodeRequest, handleLongPress, handleNodeDoubleClickFromNode, executingNodes, completedNodes, errorNodes, showPortLabels]);

  const edgesWithHandlers = useMemo(() => {
    return edges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      // Determinar estados del edge basándose en los nodos conectados
      const sourceExecuting = executingNodes.has(edge.source);
      const targetExecuting = executingNodes.has(edge.target);
      const sourceCompleted = completedNodes.has(edge.source);
      const targetCompleted = completedNodes.has(edge.target);
      const sourceError = errorNodes.has(edge.source);
      const targetError = errorNodes.has(edge.target);

      const isExecuting = sourceExecuting || (sourceCompleted && targetExecuting) || activeEdgeId === edge.id;
      const isCompleted = sourceCompleted && targetCompleted;
      const isError = sourceError || targetError;

      return {
        ...edge,
        selected: edge.selected,
        data: {
          ...edge.data,
          onDoubleClick: onEdgeDoubleClick,
          active: activeEdgeId === edge.id,
          showMetrics: showEdgeMetrics,
          isExecuting,
          isCompleted,
          isError,
          ...edgeExecutionData[edge.id],
        }
      };
    });
  }, [edges, nodes, onEdgeDoubleClick, activeEdgeId, showEdgeMetrics, edgeExecutionData, executingNodes, completedNodes, errorNodes]);


  const nodeTypes = useMemo(() => (
    {
      custom: CustomNode,
      groupSticker: GroupStickerWithUpdate,
    }
  ), [GroupStickerWithUpdate]);

  const edgeTypes = useMemo(
    () => ({
      custom: CustomEdge
    }),
    []
  );

  const selectedNodeData = nodes.find(n => n.id === selectedNodeId) || null;

  const handleMenuAction = (action: 'edit' | 'duplicate' | 'delete' | 'insert' | 'add' | 'paste' | 'copy' | 'run_up_to') => {
    if (!contextMenu) return;
    const { id, type } = contextMenu;

    if (type === 'pane') {
        if (action === 'add') {
            setNodeCreationPosition(screenToFlowPosition(lastMousePosition));
            setIsPaletteOpen(true);
        } else if (action === 'paste') {
            handlePaste(lastMousePosition);
        }
    } else if (type === 'node' && id) {
      const node = getNode(id);
      if (!node) return;

      if (action === 'run_up_to'){
        // Special handling for triggers: open chat/form instead of executing
        const nodeDef = getNodeDefinition(node.data.type);
        if (nodeDef?.id === 'chat_trigger') {
          setIsChatModalOpen(true);
        } else if (nodeDef?.id === 'form_submit_trigger') {
          const formId = (node.data as any)?.config?.formId;
          if (formId && typeof window !== 'undefined') {
            const url = `/form/${formId}?mode=test`;
            const popupWidth = 520, popupHeight = 800;
            const dualLeft = (window.screenLeft !== undefined ? window.screenLeft : (window as any).screenX) || 0;
            const dualTop = (window.screenTop !== undefined ? window.screenTop : (window as any).screenY) || 0;
            const viewportW = window.innerWidth || document.documentElement.clientWidth || screen.width;
            const viewportH = window.innerHeight || document.documentElement.clientHeight || screen.height;
            const left = Math.max(dualLeft + (viewportW - popupWidth) / 2, 0);
            const top = Math.max(dualTop + (viewportH - popupHeight) / 2, 0);
            const features = `width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`;
            window.open(url, 'form_preview', features);
          }
        } else {
          handleRunWorkflow(id);
        }
      } else if (action === 'edit') {
        setSelectedNodeId(id);
        setIsSettingsOpen(true);
      } else if (action === 'copy') {
        handleCopy();
      } else if (action === 'delete') {
        handleDelete();
      } else if (action === 'backspace') {
        handleDelete();
      } else if (action === 'duplicate') {
        handleDuplicate();
      }
    } else if (type === 'edge' && id) {
      const edge = getEdge(id);
      if (!edge) return;
      if (action === 'delete') {
        saveState();
        setEdgesInternal(eds => eds.filter(e => e.id !== id));
      } else if (action === 'insert') {
        setEdgeForNodeInsertion(edge);
        setIsPaletteOpen(true);
      }
    }

    setContextMenu(null);
  };
  
    const handleCopy = useCallback(() => {
        const selectedNodes = getNodes().filter(n => n.selected);
        if (selectedNodes.length === 0) return;

        const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
        const relevantEdges = getEdges().filter(e =>
            selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
        );

        const fragment: WorkflowFragment = {
            nodes: selectedNodes.map(({ positionAbsolute, width, height, ...rest}) => rest),
            edges: relevantEdges.map(({ selected, ...rest}) => rest),
        };

        navigator.clipboard.writeText(JSON.stringify(fragment, null, 2))
            .then(() => toast({ title: `${selectedNodes.length} node(s) copied`}))
            .catch(err => {
                console.error("Failed to copy:", err);
                toast({ title: 'Copy failed', variant: 'destructive'});
            });
    }, [getNodes, getEdges, toast]);

    const handlePaste = useCallback((position: { x: number, y: number }) => {
        navigator.clipboard.readText()
            .then(text => {
                try {
                    const fragment: WorkflowFragment = JSON.parse(text);
                    if (!fragment.nodes || !fragment.edges) {
                        throw new Error('Invalid format');
                    }

                    saveState();
                    const flowPosition = screenToFlowPosition(position);

                    const idMapping = new Map<string, string>();
                    const newNodes: Node<NodeData>[] = [];
                    const newEdges: Edge[] = [];

                    let avgX = 0, avgY = 0;
                    if (fragment.nodes.length > 0) {
                        avgX = fragment.nodes.reduce((sum, node) => sum + node.position.x, 0) / fragment.nodes.length;
                        avgY = fragment.nodes.reduce((sum, node) => sum + node.position.y, 0) / fragment.nodes.length;
                    }

                    fragment.nodes.forEach(node => {
                        const oldId = node.id;
                        const newId = `${node.data.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                        idMapping.set(oldId, newId);

                        const newNode = {
                            ...node,
                            id: newId,
                            position: {
                                x: flowPosition.x + (node.position.x - avgX),
                                y: flowPosition.y + (node.position.y - avgY),
                            },
                            selected: false,
                        };

                        newNodes.push(newNode);

                        // Execute onDuplicate hook
                        const nodeDefinition = getNodeDefinition(node.data.type);
                        if (nodeDefinition) {
                          const originalNodeForHook = {
                            id: node.id,
                            type: node.data.type,
                            label: node.data.label,
                            properties: node.data.config,
                            position: node.position
                          };
                          const newNodeForHook = {
                            id: newNode.id,
                            type: newNode.data.type,
                            label: newNode.data.label,
                            properties: newNode.data.config,
                            position: newNode.position
                          };
                          NodeHooksExecutor.onDuplicate(nodeDefinition, originalNodeForHook, newNodeForHook).catch(err => {
                            console.error('[Editor] onDuplicate hook error:', err);
                          });
                        }
                    });

                    fragment.edges.forEach(edge => {
                        const newSourceId = idMapping.get(edge.source);
                        const newTargetId = idMapping.get(edge.target);
                        if (newSourceId && newTargetId) {
                            newEdges.push({
                                ...edge,
                                id: `reactflow__edge-${newSourceId}${edge.sourceHandle}-${newTargetId}${edge.targetHandle}`,
                                source: newSourceId,
                                target: newTargetId,
                            });
                        }
                    });

                    setNodesInternal(nds => [...nds, ...newNodes]);
                    setEdgesInternal(eds => [...eds, ...newEdges]);
                    toast({ title: `${newNodes.length} node(s) pasted` });

                } catch (e) {
                    toast({ title: 'Paste Error', description: 'Clipboard does not contain a valid workflow fragment.', variant: 'destructive'});
                }
            })
            .catch(err => {
                console.error("Failed to paste:", err);
                toast({ title: 'Paste failed', description: 'Could not read from clipboard.', variant: 'destructive'});
            });
    }, [saveState, screenToFlowPosition, getNodes, getEdges, toast]);

    const handleDuplicate = useCallback(() => {
        const selectedNodes = getNodes().filter(n => n.selected);
        if (selectedNodes.length === 0) return;

        const fragment: WorkflowFragment = {
            nodes: selectedNodes.map(({ positionAbsolute, width, height, ...rest }) => rest),
            edges: getEdges().filter(e => selectedNodes.some(n => n.id === e.source) && selectedNodes.some(n => n.id === e.target)).map(({ selected, ...rest}) => rest),
        };

        handlePaste(lastMousePosition);
    }, [getNodes, getEdges, handlePaste, lastMousePosition]);

    const handleDelete = useCallback(() => {
        const selectedNodes = getNodes().filter(n => n.selected);
        const selectedEdges = getEdges().filter(e => e.selected);
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
            saveState();

            // Execute onDelete hook for each deleted node
            selectedNodes.forEach(node => {
              const nodeDefinition = getNodeDefinition(node.data.type);
              if (nodeDefinition) {
                const nodeForHook = {
                  id: node.id,
                  type: node.data.type,
                  label: node.data.label,
                  properties: node.data.config,
                  position: node.position
                };
                NodeHooksExecutor.onDelete(nodeDefinition, nodeForHook, workflow).catch(err => {
                  console.error('[Editor] onDelete hook error:', err);
                });
              }
            });

            // Execute onDisconnect hook for each deleted edge
            selectedEdges.forEach(edge => {
              const sourceNode = getNode(edge.source);
              const targetNode = getNode(edge.target);

              if (sourceNode) {
                const sourceDef = getNodeDefinition(sourceNode.data.type);
                if (sourceDef) {
                  const nodeForHook = {
                    id: sourceNode.id,
                    type: sourceNode.data.type,
                    label: sourceNode.data.label,
                    properties: sourceNode.data.config,
                    position: sourceNode.position
                  };
                  NodeHooksExecutor.onDisconnect(sourceDef, nodeForHook, edge).catch(err => {
                    console.error('[Editor] onDisconnect hook error (source):', err);
                  });
                }
              }

              if (targetNode) {
                const targetDef = getNodeDefinition(targetNode.data.type);
                if (targetDef) {
                  const nodeForHook = {
                    id: targetNode.id,
                    type: targetNode.data.type,
                    label: targetNode.data.label,
                    properties: targetNode.data.config,
                    position: targetNode.position
                  };
                  NodeHooksExecutor.onDisconnect(targetDef, nodeForHook, edge).catch(err => {
                    console.error('[Editor] onDisconnect hook error (target):', err);
                  });
                }
              }
            });

            const nodeIdsToDelete = new Set(selectedNodes.map(n => n.id));
            setNodesInternal(nds => nds.filter(n => !n.selected));
            setEdgesInternal(eds => eds.filter(e => !e.selected && !nodeIdsToDelete.has(e.source) && !nodeIdsToDelete.has(e.target)));
            toast({ title: 'Selection deleted' });
        }
    }, [getNodes, getEdges, saveState, toast, getNode]);

    // Touch event handlers for mobile context menu
    useEffect(() => {
        if (!isMobile) return;

        const handleTouchStart = (e: globalThis.TouchEvent) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                setTouchStartPos({ x: touch.clientX, y: touch.clientY });
                
                longPressTimer.current = setTimeout(() => {
                    setIsLongPressing(true);
                    if ('vibrate' in navigator) {
                        navigator.vibrate(50);
                    }
                }, 500);
            }
        };

        const handleTouchMove = (e: globalThis.TouchEvent) => {
            if (longPressTimer.current && touchStartPos) {
                const touch = e.touches[0];
                const deltaX = Math.abs(touch.clientX - touchStartPos.x);
                const deltaY = Math.abs(touch.clientY - touchStartPos.y);
                
                if (deltaX > 10 || deltaY > 10) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                    setIsLongPressing(false);
                }
            }
        };

        const handleTouchEnd = () => {
            if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
            }
            setIsLongPressing(false);
            setTouchStartPos(null);
        };

        const wrapper = reactFlowWrapper.current;
        if (wrapper) {
            wrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
            wrapper.addEventListener('touchmove', handleTouchMove, { passive: true });
            wrapper.addEventListener('touchend', handleTouchEnd, { passive: true });
            wrapper.addEventListener('touchcancel', handleTouchEnd, { passive: true });
        }

        return () => {
            if (wrapper) {
                wrapper.removeEventListener('touchstart', handleTouchStart);
                wrapper.removeEventListener('touchmove', handleTouchMove);
                wrapper.removeEventListener('touchend', handleTouchEnd);
                wrapper.removeEventListener('touchcancel', handleTouchEnd);
            }
            if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
            }
        };
    }, [isMobile, touchStartPos]);



    useEffect(() => {
        const onMouseMove = (event: globalThis.MouseEvent) => {
            if (reactFlowWrapper.current) {
                const rect = reactFlowWrapper.current.getBoundingClientRect();
                setLastMousePosition({
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top,
                });
            }
        };
        
        if (!isMobile) {
            window.addEventListener('mousemove', onMouseMove);
        }
        
        return () => {
            if (!isMobile) {
                window.removeEventListener('mousemove', onMouseMove);
            }
        };
    }, [isMobile]);

    // Keyboard shortcuts
    useEffect(() => {
        // Don't skip keyboard shortcuts on mobile - allow them if keyboard is available
        // if (isMobile) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            // Don't trigger shortcuts if settings panel is open
            if (isSettingsOpen) return;

            // Check if user is typing in an input field or editor
            const activeElement = document.activeElement;
            const isInputFocused =
                activeElement instanceof HTMLInputElement ||
                activeElement instanceof HTMLTextAreaElement ||
                activeElement?.getAttribute('contenteditable') === 'true' ||
                activeElement?.classList.contains('monaco-editor') ||
                activeElement?.closest('.monaco-editor') !== null ||
                activeElement?.closest('[role="dialog"]') !== null ||
                activeElement?.closest('[data-state="open"]') !== null;

            if (isInputFocused) return;

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

            if (isCtrlOrCmd && event.key.toLowerCase() === 'a') {
                event.preventDefault();
                event.stopPropagation();
                handleSelectAll();

                // Limpiar cualquier selección de texto que el navegador haya creado
                // Usamos setTimeout para ejecutar DESPUÉS del procesamiento del evento
                setTimeout(() => {
                    if (window.getSelection) {
                        const selection = window.getSelection();
                        if (selection) {
                            selection.removeAllRanges();
                        }
                    }
                }, 0);
            } else if (isCtrlOrCmd && event.key.toLowerCase() === 'c') {
                event.preventDefault();
                event.stopPropagation();
                handleCopy();
            } else if (isCtrlOrCmd && event.key.toLowerCase() === 'v') {
                event.preventDefault();
                event.stopPropagation();
                handlePaste(lastMousePosition);
            } else if (isCtrlOrCmd && event.key.toLowerCase() === 'd') {
                event.preventDefault();
                event.stopPropagation();
                handleDuplicate();
            } else if (isCtrlOrCmd && event.shiftKey && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                event.stopPropagation();
                handleRedo();
            } else if (isCtrlOrCmd && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                event.stopPropagation();
                handleUndo();
            } else if (isCtrlOrCmd && event.key.toLowerCase() === 'y') {
                event.preventDefault();
                event.stopPropagation();
                handleRedo();
            } else if (event.key === 'Delete' || event.key === 'Backspace') {
                event.preventDefault();
                event.stopPropagation();
                handleDelete();
            }
        };

        document.addEventListener('keydown', handleKeyDown, true);
        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [isSettingsOpen, isMobile, handleSelectAll, handleCopy, handlePaste, handleDuplicate, handleUndo, handleRedo, handleDelete, lastMousePosition]);
    
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setWorkflowName(e.target.value);
    };

    const handleTitleBlur = async () => {
        setIsEditingTitle(false);
        if (!user || !workflow || workflowName === workflow.name) return;

        const workflowDocRef = doc(firestore, 'users', user.uid, 'workflows', workflow.id);
        await updateDoc(workflowDocRef, { name: workflowName });
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleTitleBlur();
        }
    };
  
  const handleSaveAs = async (newName: string) => {
      if (!user || !workflow) return;
      const workflowsCollection = collection(firestore, 'users', user.uid, 'workflows');
  
      const nodesToSave = nodes.map(n => ({
        id: n.id,
        type: n.data.type,
        label: n.data.label,
        position: n.position,
        config: n.data.config,
        description: n.data.description,
        parentId: n.parentId,
      }));
    
      const connectionsToSave = edges.map(e => ({
        id: e.id,
        sourceNodeId: e.source,
        sourceHandle: e.sourceHandle,
        targetNodeId: e.target,
        targetHandle: e.targetHandle,
      }));
  
      const { x, y, zoom } = getViewport();
      const newWorkflowData = {
        name: newName,
        description: workflow.description,
        status: 'draft' as const,
        nodes: nodesToSave,
        connections: connectionsToSave,
        createdAt: serverTimestamp(),
        folderId: workflow.folderId,
        metadata: { viewport: { x, y, zoom } },
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const editable = (e.target as HTMLElement)?.isContentEditable;
      // Avoid interfering with typing in inputs/editors
      if (tag === 'input' || tag === 'textarea' || editable) return;

      // Ctrl/Cmd + S => Save
      if (isMod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        try {
          handleSave(getNodes(), getEdges());
          toast({ title: 'Saved', description: 'Workflow saved (Ctrl+S)' });
        } catch {
          console.log("Error: CTRL + S");
        }
      }

      // Ctrl/Cmd + R => Run workflow or open chat
      if (isMod && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        try {
          const chatNode = getNodes().find(n => n.data.type === 'chat_trigger');
          if (chatNode) {
            setIsChatModalOpen(true);
          } else {
            handleRunWorkflow();
          }
        } catch {
          console.log("Error: CTRL + R");
        }
      }

      try{
      // Ctrl/Cmd + P => Organize nodes (simple auto layout)
      if (isMod && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        organizeNodes();
      }
    } catch {
      console.log("Error: CTRL + P");
    }

    try{    
      // Ctrl/Cmd + F => Focus all nodes (fit view)
      if (isMod && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        try { fitView({ padding: 0.2, duration: 300 }); } catch {}
      }
    } catch {
      console.log("Error: CTRL + F");
    }
    };
    // Use capture to preempt browser defaults (save/reload/print/find)
    document.addEventListener('keydown', handler, { capture: true });
    return () => document.removeEventListener('keydown', handler, { capture: true } as any);
  }, [handleSave, getNodes, getEdges, handleRunWorkflow, setIsChatModalOpen, fitView, organizeNodes, toast]);
  
      try {
        const newWorkflowDoc = await addDoc(workflowsCollection, newWorkflowData);
        toast({ title: 'Workflow Saved As', description: `Created a new workflow: ${newName}` });
        router.push(`/workflows/${newWorkflowDoc.id}`);
      } catch (error) {
        console.error("Error saving as new workflow:", error);
        toast({ title: 'Save As Error', description: 'Could not save the new workflow.', variant: 'destructive' });
      }
      setIsSaveAsOpen(false);
    };
  
    const handleExport = () => {
      const data = {
        name: workflowName,
        description: workflow.description,
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.data.type,
          label: n.data.label,
          position: n.position,
          config: n.data.config,
          description: n.data.description,
          parentId: n.parentId,
        })),
        connections: edges.map(e => ({
          id: e.id,
          sourceNodeId: e.source,
          sourceHandle: e.sourceHandle,
          targetNodeId: e.target,
          targetHandle: e.targetHandle,
        })),
      };
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workflowName.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Exported', description: 'Workflow JSON downloaded.' });
    };
  
    const handleShare = () => {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link Copied', description: 'Workflow URL copied to clipboard.' });
    };

    const handleStopWorkflow = useCallback(() => {
        // Stop polling
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }

        // Clear execution state
        setCurrentExecutionId(null);
        setExecutingNodes(new Set());
        setCompletedNodes(new Set());
        setErrorNodes(new Set());
        setActiveEdgeId(null);
        lastEventIdRef.current = 0;

        console.log('[WorkflowEditor] Workflow execution stopped');
        toast({
            title: 'Workflow Stopped',
            description: 'Execution has been halted.'
        });
    }, [toast]);

    const handleRunWorkflow = useCallback(async (targetNodeId: string | null = null) => {
        if (!firestore || !user) {
            toast({ title: 'Error', description: 'Firestore not available', variant: 'destructive' });
            return;
        }

        setExecutingNodes(new Set());
        setCompletedNodes(new Set());
        setErrorNodes(new Set());
        setActiveEdgeId(null);
        setExecutionData({});
        setEdgeExecutionData({});
        setExecutionContext({});

        const triggerNode = nodes.find(n => {
            const def = getNodeDefinition(n.data.type);
            return def && def.category === 'trigger';
        });

        if (!triggerNode) {
            toast({
                title: "No Trigger Node",
                description: "Cannot run a workflow without a trigger node.",
                variant: "destructive",
            });
            return;
        }

        const triggerDef = getNodeDefinition(triggerNode.data.type);

        // Handle Webhook test execution
        if (triggerDef?.id === 'webhook_trigger') {
            setExecutingNodes(new Set([triggerNode.id]));
            toast({
                title: "Listening for Webhook...",
                description: "Send a request to the webhook URL to trigger the workflow.",
            });
            // The listener is set up in the useEffect below
            return;
        }

        // Handle Form Submit test execution
        if (triggerDef?.id === 'form_submit_trigger') {
            setExecutingNodes(new Set([triggerNode.id]));
            toast({
                title: "Listening for Form Submission...",
                description: "Submit the form to trigger the workflow.",
            });
            // The listener is set up in the useEffect below
            return;
        }

        // Handle Chat trigger test execution
        if (triggerDef?.id === 'chat_trigger') {
            setExecutingNodes(new Set([triggerNode.id]));
            toast({
                title: "Chat Ready for Testing",
                description: "Click the chat button in the bottom-right corner to test your chat.",
            });
            // The chat FAB is automatically displayed when a chat trigger exists
            return;
        }

        // Start test execution via API to get execution ID
        let executionId = '';
        try {
            const response = await fetch('/api/workflow/execute-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workflowId: workflow.id,
                    userId: user.uid,
                    webhookData: null,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to start test execution');
            }

            const data = await response.json();
            executionId = data.executionId;

            // Set execution ID to start polling
            setCurrentExecutionId(executionId);
            lastEventIdRef.current = 0;

            console.log(`[WorkflowEditor] Test execution started: ${executionId}`);
        } catch (error) {
            console.error('[WorkflowEditor] Failed to start test execution:', error);
            toast({
                title: 'Execution Error',
                description: 'Failed to start test execution',
                variant: 'destructive'
            });
            return;
        }

        // Now execute the workflow with the execution ID
        const engine = new WorkflowEngine(
            {
                ...workflow,
                nodes: getNodes().map(n => ({ ...n.data, position: n.position, parentId: n.parentId })),
                connections: getEdges().map(e => ({ id: e.id, sourceNodeId: e.source, sourceHandle: e.sourceHandle!, targetNodeId: e.target, targetHandle: e.targetHandle! })),
            },
            {
                db: firestore,
                user,
                doc,
                getDoc,
                setDoc,
                updateDoc,
                deleteDoc,
                errorEmitter,
                FirestorePermissionError
            },
            {
                onNodeStart: (nodeId) => {
                    setExecutingNodes(prev => new Set(prev).add(nodeId));
                    // Emit node_start event to API (fire-and-forget)
                    if (executionId) {
                        fetch('/api/workflow/execution-events', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                executionId,
                                eventType: 'node_start',
                                nodeId,
                            }),
                        }).catch(err => {
                            console.error('[WorkflowEngine] Failed to emit node_start event:', err);
                        });
                    }
                },
                onNodeEnd: (nodeId, input, output, duration, logs) => {
                    setExecutingNodes(prev => {
                      const next = new Set(prev);
                      next.delete(nodeId);
                      return next;
                    });
                    if (output?.error || output?.path === 'error') {
                        setErrorNodes(prev => new Set(prev).add(nodeId));
                        toast({
                            title: `Error in node: ${getNodeDefinition(nodes.find(n => n.id === nodeId)?.data.type || '')?.name}`,
                            description: output?.error || output?.data?.error || 'Node returned error',
                            variant: "destructive",
                        });
                    } else {
                        setCompletedNodes(prev => new Set(prev).add(nodeId));
                    }
                    setExecutionData(prev => ({ ...prev, [nodeId]: { input, output, logs: logs || [] } }));
                },
                onEdgeTraverse: (edgeId, executionTime, itemCount) => {
                    setActiveEdgeId(edgeId);
                    setEdgeExecutionData(prev => ({ ...prev, [edgeId]: { executionTime, itemCount } }));
                },
                onWorkflowEnd: () => {
                    setActiveEdgeId(null);
                    setExecutingNodes(new Set());
                    setCurrentExecutionId(null);
                },
                onExecutionUpdate: (execContext) => setExecutionContext(execContext),
                onError: (nodeId, error) => {
                    console.error('[WorkflowEditor] WorkflowEngine error:', error);
                    toast({
                        title: `Workflow Error in node: ${getNodeDefinition(nodes.find(n => n.id === nodeId)?.data.type || '')?.name}`,
                        description: error.message,
                        variant: "destructive",
                    });
                },
          onClientNodeExecution: async (nodeId, definition, nodeContext, inputData) => {
            // Emit synthetic node_start for client nodes so the event feed reflects UI actions
            try {
              if (executionId) {
                fetch('/api/workflow/execution-events', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ executionId, eventType: 'node_start', nodeId }),
                }).catch(() => {});
              }
            } catch {}

            const output = await executeClientNode(definition, nodeContext, inputData, {
              alert: (message: string) => window.alert(message),
              toast: (options) => toast(options),
              log: (...args: any[]) => console.log('[ClientNode]', ...args),
                        error: (...args: any[]) => console.error('[ClientNode]', ...args),
                        warn: (...args: any[]) => console.warn('[ClientNode]', ...args),
                        info: (...args: any[]) => console.info('[ClientNode]', ...args),
                    });
            // Emit synthetic node_end for client nodes
            try {
              if (executionId) {
                fetch('/api/workflow/execution-events', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ executionId, eventType: 'node_end', nodeId }),
                }).catch(() => {});
              }
            } catch {}
            return output;
          },
            },
            targetNodeId,
            'manual'
        );

        await engine.execute(triggerNode.id, {});
        // Final safety cleanup in case any late events arrive
        setActiveEdgeId(null);
        setExecutingNodes(new Set());
        setCurrentExecutionId(null);
    }, [firestore, user, toast, nodes, workflow, getNodes, getEdges]);

    const handleRestartWorkflow = useCallback(() => {
        handleStopWorkflow();
        setTimeout(() => {
            handleRunWorkflow();
        }, 100);
    }, [handleStopWorkflow, handleRunWorkflow]);

    // Effect for polling execution events in test mode
    useEffect(() => {
        if (!currentExecutionId) {
            // Stop polling if no execution
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
            return;
        }

        let hasReceivedWorkflowEnd = false;

        const pollEvents = async () => {
            try {
                const url = `/api/workflow/execution-events/${currentExecutionId}${lastEventIdRef.current > 0 ? `?sinceId=${lastEventIdRef.current}` : ''}`;
                const response = await fetch(url);

                if (!response.ok) {
                    console.error('[Polling] Failed to fetch events:', response.statusText);
                    return;
                }

                const data = await response.json();
                const events = data.events || [];

                if (events.length === 0) return;

                // Process events; ignore any after workflow_end
                events.forEach((event: any) => {
                    if (hasReceivedWorkflowEnd) return;
                    console.log('[Polling] Event received:', event);

                    switch (event.event_type) {
                        case 'workflow_start':
                            // Don't reset state here since execution already started
                            break;

                        case 'node_start':
                            if (event.node_id) {
                                setExecutingNodes(prev => new Set(prev).add(event.node_id));
                            }
                            break;

                        case 'node_end':
                            if (event.node_id) {
                                setExecutingNodes(prev => {
                                    const next = new Set(prev);
                                    next.delete(event.node_id);
                                    return next;
                                });

                                // event.data is already parsed from SQLite
                                const eventData = event.data || null;
                                if (eventData?.output?.error || eventData?.output?.path === 'error') {
                                    setErrorNodes(prev => new Set(prev).add(event.node_id));
                                } else {
                                    setCompletedNodes(prev => new Set(prev).add(event.node_id));
                                }
                            }
                            break;

                        case 'edge_traverse':
                            if (event.edge_id) {
                                setActiveEdgeId(event.edge_id);
                                setTimeout(() => setActiveEdgeId(null), 500);
                            }
                            break;

                        case 'workflow_end':
                            hasReceivedWorkflowEnd = true;
                            // Force UI to clear running state and stop polling immediately
                            setActiveEdgeId(null);
                            setExecutingNodes(new Set());
                            if (pollingIntervalRef.current) {
                                clearInterval(pollingIntervalRef.current);
                                pollingIntervalRef.current = null;
                            }
                            setCurrentExecutionId(null);
                            break;
                    }

                    // Update last event ID using ref (no re-render)
                    if (event.id > lastEventIdRef.current) {
                        lastEventIdRef.current = event.id;
                    }
                });

                // If we received workflow_end, we've already stopped and cleared above

            } catch (error) {
                console.error('[Polling] Error fetching events:', error);
            }
        };

        // Poll immediately
        pollEvents();

        // Set up polling interval (every 500ms)
        pollingIntervalRef.current = setInterval(pollEvents, 500);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [currentExecutionId]);

    // Effect for webhook test listening (SQLite polling)
    useEffect(() => {
        const triggerNode = nodes.find(n => getNodeDefinition(n.data.type)?.id === 'webhook_trigger');

        if (!triggerNode || !executingNodes.has(triggerNode.id) || !firestore || !user) {
            return;
        }

        const webhookId = triggerNode.data.config?.webhookId;
        if (!webhookId) {
            console.error('[WebhookListener] No webhookId found in trigger node');
            return;
        }

        console.log('[WebhookListener] Polling for webhook calls:', webhookId);

        let isProcessing = false; // Prevent processing the same call multiple times

        const pollInterval = setInterval(async () => {
            if (isProcessing) return; // Skip if already processing

            try {
                // Poll SQLite for webhook calls
                const response = await fetch(`/api/webhook-calls/${webhookId}?limit=1`);
                if (!response.ok) {
                    console.error('[WebhookListener] Failed to fetch webhook calls');
                    return;
                }

                const data = await response.json();
                const calls = data.calls || [];

                if (calls.length > 0) {
                    isProcessing = true; // Mark as processing
                    const webhookCall = calls[0];

                    console.log('[WebhookListener] Webhook received!', webhookCall);

                    // Delete the webhook call FIRST to prevent re-processing
                    await fetch(`/api/webhook-calls/${webhookId}?callId=${webhookCall.id}`, {
                        method: 'DELETE',
                    });

                    toast({ title: 'Webhook Received!', description: 'Executing workflow with received data.' });

                    // Stop listening state
                    setExecutingNodes(new Set());

                    // Start test execution with webhook data
                    const execResponse = await fetch('/api/workflow/execute-test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            workflowId: workflow.id,
                            userId: user.uid,
                            webhookData: {
                                body: webhookCall.body,
                                query: webhookCall.query,
                                headers: webhookCall.headers,
                                method: webhookCall.method,
                                path: webhookCall.path,
                            },
                        }),
                    });

                    if (!execResponse.ok) {
                        throw new Error('Failed to start test execution');
                    }

                    const execData = await execResponse.json();
                    const executionId = execData.executionId;

                    // Set execution ID to start polling
                    setCurrentExecutionId(executionId);
                    lastEventIdRef.current = 0;

                    console.log(`[WebhookListener] Test execution started: ${executionId}`);

                    // Start the engine with the webhook data
                    const engine = new WorkflowEngine(
                      {
                        ...workflow,
                        nodes: getNodes().map(n => ({...n.data, position: n.position, parentId: n.parentId})),
                        connections: getEdges().map(e => ({ id: e.id, sourceNodeId: e.source, sourceHandle: e.sourceHandle!, targetNodeId: e.target, targetHandle: e.targetHandle! })),
                      },
                      { db: firestore, user, doc, getDoc, setDoc, updateDoc, deleteDoc, errorEmitter, FirestorePermissionError },
                      {
                        onNodeStart: (nodeId) => {
                            setExecutingNodes(prev => new Set(prev).add(nodeId));
                            if (executionId) {
                                fetch('/api/workflow/execution-events', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        executionId,
                                        eventType: 'node_start',
                                        nodeId,
                                    }),
                                }).catch(err => console.error('[WorkflowEngine] Failed to emit node_start event:', err));
                            }
                        },
                onNodeEnd: (nodeId, input, output, duration, logs) => {
                            setExecutingNodes(prev => { const next = new Set(prev); next.delete(nodeId); return next; });
                            if (output?.error || output?.path === 'error') setErrorNodes(prev => new Set(prev).add(nodeId));
                            else setCompletedNodes(prev => new Set(prev).add(nodeId));
                            setExecutionData(prev => ({ ...prev, [nodeId]: { input, output, files: output?.files || input?.files || null, logs: logs || [] } }));

                            if (executionId) {
                                fetch('/api/workflow/execution-events', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        executionId,
                                        eventType: 'node_end',
                                        nodeId,
                                        data: { input, output },
                                    }),
                                }).catch(err => console.error('[WorkflowEngine] Failed to emit node_end event:', err));
                            }
                        },
                        onEdgeTraverse: (edgeId, executionTime, itemCount) => {
                            setActiveEdgeId(edgeId);
                            setEdgeExecutionData(prev => ({ ...prev, [edgeId]: { executionTime, itemCount } }));

                            if (executionId) {
                                fetch('/api/workflow/execution-events', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        executionId,
                                        eventType: 'edge_traverse',
                                        edgeId,
                                        data: { executionTime, itemCount },
                                    }),
                                }).catch(err => console.error('[WorkflowEngine] Failed to emit edge_traverse event:', err));
                            }
                        },
                        onWorkflowEnd: () => {
                            setActiveEdgeId(null);

                            if (executionId) {
                                fetch('/api/workflow/execution-events', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        executionId,
                                        eventType: 'workflow_end',
                                    }),
                                }).catch(err => console.error('[WorkflowEngine] Failed to emit workflow_end event:', err));
                            }
                        },
                        onExecutionUpdate: (execContext) => setExecutionContext(execContext),
                        onClientNodeExecution: async (nodeId, definition, nodeContext, inputData) => {
                            const output = await executeClientNode(definition, nodeContext, inputData, {
                                alert: (message: string) => window.alert(message),
                                toast: (options) => toast(options),
                                log: (...args: any[]) => console.log(`[${nodeId}] [LOG]`, ...args),
                                error: (...args: any[]) => console.error(`[${nodeId}] [ERROR]`, ...args),
                                warn: (...args: any[]) => console.warn(`[${nodeId}] [WARN]`, ...args),
                                info: (...args: any[]) => console.info(`[${nodeId}] [INFO]`, ...args),
                                executeFromNode: async (targetNodeId: string, subInputData: any = {}) => {
                                    console.log(`[${nodeId}] Calling executeFromNode with target: ${targetNodeId}`);

                                    // Create a new sub-engine for isolated execution (avoid context conflicts)
                                    const subEngine = new WorkflowEngine(
                                        {
                                            ...workflow,
                                            nodes: getNodes().map(n => ({...n.data, position: n.position, parentId: n.parentId})),
                                            connections: getEdges().map(e => ({ id: e.id, sourceNodeId: e.source, sourceHandle: e.sourceHandle!, targetNodeId: e.target, targetHandle: e.targetHandle! })),
                                        },
                                        { db: firestore, user, doc, getDoc, setDoc, updateDoc, deleteDoc, errorEmitter, FirestorePermissionError },
                                        {
                                            onNodeStart: (subNodeId) => {
                                                console.log(`[${nodeId}] Sub-workflow node started:`, subNodeId);
                                                setExecutingNodes(prev => new Set(prev).add(subNodeId));
                                            },
                                            onNodeEnd: (subNodeId, input, output, duration, logs) => {
                                                console.log(`[${nodeId}] Sub-workflow node ended:`, subNodeId);
                                                setExecutingNodes(prev => { const next = new Set(prev); next.delete(subNodeId); return next; });
                                                if (output?.error || output?.path === 'error') setErrorNodes(prev => new Set(prev).add(subNodeId));
                                                else setCompletedNodes(prev => new Set(prev).add(subNodeId));
                                                setExecutionData(prev => ({ ...prev, [subNodeId]: { input, output, files: output?.files || input?.files || null, logs: logs || [] } }));
                                            },
                                            onEdgeTraverse: (edgeId, executionTime, itemCount) => {
                                                console.log(`[${nodeId}] Sub-workflow edge traversed:`, edgeId);
                                                setActiveEdgeId(edgeId);
                                                setEdgeExecutionData(prev => ({ ...prev, [edgeId]: { executionTime, itemCount } }));
                                            },
                                            onClientNodeExecution: async (subNodeId, definition, nodeContext, inputData) => {
                                                const output = await executeClientNode(definition, nodeContext, inputData, {
                                                    alert: (message: string) => window.alert(message),
                                                    toast: (options) => toast(options),
                                                    log: (...args: any[]) => console.log(`[${subNodeId}] [LOG]`, ...args),
                                                    error: (...args: any[]) => console.error(`[${subNodeId}] [ERROR]`, ...args),
                                                    warn: (...args: any[]) => console.warn(`[${subNodeId}] [WARN]`, ...args),
                                                    info: (...args: any[]) => console.info(`[${subNodeId}] [INFO]`, ...args),
                                                });
                                                return output;
                                            },
                                        },
                                        null,
                                        'manual'
                                    );

                                    const subContext = await subEngine.execute(targetNodeId, subInputData);
                                    console.log(`[${nodeId}] Sub-workflow completed. Context:`, subContext);

                                    if (subContext[targetNodeId]) {
                                        return subContext[targetNodeId].output;
                                    }
                                    return subContext;
                                },
                            });
                            return output;
                        },
                      }
                    );
                    engine.execute(triggerNode.id, {
                        body: webhookCall.body,
                        query: webhookCall.query,
                        headers: webhookCall.headers,
                        method: webhookCall.method,
                        path: webhookCall.path,
                    });

                    isProcessing = false; // Done processing
                }
            } catch (error) {
                console.error('[WebhookListener] Error polling webhook calls:', error);
                isProcessing = false;
            }
        }, 1000); // Poll every 1 second

        return () => clearInterval(pollInterval);

    }, [executingNodes, nodes, workflow.id, firestore, user, toast, getNodes, getEdges, workflow]);

    // Effect for form submit test listening (SQLite polling)
    useEffect(() => {
        const triggerNode = nodes.find(n => getNodeDefinition(n.data.type)?.id === 'form_submit_trigger');

        if (!triggerNode || !executingNodes.has(triggerNode.id) || !firestore || !user) {
            return;
        }

        const formId = triggerNode.data.config?.formId;
        if (!formId) {
            console.error('[FormListener] No formId found in trigger node');
            return;
        }

        console.log('[FormListener] Polling for form calls:', formId);

        let isProcessing = false;

        const pollInterval = setInterval(async () => {
            if (isProcessing) return;

            try {
                const response = await fetch(`/api/form-calls/${formId}?limit=1`);
                if (!response.ok) {
                    console.error('[FormListener] Failed to fetch form calls');
                    return;
                }

                const data = await response.json();
                const calls = data.calls || [];

                if (calls.length > 0) {
                    isProcessing = true;
                    const formCall = calls[0];

                    console.log('[FormListener] Form submission received!', formCall);

                    await fetch(`/api/form-calls/${formId}?callId=${formCall.id}`, {
                        method: 'DELETE',
                    });

                    toast({ title: 'Form Submitted!', description: 'Executing workflow with submitted data.' });

                    setExecutingNodes(new Set());

                    const execResponse = await fetch('/api/workflow/execute-test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            workflowId: workflow.id,
                            userId: user.uid,
                            webhookData: { body: formCall.body },
                        }),
                    });

                    if (!execResponse.ok) {
                        throw new Error('Failed to start test execution');
                    }

                    const execData = await execResponse.json();
                    const executionId = execData.executionId;

                    setCurrentExecutionId(executionId);
                    lastEventIdRef.current = 0;

                    console.log(`[FormListener] Test execution started: ${executionId}`);

                    const engine = new WorkflowEngine(
                      {
                        ...workflow,
                        nodes: getNodes().map(n => ({...n.data, position: n.position, parentId: n.parentId})),
                        connections: getEdges().map(e => ({ id: e.id, sourceNodeId: e.source, sourceHandle: e.sourceHandle!, targetNodeId: e.target, targetHandle: e.targetHandle! })),
                      },
                      { db: firestore, user, doc, getDoc, setDoc, updateDoc, deleteDoc, errorEmitter, FirestorePermissionError },
                      {
                        onNodeStart: (nodeId) => {
                            setExecutingNodes(prev => new Set(prev).add(nodeId));
                            if (executionId) {
                                fetch('/api/workflow/execution-events', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        executionId,
                                        eventType: 'node_start',
                                        nodeId,
                                    }),
                                }).catch(err => console.error('[WorkflowEngine] Failed to emit node_start event:', err));
                            }
                        },
                        onNodeEnd: (nodeId, input, output, duration, logs) => {
                            setExecutingNodes(prev => { const next = new Set(prev); next.delete(nodeId); return next; });
                            if (output?.error || output?.path === 'error') setErrorNodes(prev => new Set(prev).add(nodeId));
                            else setCompletedNodes(prev => new Set(prev).add(nodeId));
                            setExecutionData(prev => ({ ...prev, [nodeId]: { input, output, files: output?.files || input?.files || null, logs: logs || [] } }));

                            if (executionId) {
                                fetch('/api/workflow/execution-events', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        executionId,
                                        eventType: 'node_end',
                                        nodeId,
                                        data: { input, output },
                                    }),
                                }).catch(err => console.error('[WorkflowEngine] Failed to emit node_end event:', err));
                            }
                        },
                        onEdgeTraverse: (edgeId, executionTime, itemCount) => {
                            setActiveEdgeId(edgeId);
                            setEdgeExecutionData(prev => ({ ...prev, [edgeId]: { executionTime, itemCount } }));

                            if (executionId) {
                                fetch('/api/workflow/execution-events', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        executionId,
                                        eventType: 'edge_traverse',
                                        edgeId,
                                        data: { executionTime, itemCount },
                                    }),
                                }).catch(err => console.error('[WorkflowEngine] Failed to emit edge_traverse event:', err));
                            }
                        },
                        onWorkflowEnd: () => {
                            setActiveEdgeId(null);

                            if (executionId) {
                                fetch('/api/workflow/execution-events', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        executionId,
                                        eventType: 'workflow_end',
                                    }),
                                }).catch(err => console.error('[WorkflowEngine] Failed to emit workflow_end event:', err));
                            }
                        },
                        onExecutionUpdate: (execContext) => setExecutionContext(execContext),
                        onClientNodeExecution: async (nodeId, definition, nodeContext, inputData) => {
                            const output = await executeClientNode(definition, nodeContext, inputData, {
                                alert: (message: string) => window.alert(message),
                                toast: (options) => toast(options),
                                log: (...args: any[]) => console.log(`[${nodeId}] [LOG]`, ...args),
                                error: (...args: any[]) => console.error(`[${nodeId}] [ERROR]`, ...args),
                                warn: (...args: any[]) => console.warn(`[${nodeId}] [WARN]`, ...args),
                                info: (...args: any[]) => console.info(`[${nodeId}] [INFO]`, ...args),
                                executeFromNode: async (targetNodeId: string, subInputData: any = {}) => {
                                    console.log(`[${nodeId}] Calling executeFromNode with target: ${targetNodeId}`);

                                    // Create a new sub-engine for isolated execution (avoid context conflicts)
                                    const subEngine = new WorkflowEngine(
                                        {
                                            ...workflow,
                                            nodes: getNodes().map(n => ({...n.data, position: n.position, parentId: n.parentId})),
                                            connections: getEdges().map(e => ({ id: e.id, sourceNodeId: e.source, sourceHandle: e.sourceHandle!, targetNodeId: e.target, targetHandle: e.targetHandle! })),
                                        },
                                        { db: firestore, user, doc, getDoc, setDoc, updateDoc, deleteDoc, errorEmitter, FirestorePermissionError },
                                        {
                                            onNodeStart: (subNodeId) => {
                                                console.log(`[${nodeId}] Sub-workflow node started:`, subNodeId);
                                                setExecutingNodes(prev => new Set(prev).add(subNodeId));
                                            },
                                            onNodeEnd: (subNodeId, input, output, duration, logs) => {
                                                console.log(`[${nodeId}] Sub-workflow node ended:`, subNodeId);
                                                setExecutingNodes(prev => { const next = new Set(prev); next.delete(subNodeId); return next; });
                                                if (output?.error || output?.path === 'error') setErrorNodes(prev => new Set(prev).add(subNodeId));
                                                else setCompletedNodes(prev => new Set(prev).add(subNodeId));
                                                setExecutionData(prev => ({ ...prev, [subNodeId]: { input, output, files: output?.files || input?.files || null, logs: logs || [] } }));
                                            },
                                            onEdgeTraverse: (edgeId, executionTime, itemCount) => {
                                                console.log(`[${nodeId}] Sub-workflow edge traversed:`, edgeId);
                                                setActiveEdgeId(edgeId);
                                                setEdgeExecutionData(prev => ({ ...prev, [edgeId]: { executionTime, itemCount } }));
                                            },
                                            onClientNodeExecution: async (subNodeId, definition, nodeContext, inputData) => {
                                                const output = await executeClientNode(definition, nodeContext, inputData, {
                                                    alert: (message: string) => window.alert(message),
                                                    toast: (options) => toast(options),
                                                    log: (...args: any[]) => console.log(`[${subNodeId}] [LOG]`, ...args),
                                                    error: (...args: any[]) => console.error(`[${subNodeId}] [ERROR]`, ...args),
                                                    warn: (...args: any[]) => console.warn(`[${subNodeId}] [WARN]`, ...args),
                                                    info: (...args: any[]) => console.info(`[${subNodeId}] [INFO]`, ...args),
                                                });
                                                return output;
                                            },
                                        },
                                        null,
                                        'manual'
                                    );

                                    const subContext = await subEngine.execute(targetNodeId, subInputData);
                                    console.log(`[${nodeId}] Sub-workflow completed. Context:`, subContext);

                                    if (subContext[targetNodeId]) {
                                        return subContext[targetNodeId].output;
                                    }
                                    return subContext;
                                },
                            });
                            return output;
                        },
                      }
                    );
                    engine.execute(triggerNode.id, { body: formCall.body, files: formCall.files });

                    isProcessing = false;
                }
            } catch (error) {
                console.error('[FormListener] Error polling form calls:', error);
                isProcessing = false;
            }
        }, 1000);

        return () => clearInterval(pollInterval);

    }, [executingNodes, nodes, workflow.id, firestore, user, toast, getNodes, getEdges, workflow]);


  // Mobile Menu Component
  const MobileMenu = () => (
    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
      <SheetContent side="right" className="w-[280px] sm:w-[350px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-2 mt-6">
          <Button variant="ghost" className="justify-start" onClick={() => { handleSave(getNodes(), getEdges()); setIsMobileMenuOpen(false); }}>
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
          <Button variant="ghost" className="justify-start" onClick={() => { setIsSaveAsOpen(true); setIsMobileMenuOpen(false); }}>
            <FileSymlink className="mr-2 h-4 w-4" /> Save As...
          </Button>
          <Button variant="ghost" className="justify-start" onClick={() => { handleExport(); setIsMobileMenuOpen(false); }}>
            <FileDown className="mr-2 h-4 w-4" /> Export
          </Button>
          <div className="border-t my-2" />
          <DataTablesModal>
            <Button variant="ghost" className="justify-start w-full">
              <Database className="mr-2 h-4 w-4" /> Data Tables
            </Button>
          </DataTablesModal>
          <div className="border-t my-2" />
          <div className="flex items-center justify-between px-3 py-2">
            <Label htmlFor="mobile-edge-metrics" className="flex items-center gap-2 text-sm">
              <BarChartHorizontal className="h-4 w-4" />
              Edge Metrics
            </Label>
            <Switch
              id="mobile-edge-metrics"
              checked={showEdgeMetrics}
              onCheckedChange={setShowEdgeMetrics}
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <Label htmlFor="mobile-port-labels" className="flex items-center gap-2 text-sm">
              <CircleDot className="h-4 w-4" />
              Port Labels
            </Label>
            <Switch
              id="mobile-port-labels"
              checked={showPortLabels}
              onCheckedChange={setShowPortLabels}
            />
          </div>
          <div className="border-t my-2" />
          <Button variant="ghost" className="justify-start" onClick={() => { handleShare(); setIsMobileMenuOpen(false); }}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className={cn("h-full w-full relative flex flex-col")} ref={reactFlowWrapper}>
      {/* Main Header */}
      <header className={cn(
        "sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 backdrop-blur-md",
        "h-14 px-2 py-2 md:h-16 md:p-4"
      )}>
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          <Button variant="ghost" size="icon" asChild className={cn("h-9 w-9 md:h-10 md:w-10")}>
            <Link href="/workflows">
              <ArrowLeft className={cn("h-4 w-4 md:h-auto")} />
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-base md:text-lg font-semibold min-w-0 flex-1">
            {currentFolder && !isMobile ? (
              <>
                <Link href={`/workflows?folder=${currentFolder.id}`} className="text-muted-foreground hover:text-foreground transition-colors capitalize">
                    {currentFolder.name}
                </Link>
                <span className="text-muted-foreground">/</span>
              </>
            ) : null}
            {isEditingTitle ? (
              <Input
                value={workflowName}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                autoFocus
                className={cn("font-semibold", "text-sm h-8 md:text-lg md:h-9")}
              />
            ) : (
              <h1 
                className={cn(
                  "cursor-pointer truncate",
                  "text-sm max-w-[150px] md:text-base md:max-w-[300px]"
                )} 
                onClick={() => setIsEditingTitle(true)}
              >
                {workflowName}
              </h1>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {isMobile ? (
              <>
                <Image src="/assets/images/icon.png" alt="Nodify Logo" width={32} height={32} className="h-7 w-7" />
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setIsMobileMenuOpen(true)}>
                  <Menu className="h-4 w-4" />
                </Button>
              </>
            ) : (
                <Menubar className="border-none bg-transparent">
                  <MenubarMenu>
                    <MenubarTrigger asChild>
                       <Button variant="ghost" size="icon">
                        <Ellipsis />
                      </Button>
                    </MenubarTrigger>
                    <MenubarContent>
                      <MenubarItem onClick={() => handleSave(getNodes(), getEdges())}>
                        <Save className="mr-2" /> Save
                      </MenubarItem>
                      <MenubarItem onClick={() => setIsSaveAsOpen(true)}>
                        <FileSymlink className="mr-2" /> Save As...
                      </MenubarItem>
                       <MenubarItem onClick={handleExport}>
                        <FileDown className="mr-2" /> Export
                      </MenubarItem>
                      <MenubarSeparator />
                      <Link href={`/workflows/${workflow.id}/executions`}>
                        <MenubarItem>
                          <Clock className="mr-2" /> Execution History
                        </MenubarItem>
                      </Link>
                      <DataTablesModal>
                        <MenubarItem onSelect={(e) => e.preventDefault()}>
                          <Database className="mr-2" /> Data Tables
                        </MenubarItem>
                      </DataTablesModal>
                      <MenubarSeparator />
                       <MenubarItem>
                          <div className="w-full flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                            <Label htmlFor="edge-metrics-toggle" className="flex items-center gap-2 cursor-pointer">
                              <BarChartHorizontal />
                              Show Edge Metrics
                            </Label>
                            <Switch
                              id="edge-metrics-toggle"
                              checked={showEdgeMetrics}
                              onCheckedChange={setShowEdgeMetrics}
                            />
                          </div>
                        </MenubarItem>
                        <MenubarItem>
                          <div className="w-full flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                            <Label htmlFor="port-labels-toggle" className="flex items-center gap-2 cursor-pointer">
                              <CircleDot />
                              Show Port Labels
                            </Label>
                            <Switch
                              id="port-labels-toggle"
                              checked={showPortLabels}
                              onCheckedChange={setShowPortLabels}
                            />
                          </div>
                        </MenubarItem>
                      <MenubarSeparator />
                      <MenubarItem onClick={handleShare}>
                        <Share2 className="mr-2" /> Share
                      </MenubarItem>
                    </MenubarContent>
                  </MenubarMenu>
                </Menubar>
            )}
        </div>
      </header>

      <div className={cn("flex-1 touch-none", "pb-0 md:pb-0")}>
        <ReactFlow
            nodes={nodesWithHandlers}
            edges={edgesWithHandlers}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeContextMenu={onEdgeContextMenu}
            onPaneContextMenu={onPaneContextMenu}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onPaneClick={handlePaneClick}
            className="select-none"
            defaultViewport={savedViewport ? savedViewport : { x: 0, y: 0, zoom: isMobile ? 0.6 : 0.9 }}
            proOptions={{ hideAttribution: true }}
            selectionMode={isSelectionModeActive ? SelectionMode.Partial : SelectionMode.Full}
            selectionOnDrag={isSelectionModeActive}
            minZoom={isMobile ? 0.3 : 0.5}
            maxZoom={isMobile ? 2 : 2.5}
            panOnScroll={!isMobile}
            zoomOnScroll={!isMobile}
            deleteKeyCode={[]}
            panOnDrag={!isSelectionModeActive}
            preventScrolling={isMobile}
        >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={isMobile ? 16 : 24} 
              size={1} 
              color="hsl(var(--border))" 
            />

            {nodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <button
                  onClick={() => setIsPaletteOpen(true)}
                  className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors pointer-events-auto"
                >
                  <div className={cn(
                    "flex items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/50",
                    "h-16 w-16 md:h-24 md:w-24"
                  )}>
                    <Plus className={cn("h-8 w-8 md:h-10 md:w-10")} />
                  </div>
                  <span className={cn("text-sm md:text-base")}>Add first step...</span>
                </button>
              </div>
            )}
            
            <Panel position="bottom-left" className="!bottom-4 !left-1/2 !-translate-x-1/2 md:!left-4 md:!translate-x-0">
                <TooltipProvider>
                    <AnimatePresence>
                    {isEditModeOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                                "flex items-center gap-1 bg-card rounded-xl shadow-lg border mb-2",
                                "p-1.5 flex-wrap max-w-[300px] md:p-1"
                            )}
                        >
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant={isSelectionModeActive ? "secondary" : "ghost"} size="icon" onClick={() => setSelectionModeActive(prev => !prev)} className={cn("h-10 w-10")}>
                                    <MousePointerSquareDashed className={cn("h-5 w-5")} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Selection Mode</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={handleCopy} className={cn("h-10 w-10")}>
                                        <Copy className={cn("h-5 w-5")} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Copy (Ctrl+C)</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handlePaste(lastMousePosition)} className={cn("h-10 w-10")}>
                                        <FileSymlink className={cn("h-5 w-5")} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Paste (Ctrl+V)</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={handleDuplicate} className={cn("h-10 w-10")}>
                                        <CopyPlus className={cn("h-5 w-5")} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Duplicate (Ctrl+D)</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className={cn("text-destructive hover:text-destructive", "h-10 w-10")} onClick={handleDelete}>
                                    <Trash2 className={cn("h-5 w-5")} />
                                </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Delete (Del)</p></TooltipContent>
                            </Tooltip>
                            {isMobile && (
                                <>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={handleUndo} disabled={undoStack.length === 0} className="h-10 w-10">
                                            <Undo className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Undo (Ctrl+Z)</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={handleRedo} disabled={redoStack.length === 0} className="h-10 w-10">
                                            <Redo className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Redo (Ctrl+Y)</p></TooltipContent>
                                </Tooltip>
                                </>
                            )}
                        </motion.div>
                    )}
                    </AnimatePresence>
                    <div className={cn(
                        "flex items-center gap-1 bg-card rounded-xl shadow-lg border",
                        "p-1.5 md:p-1"
                    )}>
                        {!isMobile && (
                            <>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => fitView()}>
                                    <Maximize2 />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Fit to View</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={handleUndo} disabled={undoStack.length === 0}>
                                        <Undo />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Undo (Ctrl+Z)</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={handleRedo} disabled={redoStack.length === 0}>
                                        <Redo />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Redo (Ctrl+Y)</p></TooltipContent>
                            </Tooltip>

                            <div className="h-6 w-px bg-border mx-1" />
                            </>
                        )}

                        {/* Zoom controls - Hidden on mobile */}
                        <div className="hidden md:flex md:items-center md:gap-1">
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={handleZoomOut} className={cn("h-10 w-10")}>
                                  <Minus className={cn("h-5 w-5")} />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Zoom Out</p></TooltipContent>
                          </Tooltip>
                          <div className={cn(
                          "font-mono tabular-nums text-muted-foreground text-center",
                          "text-sm w-12 md:w-16"
                          )}>
                          {Math.round((zoomLevel / baseZoom) * 100)}%
                          </div>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={handleZoomIn} className={cn("h-10 w-10")}>
                                  <Plus className={cn("h-5 w-5")} />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Zoom In</p></TooltipContent>
                          </Tooltip>

                          <div className={cn("h-6 w-px bg-border", "mx-0.5 md:mx-1")} />
                        </div>
                        {/* Edit Mode Button - Hidden on mobile */}
                        <div className="hidden md:block">
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <Button variant={isEditModeOpen ? "secondary" : "ghost"} size="icon" onClick={() => setEditModeOpen(prev => !prev)} className={cn("h-10 w-10")}>
                               <MousePointerSquareDashed className={cn("h-5 w-5")} />
                             </Button>
                           </TooltipTrigger>
                           <TooltipContent>
                             <p>Toggle Edit Tools</p>
                           </TooltipContent>
                         </Tooltip>
                        </div>

                        {/* Toggle Second Navbar Button - Only visible on mobile */}
                        <div className="md:hidden">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={isSecondNavbarOpen ? "secondary" : "ghost"}
                                size="icon"
                                onClick={() => setIsSecondNavbarOpen(prev => !prev)}
                                className={cn("h-10 w-10")}
                              >
                                <Ellipsis className={cn("h-5 w-5")} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>More Options</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        {/* Logs Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setIsLogsModalOpen(true)}
                              className={cn("h-10 w-10 relative")}
                            >
                              <Terminal className={cn("h-5 w-5")} />
                              {Object.keys(executionData).length > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full text-[10px] font-semibold flex items-center justify-center text-primary-foreground">
                                  {Object.keys(executionData).length}
                                </span>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Execution Logs</p>
                          </TooltipContent>
                        </Tooltip>

                        {/* Run / Stop / Restart / Chat Buttons */}
                        {(() => {
                          // Check if workflow has a chat trigger
                          const chatNode = nodes.find(n => n.data.type === 'chat_trigger');
                          const hasChatTrigger = !!chatNode;

                          if (currentExecutionId || executingNodes.size > 0) {
                            return (
                              <>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="secondary"
                                            className={cn("bg-destructive/80 hover:bg-destructive rounded-lg", "h-10 w-10")}
                                            onClick={handleStopWorkflow}
                                        >
                                            <StopCircle className={cn("h-5 w-5")} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Stop Workflow</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="secondary"
                                            className={cn("bg-secondary hover:bg-secondary/80 rounded-lg", "h-10 w-10")}
                                            onClick={handleRestartWorkflow}
                                        >
                                            <RotateCcw className={cn("h-5 w-5")} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Restart Workflow</p></TooltipContent>
                                </Tooltip>
                              </>
                            );
                          } else if (hasChatTrigger) {
                            // Show Chat button instead of Run
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className={cn("bg-primary/80 hover:bg-primary rounded-lg", "h-10 w-10")}
                                    onClick={() => setIsChatModalOpen(true)}
                                  >
                                    <MessageCircle className={cn("h-5 w-5")} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Open Chat</p></TooltipContent>
                              </Tooltip>
                            );
                          } else {
                            // Normal Run button
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className={cn("bg-primary/80 hover:bg-primary rounded-lg", "h-10 w-10")}
                                    onClick={() => handleRunWorkflow()}
                                  >
                                    <Play className={cn("h-5 w-5")} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Run Workflow</p></TooltipContent>
                              </Tooltip>
                            );
                          }
                        })()}

                        {/* Add Node Button - Solo visible en móvil */}
                        <div className="md:hidden flex items-center gap-1">
                          <div className={cn("h-6 w-px bg-border")} />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="default"
                                onClick={() => setIsPaletteOpen(true)}
                                className={cn("bg-primary hover:bg-primary/90 rounded-lg", "h-10 w-10")}
                              >
                                <Plus className={cn("h-5 w-5")} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Add Node</p></TooltipContent>
                          </Tooltip>
                        </div>
                    </div>
                </TooltipProvider>
            </Panel>

            {/* Second navbar for mobile - Edit Tools and Zoom Controls */}
            {isSecondNavbarOpen && (
            <Panel position="bottom-center" className="md:hidden !bottom-[5.5rem]">
                <TooltipProvider>
                    <div className={cn(
                        "flex flex-col gap-1 bg-card rounded-xl shadow-lg border",
                        "p-1.5"
                    )}>
                        {/* First Row: Select, Copy, Paste, Duplicate, Delete */}
                        <div className="flex items-center gap-1">
                            {/* Select */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    // Select all nodes
                                    const allNodes = nodes.map(n => n.id);
                                    setNodes(nodes.map(n => ({ ...n, selected: true })));
                                  }}
                                  className={cn("h-9 w-9")}
                                >
                                  <MousePointerClick className={cn("h-4 w-4")} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Select All</p></TooltipContent>
                            </Tooltip>

                            {/* Copy */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={handleCopy}
                                  disabled={nodes.filter(n => n.selected).length === 0}
                                  className={cn("h-9 w-9")}
                                >
                                  <Copy className={cn("h-4 w-4")} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Copy</p></TooltipContent>
                            </Tooltip>

                            {/* Paste */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    // Get viewport center
                                    const { x, y, zoom } = reactFlowInstance.getViewport();
                                    const centerX = -x / zoom + (window.innerWidth / 2) / zoom;
                                    const centerY = -y / zoom + (window.innerHeight / 2) / zoom;
                                    handlePaste({ x: centerX, y: centerY });
                                  }}
                                  className={cn("h-9 w-9")}
                                >
                                  <Clipboard className={cn("h-4 w-4")} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Paste</p></TooltipContent>
                            </Tooltip>

                            {/* Duplicate */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={handleDuplicate}
                                  disabled={nodes.filter(n => n.selected).length === 0}
                                  className={cn("h-9 w-9")}
                                >
                                  <CopyPlus className={cn("h-4 w-4")} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Duplicate</p></TooltipContent>
                            </Tooltip>

                            {/* Delete */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={handleDelete}
                                  disabled={nodes.filter(n => n.selected).length === 0}
                                  className={cn("h-9 w-9")}
                                >
                                  <Trash2 className={cn("h-4 w-4")} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Delete</p></TooltipContent>
                            </Tooltip>
                        </div>

                        {/* Second Row: Undo, Zoom Out, Zoom %, Zoom In, Redo */}
                        <div className="flex items-center gap-1">
                            {/* Undo */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {/* TODO: Implement undo */}}
                                  className={cn("h-9 w-9")}
                                >
                                  <Undo className={cn("h-4 w-4")} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Undo</p></TooltipContent>
                            </Tooltip>

                            {/* Zoom Out */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={handleZoomOut} className={cn("h-9 w-9")}>
                                    <Minus className={cn("h-4 w-4")} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Zoom Out</p></TooltipContent>
                            </Tooltip>

                            {/* Zoom Level Display */}
                            <div className={cn(
                            "font-mono tabular-nums text-muted-foreground text-center",
                            "text-xs w-12"
                            )}>
                            {Math.round((zoomLevel / baseZoom) * 100)}%
                            </div>

                            {/* Zoom In */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={handleZoomIn} className={cn("h-9 w-9")}>
                                    <Plus className={cn("h-4 w-4")} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Zoom In</p></TooltipContent>
                            </Tooltip>

                            {/* Redo */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {/* TODO: Implement redo */}}
                                  className={cn("h-9 w-9")}
                                >
                                  <Redo className={cn("h-4 w-4")} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Redo</p></TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </TooltipProvider>
            </Panel>
            )}

            <Panel position="bottom-right" className="!bottom-4 !right-4 hidden md:block">
                <Button
                    size="icon"
                    variant="default"
                    onClick={() => setIsPaletteOpen(true)}
                    className={cn(
                        "rounded-full shadow-lg",
                        "!h-12 !w-12 md:!h-14 md:!w-14"
                    )}
                >
                    <Plus className={cn("h-5 w-5 md:h-6 md:w-6")} />
                </Button>
            </Panel>

            {contextMenu && (
            <div
                style={{
                position: 'absolute',
                top: contextMenu.top,
                left: contextMenu.left,
                zIndex: 10,
                }}
                className="min-w-[180px] rounded-xl border bg-popover text-popover-foreground shadow-md"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex flex-col gap-1 p-2">
                {contextMenu.type === 'pane' && (
                    <>
                        <Button variant="ghost" className="justify-start" onClick={() => handleMenuAction('add')}>
                            <GitBranchPlus className="mr-2" />
                            Add Node
                        </Button>
                        <Button variant="ghost" className="justify-start" onClick={() => handleMenuAction('paste')}>
                            <Copy className="mr-2" />
                            Paste
                        </Button>
                    </>
                )}
                {contextMenu.type === 'node' && (
                    <>
                    {(() => {
                      const node = contextMenu?.id ? getNode(contextMenu.id) : null;
                      const nodeDef = node ? getNodeDefinition((node as any).data?.type) : null;
                      const isChat = nodeDef?.id === 'chat_trigger';
                      const isForm = nodeDef?.id === 'form_submit_trigger';
                      const label = isChat ? 'Open Chat' : isForm ? 'Open Form' : 'Execute up to here';
                      return (
                        <Button variant="ghost" className="justify-start" onClick={() => handleMenuAction('run_up_to')}>
                          <Play className="mr-2" />
                          {label}
                        </Button>
                      );
                    })()}
                    <Button variant="ghost" className="justify-start" onClick={() => handleMenuAction('edit')}>
                        <Edit className="mr-2" />
                        Properties
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={() => handleMenuAction('copy')}>
                        <Copy className="mr-2" />
                        Copy
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={() => handleMenuAction('duplicate')}>
                        <FileSymlink className="mr-2" />
                        Duplicate
                    </Button>
                    </>
                )}
                {contextMenu.type === 'edge' && (
                    <Button variant="ghost" className="justify-start" onClick={() => handleMenuAction('insert')}>
                    <GitBranchPlus className="mr-2" />
                    Insert Node
                    </Button>
                )}
                {(contextMenu.type === 'node' || contextMenu.type === 'edge') && (
                    <Button variant="ghost" className="justify-start text-destructive hover:text-destructive" onClick={() => handleMenuAction('delete')}>
                        <Trash2 className="mr-2" />
                        Delete
                    </Button>
                )}
                </div>
            </div>
            )}
        </ReactFlow>
      </div>

      <NodePalette
        onAddNode={addNode}
        isOpen={isPaletteOpen}
        setIsOpen={setIsPaletteOpen}
        hasTriggerNode={nodes.some(n => {
          const def = getNodeDefinition(n.data.type);
          return def && def.category === 'trigger';
        })}
        sourceNodeId={sourceForNodeCreation?.sourceNodeId}
        nodes={nodes}
      />

      <NodeSettings
        isOpen={isSettingsOpen}
        node={selectedNodeData}
        allNodes={nodes}
        allEdges={edges}
        onClose={() => setIsSettingsOpen(false)}
        onUpdate={handleUpdateNode}
        executionData={executionData}
        executionContext={executionContext}
        workflowId={workflow.id}
      />
      
      <SaveAsDialog
        isOpen={isSaveAsOpen}
        onClose={() => setIsSaveAsOpen(false)}
        onSave={handleSaveAs}
        currentName={workflowName}
      />

      {/* Chat Modal for test mode */}
      {(() => {
        const chatNode = nodes.find(n => n.data.type === 'chat_trigger');
        if (chatNode && chatNode.data.config) {
          const config = chatNode.data.config;
          return (
            <ChatModal
              isOpen={isChatModalOpen}
              onClose={() => setIsChatModalOpen(false)}
              chatId={config.chatId || 'not_generated'}
              chatName={config.chatName || 'Assistant'}
              welcomeMessage={config.welcomeMessage || 'Hello! How can I help you today?'}
              placeholder={config.placeholder || 'Type your message...'}
              primaryColor={config.primaryColor || '#8B5CF6'}
              mode="test"
              sessionId="test_session"
              workflowId={workflow.id}
              userId={user?.uid}
              workflowSnapshot={{
                id: workflow.id,
                name: workflowName,
                status: workflow.status || 'draft',
                nodes: workflow.nodes || [],
                connections: workflow.connections || []
              }}
              onTestMessage={handleTestChatMessage}
              enableMessageLimit={config.enableMessageLimit || false}
              maxMessages={config.maxMessages || 10}
              messageLimitExceededAction={config.messageLimitExceededAction || 'auto_restart'}
              predefinedResponseMessage={config.predefinedResponseMessage || 'You have reached the message limit for this chat. Please restart the conversation or open a new chat.'}
            />
          );
        }
        return null;
      })()}

      {/* Workflow Logs Modal */}
      <WorkflowLogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        executionData={executionData}
        nodes={nodes.map(n => n.data)}
      />

      {isMobile && <MobileMenu />}
    </div>
  );
}

export function WorkflowEditor({ workflowId, folders }: { workflowId: string, folders: Folder[] }) {
  const { user } = useUser();
  const firestore = useFirestore();

  const workflowDocRef = useMemo(() => {
    if (!user || !workflowId) return null;
    return doc(firestore, 'users', user.uid, 'workflows', workflowId);
  }, [user, workflowId, firestore]);
  const { data: workflow, isLoading: isWorkflowLoading } = useDoc<Workflow>(workflowDocRef);
  

  if (isWorkflowLoading) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-12 h-full">
            <LoaderCircle className="h-12 w-12 text-muted-foreground animate-spin" />
            <h3 className="mt-4 text-lg font-semibold">Loading Workflow...</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                Just a moment while we get the canvas ready.
            </p>
        </div>
    );
  }

  if (!workflow) {
    return notFound();
  }
  
  const fullWorkflowData = { ...workflow, id: workflowId };


  return (
    <div className="flex flex-col h-full w-full select-none">
      <main className="flex-1">
        <ReactFlowProvider>
          <EditorCanvas workflow={fullWorkflowData} folders={folders} />
        </ReactFlowProvider>
      </main>
    </div>
  );
}
