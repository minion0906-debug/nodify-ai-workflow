/**
 * SubGroup Type Definition
 * Represents a node sub-group for organizing custom nodes
 */

export type SubGroup = {
  id: string;
  name: string;
  icon: string; // Lucide icon name or social media icon identifier
  color: string; // Hex color code
  createdAt: string;
  updatedAt: string;
};

export type SubGroupWithNodeCount = SubGroup & {
  nodeCount: number;
};
