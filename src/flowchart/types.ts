// Tipos base del modelo de diagrama de flujo (subconjunto de sintaxis Mermaid `flowchart`)

export type FlowDirection = 'TD' | 'TB' | 'LR' | 'RL' | 'BT';

export type FlowNodeShape = 'rectangle' | 'stadium' | 'diamond' | 'parallelogram';

export interface FlowClassDef {
  name: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
  color?: string;
}

export interface FlowNode {
  id: string;
  label: string;
  shape: FlowNodeShape;
  className?: string;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface FlowchartDiagram {
  direction: FlowDirection;
  nodes: FlowNode[];
  edges: FlowEdge[];
  classDefs: Map<string, FlowClassDef>;
}

export interface FlowParseResult {
  diagram: FlowchartDiagram;
  errors: string[];
}
