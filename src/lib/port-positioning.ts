import type { NodeShape } from "./types";
import type { CustomNodePort } from "./custom-nodes-types";

/**
 * Port positioning rules by node shape
 */
export const PORT_RULES = {
  "1x1": {
    inputs: ["left", "top"] as const,
    outputs: ["right", "bottom"] as const,
  },
  "1x2": {
    inputs: ["left", "top"] as const,
    outputs: ["right", "bottom"] as const,
  },
  "1x3": {
    inputs: ["left", "top"] as const,
    outputs: ["right", "bottom"] as const,
  },
  circle: {
    inputs: ["left", "top"] as const,
    outputs: ["right", "bottom"] as const,
  },
  rectangle: {
    inputs: ["left", "top"] as const,
    outputs: ["right", "bottom"] as const,
  },
  diamond: {
    inputs: ["left", "top"] as const,
    outputs: ["right", "bottom"] as const,
  },
  hexagon: {
    inputs: ["left", "top"] as const,
    outputs: ["right", "bottom"] as const,
  },
} as const;

/**
 * Get allowed port positions for a given shape and port type
 */
export function getAllowedPositions(
  shape: NodeShape,
  portType: "inputs" | "outputs"
): ReadonlyArray<"left" | "right" | "top" | "bottom"> {
  return PORT_RULES[shape][portType];
}

/**
 * Validate if a port position is allowed for the given shape
 */
export function isValidPortPosition(
  shape: NodeShape,
  portType: "inputs" | "outputs",
  position: "left" | "right" | "top" | "bottom"
): boolean {
  const allowedPositions = getAllowedPositions(shape, portType);
  return allowedPositions.includes(position);
}

/**
 * Get the default position for a port based on shape and index
 */
export function getDefaultPortPosition(
  shape: NodeShape,
  portType: "inputs" | "outputs",
  index: number = 0
): "left" | "right" | "top" | "bottom" {
  const allowedPositions = getAllowedPositions(shape, portType);

  // For single port, use primary position
  if (index === 0) {
    return portType === "inputs" ? "left" : "right";
  }

  // For multiple ports, alternate between allowed positions
  return allowedPositions[index % allowedPositions.length] as "left" | "right" | "top" | "bottom";
}

/**
 * Auto-assign positions to ports that don't have one set
 */
export function autoAssignPortPositions(
  ports: CustomNodePort[],
  shape: NodeShape,
  portType: "inputs" | "outputs"
): CustomNodePort[] {
  return ports.map((port, index) => {
    // If position is already set and valid, keep it
    if (port.position && isValidPortPosition(shape, portType, port.position)) {
      return port;
    }

    // Otherwise, assign default position
    return {
      ...port,
      position: getDefaultPortPosition(shape, portType, index),
    };
  });
}

/**
 * Validate all ports in a node and return validation errors
 */
export function validateNodePorts(
  inputs: CustomNodePort[],
  outputs: CustomNodePort[],
  shape: NodeShape
): string[] {
  const errors: string[] = [];

  // Validate input positions
  inputs.forEach((port, index) => {
    if (!port.position) {
      errors.push(`Input port "${port.label}" (index ${index}) is missing a position`);
    } else if (!isValidPortPosition(shape, "inputs", port.position)) {
      const allowed = getAllowedPositions(shape, "inputs").join(", ");
      errors.push(
        `Input port "${port.label}" has invalid position "${port.position}". ` +
        `Allowed positions for shape "${shape}": ${allowed}`
      );
    }
  });

  // Validate output positions
  outputs.forEach((port, index) => {
    if (!port.position) {
      errors.push(`Output port "${port.label}" (index ${index}) is missing a position`);
    } else if (!isValidPortPosition(shape, "outputs", port.position)) {
      const allowed = getAllowedPositions(shape, "outputs").join(", ");
      errors.push(
        `Output port "${port.label}" has invalid position "${port.position}". ` +
        `Allowed positions for shape "${shape}": ${allowed}`
      );
    }
  });

  return errors;
}

/**
 * Get the React Flow Handle position class based on port position
 */
export function getHandlePositionClass(position: "left" | "right" | "top" | "bottom"): string {
  const positionMap = {
    left: "left-0 top-1/2 -translate-y-1/2 -translate-x-1/2",
    right: "right-0 top-1/2 -translate-y-1/2 translate-x-1/2",
    top: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
    bottom: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
  };

  return positionMap[position];
}

/**
 * Get React Flow Position enum value from string position
 */
export function getReactFlowPosition(position: "left" | "right" | "top" | "bottom"): string {
  // React Flow Position enum values
  const positionMap = {
    left: "Left",
    right: "Right",
    top: "Top",
    bottom: "Bottom",
  };

  return positionMap[position];
}
