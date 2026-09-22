'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { NodeShape } from '@/lib/types';
import type { CustomNodePort } from '@/lib/custom-nodes-types';
import { parseShape, getMaxSlotsForPosition, getAllowedPositions } from '@/lib/slot-system';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SlotGridSelectorProps = {
  shape: NodeShape;
  portType: 'inputs' | 'outputs';
  selectedPort?: CustomNodePort | null;
  onSlotSelect: (position: 'top' | 'bottom' | 'left' | 'right', slot: number) => void;
  usedSlots?: Map<string, string>; // Map of "position:slot" -> portId
};

export function SlotGridSelector({
  shape,
  portType,
  selectedPort,
  onSlotSelect,
  usedSlots = new Map(),
}: SlotGridSelectorProps) {
  const dimensions = parseShape(shape);
  const allowedPositions = getAllowedPositions(portType);

  const renderSlots = (
    position: 'top' | 'bottom' | 'left' | 'right',
    count: number,
    orientation: 'horizontal' | 'vertical'
  ) => {
    const isAllowed = allowedPositions.includes(position);
    const slots = Array.from({ length: count }, (_, i) => i + 1);

    return (
      <div className={cn(
        "flex gap-1",
        orientation === 'vertical' ? 'flex-col' : 'flex-row'
      )}>
        {slots.map(slotNumber => {
          const slotKey = `${position}:${slotNumber}`;
          const isUsed = usedSlots.has(slotKey);
          const usedByCurrentPort = selectedPort &&
            selectedPort.position === position &&
            selectedPort.slot === slotNumber;
          const isDisabled = !isAllowed || (isUsed && !usedByCurrentPort);

          return (
            <TooltipProvider key={slotNumber} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isDisabled) {
                        onSlotSelect(position, slotNumber);
                      }
                    }}
                    disabled={isDisabled}
                    className={cn(
                      "w-6 h-6 rounded border-2 transition-all",
                      "flex items-center justify-center text-xs font-medium",
                      !isAllowed && "opacity-30 cursor-not-allowed bg-muted",
                      isAllowed && !isUsed && !usedByCurrentPort && "border-border hover:border-primary hover:bg-primary/10 cursor-pointer",
                      isUsed && !usedByCurrentPort && "bg-muted-foreground/20 border-muted-foreground cursor-not-allowed",
                      usedByCurrentPort && "bg-primary border-primary text-primary-foreground"
                    )}
                  >
                    {slotNumber}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {!isAllowed && `Not allowed for ${portType}`}
                    {isAllowed && isUsed && !usedByCurrentPort && `Slot occupied`}
                    {isAllowed && !isUsed && `Click to select slot ${slotNumber}`}
                    {usedByCurrentPort && `Current selection`}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Visual node representation */}
      <div className="relative bg-card border-2 border-dashed border-muted-foreground/30 rounded-lg p-8">
        {/* Top slots */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex justify-center">
          {renderSlots('top', dimensions.vertical, 'horizontal')}
        </div>

        {/* Left slots */}
        <div className="absolute -left-7 top-1/2 -translate-y-1/2 flex flex-col justify-center">
          {renderSlots('left', dimensions.horizontal, 'vertical')}
        </div>

        {/* Right slots */}
        <div className="absolute -right-7 top-1/2 -translate-y-1/2 flex flex-col justify-center">
          {renderSlots('right', dimensions.horizontal, 'vertical')}
        </div>

        {/* Bottom slots */}
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 flex justify-center">
          {renderSlots('bottom', dimensions.vertical, 'horizontal')}
        </div>

        {/* Center label */}
        <div className="text-center text-sm text-muted-foreground">
          <div className="font-semibold">{shape === 'circle' ? 'Circle' : shape}</div>
          <div className="text-xs mt-1">
            {portType === 'inputs' ? 'Input Ports' : 'Output Ports'}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded border-2 border-border"></div>
          <span className="text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-primary border-2 border-primary"></div>
          <span className="text-muted-foreground">Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-muted-foreground/20 border-2 border-muted-foreground"></div>
          <span className="text-muted-foreground">Occupied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded border-2 border-border opacity-30"></div>
          <span className="text-muted-foreground">Not allowed</span>
        </div>
      </div>
    </div>
  );
}
