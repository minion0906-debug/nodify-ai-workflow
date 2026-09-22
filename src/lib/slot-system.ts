import type { NodeShape } from "./types";
import type { CustomNodePort } from "./custom-nodes-types";

/**
 * Shape dimensions parsed from shape string
 */
export type ShapeDimensions = {
  vertical: number;   // Slots available on top/bottom
  horizontal: number; // Slots available on left/right
};

/**
 * Parse a shape string into dimensions
 * @example parseShape("3x4") => { vertical: 3, horizontal: 4 }
 * @example parseShape("circle") => { vertical: 1, horizontal: 1 }
 */
export function parseShape(shape: NodeShape): ShapeDimensions {
  if (shape === "circle") {
    return { vertical: 1, horizontal: 1 };
  }

  const [vertical, horizontal] = shape.split("x").map(Number);
  return { vertical, horizontal };
}

/**
 * Get the maximum number of slots available for a position
 */
export function getMaxSlotsForPosition(
  shape: NodeShape,
  position: "top" | "bottom" | "left" | "right"
): number {
  const dimensions = parseShape(shape);

  if (position === "top" || position === "bottom") {
    return dimensions.vertical;
  } else {
    return dimensions.horizontal;
  }
}

/**
 * Check if a slot number is valid for the given shape and position
 */
export function isValidSlot(
  shape: NodeShape,
  position: "top" | "bottom" | "left" | "right",
  slot: number
): boolean {
  const maxSlots = getMaxSlotsForPosition(shape, position);
  return slot >= 1 && slot <= maxSlots;
}

/**
 * Get allowed positions for input/output based on port type
 *
 * Following n8n pattern for flexibility:
 * - Inputs: left (main), top/bottom (secondary tools/config)
 * - Outputs: right (main), top/bottom (secondary outputs)
 */
export function getAllowedPositions(
  portType: "inputs" | "outputs"
): Array<"top" | "bottom" | "left" | "right"> {
  if (portType === "inputs") {
    return ["left", "top", "bottom"];
  } else {
    return ["right", "top", "bottom"];
  }
}

/**
 * Check if a position is allowed for the given port type
 */
export function isValidPosition(
  portType: "inputs" | "outputs",
  position: "top" | "bottom" | "left" | "right"
): boolean {
  const allowed = getAllowedPositions(portType);
  return allowed.includes(position);
}

/**
 * Auto-assign slots to ports, distributing them equitably
 * Strategy: Fill from extremes towards the center
 *
 * Examples:
 * - 1 port in 3 slots: [slot 2] (center)
 * - 2 ports in 3 slots: [slot 1, slot 3] (extremes)
 * - 3 ports in 3 slots: [slot 1, slot 2, slot 3] (all)
 * - 2 ports in 4 slots: [slot 1, slot 4] (extremes)
 * - 3 ports in 5 slots: [slot 1, slot 3, slot 5] (distributed)
 */
export function autoAssignSlots(
  portCount: number,
  maxSlots: number
): number[] {
  if (portCount === 0) return [];
  if (portCount > maxSlots) {
    throw new Error(`Cannot fit ${portCount} ports in ${maxSlots} slots`);
  }

  // If only one port, place it in the center
  if (portCount === 1) {
    return [Math.ceil(maxSlots / 2)];
  }

  // If ports equal slots, use all slots
  if (portCount === maxSlots) {
    return Array.from({ length: maxSlots }, (_, i) => i + 1);
  }

  // Distribute equitably from extremes towards center
  const slots: number[] = [];
  const step = (maxSlots - 1) / (portCount - 1);

  for (let i = 0; i < portCount; i++) {
    const slot = Math.round(1 + i * step);
    slots.push(slot);
  }

  return slots;
}

/**
 * Auto-assign slot positions to ports that don't have one
 */
export function autoAssignPortSlots(
  ports: CustomNodePort[],
  shape: NodeShape,
  portType: "inputs" | "outputs"
): CustomNodePort[] {
  // Group ports by position
  const portsByPosition: Record<string, CustomNodePort[]> = {};

  ports.forEach(port => {
    if (!portsByPosition[port.position]) {
      portsByPosition[port.position] = [];
    }
    portsByPosition[port.position].push(port);
  });

  const result: CustomNodePort[] = [];

  // Process each position group
  Object.entries(portsByPosition).forEach(([position, positionPorts]) => {
    const maxSlots = getMaxSlotsForPosition(shape, position as any);

    // Separate ports with and without assigned slots
    const withSlots = positionPorts.filter(p => p.slot && isValidSlot(shape, position as any, p.slot));
    const withoutSlots = positionPorts.filter(p => !p.slot || !isValidSlot(shape, position as any, p.slot));

    // Get used slots
    const usedSlots = new Set(withSlots.map(p => p.slot));

    // Auto-assign slots to ports without slots
    if (withoutSlots.length > 0) {
      // Calculate available slots
      const availableSlots = Array.from({ length: maxSlots }, (_, i) => i + 1)
        .filter(slot => !usedSlots.has(slot));

      // Auto-distribute
      const autoSlots = autoAssignSlots(withoutSlots.length, availableSlots.length);

      withoutSlots.forEach((port, index) => {
        result.push({
          ...port,
          slot: availableSlots[autoSlots[index] - 1],
        });
      });
    }

    // Add ports that already had slots
    result.push(...withSlots);
  });

  return result.sort((a, b) => {
    // Sort by position, then by slot
    if (a.position !== b.position) {
      const posOrder = ["top", "left", "right", "bottom"];
      return posOrder.indexOf(a.position) - posOrder.indexOf(b.position);
    }
    return a.slot - b.slot;
  });
}

