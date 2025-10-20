import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type PlayerType = 'offense' | 'defense';
type Tool = 'select' | 'run' | 'pass' | 'block' | 'erase' | 'freehand';

export interface DesignerNode {
  id: string;
  type: PlayerType;
  x: number; // canvas coords
  y: number;
  label?: string; // optional jersey/position label
}

export interface DesignerEdge {
  id: string;
  from: string; // node id
  to: { x: number; y: number }; // absolute target for simple arrow lines
  style: 'run' | 'pass' | 'block';
  path?: { x: number; y: number }[]; // for freehand paths
}

export interface PlayDiagramData {
  nodes: DesignerNode[];
  edges: DesignerEdge[];
}

interface PlayDesignerProps {
  initial?: PlayDiagramData | null;
  onSave: (data: PlayDiagramData) => void;
  onCancel?: () => void;
}

const GRID_SIZE = 24; // pixels per grid cell
const FIELD_PADDING = 16;

const colorByStyle: Record<DesignerEdge['style'], string> = {
  run: '#ef4444', // red
  pass: '#3b82f6', // blue
  block: '#6b7280', // gray
};

const shapeFill: Record<PlayerType, string> = {
  offense: '#10b981', // emerald
  defense: '#f59e0b', // amber
};

export default function PlayDesigner({ initial, onSave, onCancel }: PlayDesignerProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [nodes, setNodes] = useState<DesignerNode[]>(() => initial?.nodes || []);
  const [edges, setEdges] = useState<DesignerEdge[]>(() => initial?.edges || []);
  const [tool, setTool] = useState<Tool>('select');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draftEdge, setDraftEdge] = useState<DesignerEdge | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [freehandPath, setFreehandPath] = useState<{ x: number; y: number }[]>([]);

  useEffect(() => {
    if (initial) {
      setNodes(initial.nodes || []);
      setEdges(initial.edges || []);
    }
  }, [initial]);

  const viewBox = useMemo(() => {
    const width = GRID_SIZE * 24 + FIELD_PADDING * 2; // ~half field
    const height = GRID_SIZE * 14 + FIELD_PADDING * 2; // hash-to-hash area look
    return { width, height };
  }, []);

  const snap = (n: number) => Math.round(n / GRID_SIZE) * GRID_SIZE;

  const clientToSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const inv = matrix.inverse();
    const p = pt.matrixTransform(inv);
    // constrain to inner field bounds
    const x = Math.max(FIELD_PADDING, Math.min(p.x, viewBox.width - FIELD_PADDING));
    const y = Math.max(FIELD_PADDING, Math.min(p.y, viewBox.height - FIELD_PADDING));
    // snap with 8px tolerance; if drawing an edge and Shift is held, snap to 45° increments
    const snapped = { x: snap(x), y: snap(y) };
    if (draftEdge && (e.shiftKey || tool !== 'select')) {
      const from = nodes.find(n => n.id === draftEdge.from);
      if (from) {
        const dx = snapped.x - from.x;
        const dy = snapped.y - from.y;
        const angle = Math.atan2(dy, dx);
        const snap45 = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        const dist = Math.hypot(dx, dy);
        return { x: snap(from.x + Math.cos(snap45) * dist), y: snap(from.y + Math.sin(snap45) * dist) };
      }
    }
    return snapped;
  };

  const addNode = (type: PlayerType) => {
    // place centered horizontally, stagger vertically
    const baseY = FIELD_PADDING + GRID_SIZE * (type === 'offense' ? 8 : 4);
    const baseX = FIELD_PADDING + GRID_SIZE * (12 + Math.floor(Math.random() * 5) - 2);
    const node: DesignerNode = {
      id: crypto.randomUUID(),
      type,
      x: snap(baseX),
      y: snap(baseY),
    };
    setNodes((prev) => [...prev, node]);
  };

  const removeSelected = () => {
    if (!selectedNodeId) return;
    setEdges((prev) => prev.filter((e) => e.from !== selectedNodeId));
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setSelectedNodeId(null);
  };

  const startDragOrDraw = (e: React.PointerEvent, nodeId: string) => {
    if (tool === 'select') {
      setSelectedNodeId(nodeId);
      (e.target as Element).setPointerCapture?.((e as any).pointerId);
    } else if (tool === 'run' || tool === 'pass' || tool === 'block') {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const p = clientToSvg(e);
      setDraftEdge({ id: crypto.randomUUID(), from: node.id, to: p, style: tool });
    } else if (tool === 'freehand') {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const p = clientToSvg(e);
      setFreehandPath([p]);
      setIsDrawing(true);
      setSelectedNodeId(nodeId);
    } else if (tool === 'erase') {
      // erase edges starting from node
      setEdges((prev) => prev.filter((ed) => ed.from !== nodeId));
    }
  };

  const startFreehand = (e: React.PointerEvent) => {
    if (tool === 'freehand') {
      const p = clientToSvg(e);
      setFreehandPath([p]);
      setIsDrawing(true);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!svgRef.current) return;
    if (draftEdge) {
      const p = clientToSvg(e);
      setDraftEdge({ ...draftEdge, to: p });
      return;
    }
    if (isDrawing && tool === 'freehand') {
      const p = clientToSvg(e);
      setFreehandPath(prev => [...prev, p]);
      return;
    }
    if (selectedNodeId && tool === 'select') {
      const p = clientToSvg(e);
      setNodes((prev) => prev.map((n) => (n.id === selectedNodeId ? { ...n, x: p.x, y: p.y } : n)));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (draftEdge) {
      setEdges((prev) => [...prev, draftEdge]);
      setDraftEdge(null);
    }
    if (isDrawing && tool === 'freehand' && freehandPath.length > 1 && selectedNodeId) {
      const edge: DesignerEdge = {
        id: crypto.randomUUID(),
        from: selectedNodeId,
        to: freehandPath[freehandPath.length - 1],
        style: 'pass', // default to pass for freehand
        path: freehandPath
      };
      setEdges((prev) => [...prev, edge]);
      setFreehandPath([]);
      setIsDrawing(false);
    }
    setSelectedNodeId(null);
  };

  const clearAll = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setDraftEdge(null);
    setFreehandPath([]);
    setIsDrawing(false);
  };

  const handleSave = () => {
    onSave({ nodes, edges });
  };

  const exportPNG = async () => {
    if (!svgRef.current) return;
    const wrapper = svgRef.current.parentElement as HTMLElement;
    const canvas = await html2canvas(wrapper, { backgroundColor: '#ffffff', scale: 2 });
    const data = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = data;
    a.download = 'play-diagram.png';
    a.click();
  };

  const exportPDF = async () => {
    if (!svgRef.current) return;
    const wrapper = svgRef.current.parentElement as HTMLElement;
    const canvas = await html2canvas(wrapper, { backgroundColor: '#ffffff', scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    const x = (pageWidth - w) / 2;
    const y = (pageHeight - h) / 2;
    pdf.addImage(imgData, 'PNG', x, y, w, h);
    pdf.save('play-diagram.pdf');
  };

  // Route templates relative to selected node
  const addRoute = (style: DesignerEdge['style'], points: Array<{ dx: number; dy: number }>) => {
    if (!selectedNodeId) return;
    const from = nodes.find(n => n.id === selectedNodeId);
    if (!from) return;
    let lastX = from.x;
    let lastY = from.y;
    points.forEach((p) => {
      const to = { x: snap(lastX + p.dx * GRID_SIZE), y: snap(lastY + p.dy * GRID_SIZE) };
      const id = crypto.randomUUID();
      setEdges(prev => [...prev, { id, from: from.id, to, style }]);
      lastX = to.x; lastY = to.y;
    });
  };

  // Complex route templates
  const addComplexRoute = (style: DesignerEdge['style'], path: Array<{ dx: number; dy: number }>) => {
    if (!selectedNodeId) return;
    const from = nodes.find(n => n.id === selectedNodeId);
    if (!from) return;
    
    const pathPoints = path.map(p => ({
      x: snap(from.x + p.dx * GRID_SIZE),
      y: snap(from.y + p.dy * GRID_SIZE)
    }));
    
    const edge: DesignerEdge = {
      id: crypto.randomUUID(),
      from: from.id,
      to: pathPoints[pathPoints.length - 1],
      style,
      path: pathPoints
    };
    
    setEdges(prev => [...prev, edge]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant={tool === 'select' ? 'default' : 'outline'} size="sm" onClick={() => setTool('select')}>Select</Button>
          <Button variant={tool === 'run' ? 'default' : 'outline'} size="sm" onClick={() => setTool('run')}>Run</Button>
          <Button variant={tool === 'pass' ? 'default' : 'outline'} size="sm" onClick={() => setTool('pass')}>Pass</Button>
          <Button variant={tool === 'block' ? 'default' : 'outline'} size="sm" onClick={() => setTool('block')}>Block</Button>
          <Button variant={tool === 'freehand' ? 'default' : 'outline'} size="sm" onClick={() => setTool('freehand')}>Freehand</Button>
          <Button variant={tool === 'erase' ? 'default' : 'outline'} size="sm" onClick={() => setTool('erase')}>Erase</Button>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => addNode('offense')}>Add Offense</Button>
          <Button size="sm" variant="secondary" onClick={() => addNode('defense')}>Add Defense</Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => addRoute('run', [{ dx: 0, dy: -1 }, { dx: 1, dy: -1 }])}>Run: Bend</Button>
            <Button size="sm" variant="outline" onClick={() => addRoute('pass', [{ dx: 0, dy: -1 }, { dx: 0, dy: -1 }])}>Pass: Go</Button>
            <Button size="sm" variant="outline" onClick={() => addRoute('pass', [{ dx: 1, dy: 0 }, { dx: 0, dy: -1 }])}>Pass: Out</Button>
            <Button size="sm" variant="outline" onClick={() => addRoute('block', [{ dx: 1, dy: 0 }])}>Block: Step</Button>
            <Separator orientation="vertical" className="h-6" />
            <Button size="sm" variant="outline" onClick={() => addComplexRoute('pass', [{ dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 2, dy: 0 }])}>Slant</Button>
            <Button size="sm" variant="outline" onClick={() => addComplexRoute('pass', [{ dx: 0, dy: -1 }, { dx: 0, dy: -2 }, { dx: 1, dy: 0 }])}>Post</Button>
            <Button size="sm" variant="outline" onClick={() => addComplexRoute('pass', [{ dx: 0, dy: -1 }, { dx: 0, dy: -2 }, { dx: 2, dy: -1 }])}>Corner</Button>
            <Button size="sm" variant="outline" onClick={() => addComplexRoute('pass', [{ dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: -2, dy: 0 }])}>Bubble</Button>
            <Button size="sm" variant="outline" onClick={() => addComplexRoute('pass', [{ dx: 0, dy: 1 }, { dx: 1, dy: 1 }, { dx: 2, dy: 0 }])}>Screen</Button>
            <Button size="sm" variant="outline" onClick={() => addComplexRoute('run', [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 }])}>Sweep</Button>
            <Button size="sm" variant="outline" onClick={() => addComplexRoute('pass', [{ dx: 0, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 }])}>Drag</Button>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={clearAll}>Clear</Button>
          <Button size="sm" variant="outline" onClick={exportPNG}>Export PNG</Button>
          <Button size="sm" variant="outline" onClick={exportPDF}>Export PDF</Button>
          <Button size="sm" onClick={handleSave}>Save Diagram</Button>
          {onCancel && (
            <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
          )}
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <svg
          ref={svgRef}
          width="100%"
          height={viewBox.height}
          viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerDown={startFreehand}
        >
          {/* Grid */}
          <defs>
            <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#e5e7eb" strokeWidth="1" />
            </pattern>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
            </marker>
          </defs>
          <rect x={0} y={0} width={viewBox.width} height={viewBox.height} fill="url(#grid)" />
          {/* Hash marks (simple) */}
          {Array.from({ length: 10 }).map((_, i) => {
            const x = FIELD_PADDING + GRID_SIZE * (i * 2 + 2);
            return (
              <g key={i} opacity={0.25}>
                <line x1={x} x2={x} y1={FIELD_PADDING} y2={viewBox.height - FIELD_PADDING} stroke="#9ca3af" strokeDasharray="4 8" />
              </g>
            );
          })}

          {/* Edges */}
          {edges.map((ed) => {
            const from = nodes.find((n) => n.id === ed.from);
            if (!from) return null;
            
            let pathData = '';
            if (ed.path && ed.path.length > 1) {
              // Complex path for freehand or complex routes
              pathData = `M ${ed.path[0].x} ${ed.path[0].y}`;
              for (let i = 1; i < ed.path.length; i++) {
                pathData += ` L ${ed.path[i].x} ${ed.path[i].y}`;
              }
            } else {
              // Simple straight line
              pathData = `M ${from.x} ${from.y} L ${ed.to.x} ${ed.to.y}`;
            }
            
            return (
              <path
                key={ed.id}
                d={pathData}
                fill="none"
                stroke={colorByStyle[ed.style]}
                strokeWidth={3}
                markerEnd="url(#arrow)"
              />
            );
          })}

          {/* Draft edge while drawing */}
          {draftEdge && (
            <path
              d={`M ${nodes.find((n) => n.id === draftEdge.from)?.x ?? 0} ${nodes.find((n) => n.id === draftEdge.from)?.y ?? 0} L ${draftEdge.to.x} ${draftEdge.to.y}`}
              fill="none"
              stroke={colorByStyle[draftEdge.style]}
              strokeWidth={3}
              markerEnd="url(#arrow)"
              opacity={0.6}
            />
          )}

          {/* Freehand path while drawing */}
          {isDrawing && freehandPath.length > 1 && (
            <path
              d={`M ${freehandPath[0].x} ${freehandPath[0].y} ${freehandPath.map(p => `L ${p.x} ${p.y}`).join(' ')}`}
              fill="none"
              stroke={colorByStyle.pass}
              strokeWidth={3}
              markerEnd="url(#arrow)"
              opacity={0.6}
            />
          )}

          {/* Nodes */}
          {nodes.map((n) => (
            <g
              key={n.id}
              onPointerDown={(e) => startDragOrDraw(e, n.id)}
              cursor={tool === 'select' ? 'grab' : 'crosshair'}
            >
              {n.type === 'offense' ? (
                <circle cx={n.x} cy={n.y} r={10} fill={shapeFill.offense} stroke="#111827" strokeWidth={1.5} />
              ) : (
                <polygon points={`${n.x},${n.y - 12} ${n.x - 12},${n.y + 10} ${n.x + 12},${n.y + 10}`} fill={shapeFill.defense} stroke="#111827" strokeWidth={1.5} />
              )}
              {n.label && (
                <text x={n.x} y={n.y - 16} fontSize={10} textAnchor="middle" fill="#111827">{n.label}</text>
              )}
            </g>
          ))}
        </svg>
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground">
          Tip: Select a tool (Run/Pass/Block), click a player, then drag to draw an arrow. 
          Use Freehand to draw custom routes like bubble screens. Use Erase to remove a player's paths.
        </Label>
      </div>
    </div>
  );
}


