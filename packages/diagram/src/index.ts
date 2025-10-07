// Diagram utilities and components will be added here
// For now, just export a placeholder

export interface DiagramNode {
  id: string;
  data: any;
  position: { x: number; y: number };
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
}

// TODO: Add react-flow wrappers and ERD utilities
