
'use client';

import { cn } from '@/lib/utils';
import React, { memo, useRef, useCallback, useMemo } from 'react';
import { Handle, Position, NodeProps, useEdges, useReactFlow } from 'reactflow';
import { getNodeDefinition, getNodeIcon, getNodeOutputs } from '@/lib/nodes';
import { Zap, Plus, LoaderCircle, XCircle } from 'lucide-react';
import { CustomNode as CustomNodeDef, CustomNodePort } from '@/lib/custom-nodes-types';
import type { NodeData, NodeShape } from '@/lib/types';
import { parseShape, getMaxSlotsForPosition } from '@/lib/slot-system';

const CustomHandle = ({ port, type, isConnectable, style }: { port: CustomNodePort, type: 'input' | 'output', isConnectable: boolean, style?: React.CSSProperties }) => {
  const position = port.position as Position;

  // Input handles: rectangle with primary fill (orientation depends on position)
  // Output handles: circle with border
  const isInput = type === 'input';

  // Determine handle dimensions based on position
  // Left/Right: vertical rectangle (4px wide, 16px tall)
  // Top/Bottom: horizontal rectangle (16px wide, 4px tall)
  const isVerticalPosition = position === Position.Left || position === 'left' ||
                              position === Position.Right || position === 'right';

  const handleWidth = isInput
    ? (isVerticalPosition ? 4 : 16)  // Vertical: 4px wide, Horizontal: 16px wide
    : 12; // Output handles are always circles

  const handleHeight = isInput
    ? (isVerticalPosition ? 16 : 4)  // Vertical: 16px tall, Horizontal: 4px tall
    : 12; // Output handles are always circles

  return (
    <Handle
      type={type === 'input' ? 'target' : 'source'}
      position={position}
      id={port.id}
      style={{
        width: handleWidth,
        height: handleHeight,
        background: isInput ? 'hsl(var(--primary))' : 'hsl(var(--background))',
        border: isInput ? 'none' : '2px solid hsl(var(--primary))',
        borderRadius: isInput ? '2px' : '50%',
        ...style,
      }}
      isConnectable={isConnectable}
    />
  );
};