/**
 * Validate ports for a given shape
 */
export function validatePorts(
  ports: CustomNodePort[],
  shape: NodeShape,
  portType: "inputs" | "outputs"
): string[] {
  const errors: string[] = [];
  const slotUsage: Record<string, Set<number>> = {};

  ports.forEach((port, index) => {
    // Validate position is allowed for port type
    if (!isValidPosition(portType, port.position)) {
      const allowed = getAllowedPositions(portType).join(", ");
      errors.push(
        `Port "${port.label}" (index ${index}): Invalid position "${port.position}" for ${portType}. ` +
        `Allowed: ${allowed}`
      );
    }

    // Validate slot number
    if (!port.slot || port.slot < 1) {
      errors.push(`Port "${port.label}" (index ${index}): Missing or invalid slot number`);
    } else if (!isValidSlot(shape, port.position, port.slot)) {
      const maxSlots = getMaxSlotsForPosition(shape, port.position);
      errors.push(
        `Port "${port.label}" (index ${index}): Slot ${port.slot} is out of range for position "${port.position}". ` +
        `Valid range: 1-${maxSlots}`
      );
    }

    // Check for duplicate slots in same position
    const key = port.position;
    if (!slotUsage[key]) {
      slotUsage[key] = new Set();
    }
    if (slotUsage[key].has(port.slot)) {
      errors.push(
        `Port "${port.label}" (index ${index}): Slot ${port.slot} on "${port.position}" is already used by another port`
      );
    }
    slotUsage[key].add(port.slot);
  });

  return errors;
}

/**
 * Detect conflicts when changing shape
 */
export function detectShapeChangeConflicts(
  ports: CustomNodePort[],
  oldShape: NodeShape,
  newShape: NodeShape
): {
  conflictingPorts: CustomNodePort[];
  warnings: string[];
} {
  const conflictingPorts: CustomNodePort[] = [];
  const warnings: string[] = [];

  ports.forEach(port => {
    const maxSlotsOld = getMaxSlotsForPosition(oldShape, port.position);
    const maxSlotsNew = getMaxSlotsForPosition(newShape, port.position);

    if (port.slot > maxSlotsNew) {
      conflictingPorts.push(port);
      warnings.push(
        `Port "${port.label}" at ${port.position} slot ${port.slot} exceeds new shape limits (max: ${maxSlotsNew})`
      );
    }
  });

  return { conflictingPorts, warnings };
}

/**
 * Resolve shape change conflicts by auto-adjusting ports
 */
export function resolveShapeChangeConflicts(
  ports: CustomNodePort[],
  newShape: NodeShape,
  portType: "inputs" | "outputs",
  strategy: "auto-adjust" | "remove-invalid" = "auto-adjust"
): CustomNodePort[] {
  if (strategy === "remove-invalid") {
    // Remove ports that don't fit in the new shape
    return ports.filter(port => isValidSlot(newShape, port.position, port.slot));
  }

  // Auto-adjust: move conflicting ports to valid slots
  const result: CustomNodePort[] = [];
  const portsByPosition: Record<string, CustomNodePort[]> = {};

  // Group by position
  ports.forEach(port => {
    if (!portsByPosition[port.position]) {
      portsByPosition[port.position] = [];
    }
    portsByPosition[port.position].push(port);
  });

  // Process each position
  Object.entries(portsByPosition).forEach(([position, positionPorts]) => {
    const maxSlots = getMaxSlotsForPosition(newShape, position as any);

    // Separate valid and invalid
    const validPorts = positionPorts.filter(p => p.slot <= maxSlots);
    const invalidPorts = positionPorts.filter(p => p.slot > maxSlots);

    // Add valid ports as-is
    result.push(...validPorts);

    // Find available slots for invalid ports
    const usedSlots = new Set(validPorts.map(p => p.slot));
    const availableSlots = Array.from({ length: maxSlots }, (_, i) => i + 1)
      .filter(slot => !usedSlots.has(slot));

    // Assign available slots to invalid ports (up to available capacity)
    invalidPorts.slice(0, availableSlots.length).forEach((port, index) => {
      result.push({
        ...port,
        slot: availableSlots[index],
      });
    });
  });

  return result;
}

/**
 * Generate all available node shapes
 */
export function getAllShapes(): NodeShape[] {
  const shapes: NodeShape[] = ["circle"];

  for (let v = 1; v <= 6; v++) {
    for (let h = 1; h <= 6; h++) {
      shapes.push(`${v}x${h}` as NodeShape);
    }
  }

  return shapes;
}

/**
 * Get human-readable description of a shape
 */
export function getShapeDescription(shape: NodeShape): string {
  if (shape === "circle") {
    return "Circle (1 slot on each side)";
  }

  const { vertical, horizontal } = parseShape(shape);
  return `${vertical} slots top/bottom, ${horizontal} slots left/right`;
}
