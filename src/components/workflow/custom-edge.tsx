
'use client';

import React, { MouseEvent } from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath } from 'reactflow';
import { Clock, List } from 'lucide-react';

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  let edgePath = '';
  let labelX = (sourceX + targetX) / 2;
  let labelY = (sourceY + targetY) / 2;

  if (data?.isLoopBack) {
    // Orthogonal clean back-edge: go out to an offset X, then vertical, then into target
    const offset = Math.min(sourceX, targetX) - 60; // go 60px to the left of the leftmost point
    edgePath = `M ${sourceX},${sourceY} L ${offset},${sourceY} L ${offset},${targetY} L ${targetX},${targetY}`;
    // place label near the bend
    labelX = offset;
    labelY = (sourceY + targetY) / 2;
  } else {
    const smooth = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
    edgePath = smooth[0];
    labelX = smooth[1];
    labelY = smooth[2];
  }

  const handleDoubleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (data.onDoubleClick) {
      data.onDoubleClick(event, { id, source: '', target: '', ...event });
    }
  };

  const hasMetrics = data.executionTime !== undefined || data.itemCount !== undefined;

  // Determinar el color y estilo del edge según el estado
  let edgeColor = 'hsl(var(--primary))';
  let edgeWidth = 2;
  let edgeOpacity = 0.6;
  let animated = false;

  if (data.isExecuting) {
    edgeColor = 'hsl(var(--info))'; // Azul durante ejecución
    edgeWidth = 3;
    edgeOpacity = 1;
    animated = true;
  } else if (data.isCompleted && !data.isError) {
    edgeColor = 'hsl(var(--success))'; // Verde al completar
    edgeWidth = 2.5;
    edgeOpacity = 0.9;
  } else if (data.isError) {
    edgeColor = 'hsl(var(--error))'; // Rojo en error
    edgeWidth = 2.5;
    edgeOpacity = 0.9;
  } else if (data.active) {
    edgeColor = 'hsl(var(--accent))';
    edgeWidth = 3;
    edgeOpacity = 1;
  }

  return (
    <>
      {/* Base edge path */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: edgeColor,
          strokeWidth: edgeWidth,
          opacity: edgeOpacity,
          transition: 'stroke 0.3s ease, stroke-width 0.3s ease, opacity 0.3s ease',
        }}
      />

      {/* Animated data flow overlay when executing */}
      {animated && !data?.isLoopBack && (
        <>
          {/* Dashed line animation */}
          <path
            d={edgePath}
            fill="none"
            stroke="hsl(var(--info) / 0.8)"
            strokeWidth={edgeWidth + 0.5}
            strokeDasharray="8 8"
            strokeLinecap="round"
            style={{
              animation: 'edge-dash-flow 1s linear infinite',
              opacity: 0.6,
            }}
          />
          {/* Pulsing glow effect */}
          <path
            d={edgePath}
            fill="none"
            stroke="hsl(var(--info))"
            strokeWidth={edgeWidth + 2}
            strokeLinecap="round"
            style={{
              animation: 'edge-glow-pulse 2s ease-in-out infinite',
              opacity: 0.3,
              filter: 'blur(3px)',
            }}
          />
          {/* Particle dots moving along the path */}
          <circle r="3" fill="hsl(var(--info) / 0.9)" style={{ animation: 'move-along-path 1.5s linear infinite' }}>
            <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} />
          </circle>
          <circle r="3" fill="hsl(var(--info) / 0.6)" style={{ animation: 'move-along-path 1.5s linear infinite', animationDelay: '0.75s' }}>
            <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} begin="0.75s" />
          </circle>
        </>
      )}

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div className="w-16 h-16" onDoubleClick={handleDoubleClick} />

          {data.showMetrics && hasMetrics && (
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 bg-background/80 border border-border rounded-full px-3 py-1 text-xs text-muted-foreground shadow-md backdrop-blur-sm pointer-events-none"
            >
              {data.executionTime !== undefined && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{data.executionTime}ms</span>
                </div>
              )}
               {data.itemCount !== undefined && data.executionTime !== undefined && (
                <div className="h-4 w-px bg-border" />
              )}
              {data.itemCount !== undefined && (
                <div className="flex items-center gap-1">
                  <List className="h-3 w-3" />
                  <span>{data.itemCount} {data.itemCount === 1 ? 'item' : 'items'}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>

      <style jsx>{`
        @keyframes edge-dash-flow {
          0% {
            stroke-dashoffset: 16;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes edge-glow-pulse {
  0% {
    opacity: 0.25;
    filter: brightness(0.9);
  }
  25% {
    opacity: 0.45;
    filter: brightness(1);
  }
  50% {
    opacity: 0.6;
    filter: brightness(1.2);
  }
  75% {
    opacity: 0.45;
    filter: brightness(1);
  }
  100% {
    opacity: 0.25;
    filter: brightness(0.9);
  }
}

.edge-glow {
  animation: edge-glow-pulse 4.5s cubic-bezier(0.42, 0, 0.58, 1) infinite;
  transition: all 0.3s ease-out;
  will-change: opacity, filter;
}


        @keyframes move-along-path {
          0% {
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