const AddNodeButton = ({ node, port, style }: { node: NodeProps<NodeData>['data'], port: CustomNodePort, style?: React.CSSProperties }) => {
    const { setNodes, setEdges, project } = useReactFlow();

    const onButtonClick = () => {
      if (node.onAddNode) {
        node.onAddNode({ sourceNodeId: node.id, sourceHandleId: port.id });
      }
    };

    // Determine position and styling based on port position
    const getPositionStyles = () => {
      const buttonSize = 20; // h-5 w-5
      const lineLength = 16; // Length of connecting line (increased from 12)
      const offset = 8; // Distance from node edge (increased from 6)

      // Support both Position enum and string values
      const pos = port.position;

      switch (pos) {
        case Position.Right:
        case 'right':
          return {
            container: `absolute left-full flex items-center`,
            containerStyle: { marginLeft: `${offset}px`, ...style },
            line: `h-px bg-primary/50`,
            lineStyle: { width: `${lineLength}px` },
            buttonClass: 'ml-0',
          };
        case Position.Left:
        case 'left':
          return {
            container: `absolute right-full flex items-center flex-row-reverse`,
            containerStyle: { marginRight: `${offset}px`, ...style },
            line: `h-px bg-primary/50`,
            lineStyle: { width: `${lineLength}px` },
            buttonClass: 'mr-0',
          };
        case Position.Bottom:
        case 'bottom':
          return {
            container: `absolute top-full flex flex-col items-center`,
            containerStyle: { marginTop: `${offset}px`, ...style },
            line: `w-px bg-primary/50`,
            lineStyle: { height: `${lineLength}px` },
            buttonClass: 'mt-0',
          };
        case Position.Top:
        case 'top':
          return {
            container: `absolute bottom-full flex flex-col-reverse items-center`,
            containerStyle: { marginBottom: `${offset}px`, ...style },
            line: `w-px bg-primary/50`,
            lineStyle: { height: `${lineLength}px` },
            buttonClass: 'mb-0',
          };
        default:
          return {
            container: `absolute left-full flex items-center`,
            containerStyle: { marginLeft: `${offset}px`, ...style },
            line: `h-px bg-primary/50`,
            lineStyle: { width: `${lineLength}px` },
            buttonClass: 'ml-0',
          };
      }
    };

    const positionStyles = getPositionStyles();

    return (
      <div
        className={positionStyles.container}
        style={positionStyles.containerStyle}
      >
        <div className={positionStyles.line} style={positionStyles.lineStyle}></div>
        <button
          onClick={onButtonClick}
          className={`nodrag nopan flex items-center justify-center h-5 w-5 rounded-md border border-primary/60 bg-background hover:bg-primary/10 text-primary/70 hover:text-primary transition-all hover:scale-110 ${positionStyles.buttonClass}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };

const CustomNode = ({ data, isConnectable, selected, dragging }: NodeProps<NodeData & { onLongPress?: (id: string, event?: any) => void, onDoubleClick?: (event: any, node: any) => void, onDoubleClickNode?: (event: any, id: string) => void, onAddNode: (params: {sourceNodeId: string, sourceHandleId: string}) => void, isExecuting?: boolean, isCompleted?: boolean | undefined, isError?: boolean | undefined, showPortLabels?: boolean | undefined }>) => {

  // Check for Node Labs preview node first
  const previewNode = typeof window !== 'undefined' ? (window as any).__NODELABS_PREVIEW_NODE__ : null;
  const definition = (previewNode && data.id === 'preview-node' ? previewNode : getNodeDefinition(data.type as any)) as CustomNodeDef;

  // Memoize border color calculation
  const borderColor = useMemo(() => {
    if (data.isExecuting) return 'hsl(var(--info))';
    if (data.isCompleted && !data.isError) return 'hsl(var(--success))';
    if (data.isError) return 'hsl(var(--error))';
    if (selected) return 'hsl(var(--primary))';
    return 'hsl(var(--muted))';
  }, [data.isExecuting, data.isCompleted, data.isError, selected]);

  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const hasMoved = useRef<boolean>(false);
  const lastTapTime = useRef<number>(0);

  const edges = useEdges();

  // Handle pointer up - For detecting double-click without interfering with drag
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // Only process if user didn't move (not a drag)
    if (hasMoved.current) return;

    // Check for double tap/click
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime.current;

    if (timeSinceLastTap < 350 && timeSinceLastTap > 0) {
      // This is the SECOND click in a double-click sequence
      e.preventDefault();
      e.stopPropagation();

      if (data.onDoubleClickNode) {
        lastTapTime.current = 0; // Reset tap time
        data.onDoubleClickNode(e, data.id); // Fire double-click handler with nodeId
        return;
      }
    }

    lastTapTime.current = now;

  }, [data]);

  // Handle pointer down - Track movement for drag detection
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    touchStartPos.current = { x: e.clientX, y: e.clientY };
    hasMoved.current = false;
  }, []);

  // Handle pointer move - Detect if user is dragging
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!touchStartPos.current) return;

    const deltaX = Math.abs(e.clientX - touchStartPos.current.x);
    const deltaY = Math.abs(e.clientY - touchStartPos.current.y);

    if (deltaX > 5 || deltaY > 5) {
      hasMoved.current = true;
    }
  }, []);






  if (!definition) return null;



  const Icon = getNodeIcon(definition);



  const inputs = definition.inputs || [];

  // Use getNodeOutputs to handle dynamic outputs
  const outputs = useMemo(() => {
    return getNodeOutputs(definition, data.config);
  }, [definition, data.config]);



  // Memoize connection check to prevent unnecessary re-renders

  const connectedOutputs = useMemo(() => {

    const connected = new Set<string>();

    edges.forEach(edge => {

      if (edge.source === data.id && edge.sourceHandle) {

        connected.add(edge.sourceHandle);

      }

    });

    return connected;

  }, [edges, data.id]);



  const isOutputConnected = (handleId: string) => {

    return connectedOutputs.has(handleId);

  };



  const isWebhookTestListening = data.isExecuting && definition.id === 'webhook_trigger';



  // Calculate if node has bottom outputs to adjust label position
  const hasBottomOutputs = useMemo(() => {
    return outputs.some(port => port.position === Position.Bottom || port.position === 'bottom');
  }, [outputs]);

  // Calculate effective shape based on dynamic outputs
  const effectiveShape = useMemo(() => {
    // If not using dynamic outputs, return original shape
    if (!definition.dynamicOutputs?.enabled) {
      return definition.shape;
    }

    // Calculate the number of right-positioned outputs (most common case)
    const rightOutputs = outputs.filter(port =>
      port.position === Position.Right || port.position === 'right'
    ).length;

    // Parse the current shape to get width
    const [widthStr, heightStr] = (definition.shape as string).split('x');
    const width = widthStr === 'circle' ? '2' : widthStr;

    // Calculate new height based on outputs (minimum 2, maximum 6)
    const newHeight = Math.min(Math.max(rightOutputs, 2), 6);

    return `${width}x${newHeight}` as NodeShape;
  }, [definition.shape, definition.dynamicOutputs, outputs]);

  

  const nodeBody = (
  <div className="flex flex-col items-center justify-center select-none">
    <div
      className={cn(
        "relative flex flex-col items-center justify-center",
        !dragging && "transition-all duration-200 ease-out",
        "bg-[hsl(var(--card))]/75 border-2 backdrop-blur-sm",

        // Estado de ejecución - animación suave de breathing
        data.isExecuting && "node-breathing",
        {
          "rounded-xl": true, // bordes suaves para todos
          "rounded-full aspect-square w-24 h-24": effectiveShape === "circle",

          // tamaños base W×H
          "w-20 h-16": effectiveShape === "1x1",
          "w-28 h-16": effectiveShape === "2x1",
          "w-36 h-16": effectiveShape === "3x1",
          "w-44 h-16": effectiveShape === "4x1",
          "w-52 h-16": effectiveShape === "5x1",
          "w-60 h-16": effectiveShape === "6x1",

          "w-20 h-24": effectiveShape === "1x2",
          "w-28 h-24": effectiveShape === "2x2",
          "w-36 h-24": effectiveShape === "3x2",
          "w-44 h-24": effectiveShape === "4x2",
          "w-52 h-24": effectiveShape === "5x2",
          "w-60 h-24": effectiveShape === "6x2",

          "w-20 h-32": effectiveShape === "1x3",
          "w-28 h-32": effectiveShape === "2x3",
          "w-36 h-32": effectiveShape === "3x3",
          "w-44 h-32": effectiveShape === "4x3",
          "w-52 h-32": effectiveShape === "5x3",
          "w-60 h-32": effectiveShape === "6x3",

          "w-20 h-40": effectiveShape === "1x4",
          "w-28 h-40": effectiveShape === "2x4",
          "w-36 h-40": effectiveShape === "3x4",
          "w-44 h-40": effectiveShape === "4x4",
          "w-52 h-40": effectiveShape === "5x4",
          "w-60 h-40": effectiveShape === "6x4",

          "w-20 h-48": effectiveShape === "1x5",
          "w-28 h-48": effectiveShape === "2x5",
          "w-36 h-48": effectiveShape === "3x5",
          "w-44 h-48": effectiveShape === "4x5",
          "w-52 h-48": effectiveShape === "5x5",
          "w-60 h-48": effectiveShape === "6x5",

          "w-20 h-56": effectiveShape === "1x6",
          "w-28 h-56": effectiveShape === "2x6",
          "w-36 h-56": effectiveShape === "3x6",
          "w-44 h-56": effectiveShape === "4x6",
          "w-52 h-56": effectiveShape === "5x6",
          "w-60 h-56": effectiveShape === "6x6",
        }
      )}
      style={{
        borderColor,
        willChange: dragging ? 'transform' : 'auto',
      }}
    >
      {/* Indicador de trigger en la esquina superior izquierda
      {definition.category === 'trigger' && (
        <Zap className="absolute top-2 left-2 h-3 w-3" style={{ color: 'hsl(var(--warning))', fill: 'hsl(var(--warning))' }} />
      )}*/}

      {definition.category === 'trigger' && (
        <Zap
          className={cn(
            'absolute',
            definition.shape === 'circle' ? 'h-3 w-3' : 'top-2 left-2 h-3 w-3'
          )}
          style={{
            color: 'hsl(var(--warning))',
            fill: 'hsl(var(--warning))',
            ...(definition.shape === 'circle' && {
              top: '10%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }),
          }}
        />
      )}


      {/* Indicador de estado en la esquina superior derecha */}
      {data.isExecuting && (
        <LoaderCircle className="absolute top-2 right-2 h-4 w-4 animate-spin" style={{ color: 'hsl(var(--info))' }} />
      )}
      {data.isError && (
        <XCircle className="absolute top-2 right-2 h-4 w-4" style={{ color: 'hsl(var(--error))' }} />
      )}

      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[hsl(var(--background))]">
        <Icon
          className="h-6 w-6 object-contain"
          style={{ color: definition.color || "hsl(var(--primary))" }}
        />
      </div>

    </div>

    {/* ✅ Nombre externo (solo debajo del nodo) - Ajustado para evitar superposición con puertos/botones bottom */}
    <div
      className={cn(
        "text-sm font-semibold text-[hsl(var(--foreground))] truncate max-w-[9rem] text-center",
        hasBottomOutputs ? "mt-10" : "mt-2"
      )}
    >
      {data.label || definition.name || "Untitled"}
    </div>
  </div>
);


  // Group handles by position

  const handlesByPosition = useMemo(() => {

    const grouped: { [key in Position]?: CustomNodePort[] } = {};

    [...inputs, ...outputs].forEach(port => {

      if (!grouped[port.position as Position]) {

        grouped[port.position as Position] = [];

      }

      grouped[port.position as Position]?.push(port);

    });

    return grouped;

  }, [inputs, outputs]);



  // Calculate dynamic style for handles based on slot system (same as Node Labs preview)
  const getHandleStyle = useCallback((port: CustomNodePort): React.CSSProperties => {
    const shape = (definition.shape || '2x2') as NodeShape;
    const maxSlots = getMaxSlotsForPosition(shape, port.position as any);

    // Get the slot number (default to 1 if not specified)
    const slot = port.slot || 1;

    // Calculate position as percentage
    // Formula: (slot / (maxSlots + 1)) * 100
    // This creates even spacing with padding on edges
    const offset = `${(slot / (maxSlots + 1)) * 100}%`;

    let style: React.CSSProperties = {};

    // Use Position enum for comparison
    switch (port.position) {
      case Position.Top:
      case 'top':
        style = { left: offset, transform: 'translateX(-50%)' };
        break;
      case Position.Bottom:
      case 'bottom':
        style = { left: offset, transform: 'translateX(-50%)' };
        break;
      case Position.Left:
      case 'left':
        style = { top: offset, transform: 'translateY(-50%)' };
        break;
      case Position.Right:
      case 'right':
        style = { top: offset, transform: 'translateY(-50%)' };
        break;
    }

    return style;
  }, [definition.shape]);



    // Helper to determine if a port label should be shown
    // Hide default "Input" labels for input ports and "Output" labels for output ports
    const shouldShowPortLabel = useCallback((port: CustomNodePort, portType: 'input' | 'output'): boolean => {
      if (!port.label || data.showPortLabels === false) return false;

      const label = port.label.trim();

      // Hide default labels
      if (portType === 'input' && label === 'Input') return false;
      if (portType === 'output' && label === 'Output') return false;

      // Show all custom labels
      return true;
    }, [data.showPortLabels]);

    const getLabelStyle = useCallback((port: CustomNodePort): React.CSSProperties => {
      const baseStyle: React.CSSProperties = {
        position: 'absolute',
        fontSize: '0.7rem',
        fontWeight: 600,
        color: 'hsl(var(--foreground))',
        opacity: 0.75,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        zIndex: 10,
        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
      };

      const handleOffsetStyle = getHandleStyle(port);
      const pos = port.position;

      // Count ports in the same position to determine spacing
      const portsInSamePosition = handlesByPosition[pos as Position]?.length || 1;

      // Calculate vertical offset for side labels to avoid overlapping with handles and buttons
      // More ports = labels need to move further up
      // Account for: port handle (~16px height) + button area (~44px from edge)
      const sideVerticalOffset = portsInSamePosition > 2 ? '-14px' : portsInSamePosition > 1 ? '-12px' : '-10px';

      // Calculate offset for top/bottom labels
      // Account for [+] button which is ~44px from node edge (16px line + 8px offset + 20px button)
      const topBottomOffset = portsInSamePosition > 1 ? '50px' : '44px';

      switch (pos) {
        case Position.Left:
        case 'left':
          // Left labels: move up to avoid port handles, increase horizontal distance
          return {
            ...baseStyle,
            top: `calc(${handleOffsetStyle.top} + ${sideVerticalOffset})`,
            left: '-24px',
            transform: 'translate(-100%, -35%)'
          };
        case Position.Right:
        case 'right':
          // Right labels: move up to avoid port handles and [+] buttons, increase horizontal distance
          return {
            ...baseStyle,
            top: `calc(${handleOffsetStyle.top} + ${sideVerticalOffset})`,
            right: '-10px', // Increase distance to clear [+] button
            transform: 'translate(100%, -100%)'
          };
        case Position.Top:
        case 'top':
          // Top labels: position above the [+] button
          return {
            ...baseStyle,
            left: handleOffsetStyle.left,
            top: `-${topBottomOffset}`,
            transform: 'translate(-50%, 100%)'
          };
        case Position.Bottom:
        case 'bottom':
          // Bottom labels: position below the [+] button
          return {
            ...baseStyle,
            left: handleOffsetStyle.left,
            bottom: `-${topBottomOffset}`,
            transform: 'translate(-50%, 100%)'
          };
        default:
          return baseStyle;
      }
    }, [getHandleStyle, handlesByPosition]);



  return (

    <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={cn("select-none transition-all duration-150 relative flex flex-col items-center gap-2", selected ? "z-20" : "z-10")}

    >

      {nodeBody}   

            {/* Render Inputs */}
            {handlesByPosition[Position.Left]?.map((port) => (
              <React.Fragment key={`in-frag-${port.id}`}>
                <CustomHandle
                  port={port}
                  type="input"
                  isConnectable={isConnectable}
                  style={getHandleStyle(port)}
                />
                {shouldShowPortLabel(port, 'input') && <span style={getLabelStyle(port)}>{port.label}</span>}
              </React.Fragment>
            ))}

            {handlesByPosition[Position.Top]?.map((port) => (
              <React.Fragment key={`in-frag-${port.id}`}>
                <CustomHandle
                  port={port}
                  type="input"
                  isConnectable={isConnectable}
                  style={getHandleStyle(port)}
                />
                {shouldShowPortLabel(port, 'input') && <span style={getLabelStyle(port)}>{port.label}</span>}
              </React.Fragment>
            ))}

            {handlesByPosition[Position.Bottom]?.map((port) => (
              <React.Fragment key={`in-bottom-frag-${port.id}`}>
                <CustomHandle
                  port={port}
                  type="input"
                  isConnectable={isConnectable}
                  style={getHandleStyle(port)}
                />
                {shouldShowPortLabel(port, 'input') && <span style={getLabelStyle(port)}>{port.label}</span>}
              </React.Fragment>
            ))}

      

            {/* Render Outputs */}
            {handlesByPosition[Position.Right]?.map((port) => (
              <React.Fragment key={`out-frag-${port.id}`}>
                <CustomHandle
                  port={port}
                  type="output"
                  isConnectable={isConnectable}
                  style={getHandleStyle(port)}
                />
                {shouldShowPortLabel(port, 'output') && <span style={getLabelStyle(port)}>{port.label}</span>}
                {!isOutputConnected(port.id) && (
                  <AddNodeButton node={data} port={port} style={getHandleStyle(port)} />
                )}
              </React.Fragment>
            ))}

            {handlesByPosition[Position.Bottom]?.map((port) => (
              <React.Fragment key={`out-bottom-frag-${port.id}`}>
                <CustomHandle
                  port={port}
                  type="output"
                  isConnectable={isConnectable}
                  style={getHandleStyle(port)}
                />
                {shouldShowPortLabel(port, 'output') && <span style={getLabelStyle(port)}>{port.label}</span>}
                {!isOutputConnected(port.id) && (
                  <AddNodeButton node={data} port={port} style={getHandleStyle(port)} />
                )}
              </React.Fragment>
            ))}

    </div>

  );

};



// Use memo with custom comparison to optimize performance
// Only re-render if critical props change (not connection state)
const arePropsEqual = (
  prevProps: NodeProps<NodeData>,
  nextProps: NodeProps<NodeData>
) => {
  // Always re-render if dragging state changes
  if (prevProps.dragging !== nextProps.dragging) return false;

  // Always re-render if selected state changes
  if (prevProps.selected !== nextProps.selected) return false;

  // Check if execution states changed
  if (
    prevProps.data.isExecuting !== nextProps.data.isExecuting ||
    prevProps.data.isCompleted !== nextProps.data.isCompleted ||
    prevProps.data.isError !== nextProps.data.isError
  ) return false;

  // Check if showPortLabels changed
  if ((prevProps.data as any).showPortLabels !== (nextProps.data as any).showPortLabels) return false;

  // Check if position changed (important for drag)
  if (
    prevProps.xPos !== nextProps.xPos ||
    prevProps.yPos !== nextProps.yPos
  ) return false;

  // Check if data changed (label, config, etc)
  if (prevProps.data.label !== nextProps.data.label) return false;
  if (prevProps.data.type !== nextProps.data.type) return false;

  // Otherwise, don't re-render (prevents re-renders from connection changes)
  return true;
};

export default memo(CustomNode, arePropsEqual);
