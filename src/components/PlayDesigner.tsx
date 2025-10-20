import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  Type, 
  Square, 
  Circle, 
  Triangle, 
  Minus, 
  ArrowRight, 
  Move, 
  MousePointer2,
  Palette,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Copy,
  Undo,
  Redo,
  Download,
  FileImage,
  FileText,
  Users,
  Shield,
  TrendingUp
} from 'lucide-react';

type Tool = 'select' | 'text' | 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow' | 'freehand' | 'player-o' | 'player-d';
type TextAlign = 'left' | 'center' | 'right';

export interface DesignElement {
  id: string;
  type: 'text' | 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow' | 'freehand' | 'player';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  textAlign?: TextAlign;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  path?: { x: number; y: number }[];
  rotation?: number;
  zIndex: number;
  playerType?: 'offense' | 'defense';
  x2?: number;
  y2?: number;
}

export interface PlayDiagramData {
  elements: DesignElement[];
  background: string;
  width: number;
  height: number;
  showFieldLines?: boolean;
}

interface PlayDesignerProps {
  initial?: PlayDiagramData | null;
  onSave: (data: PlayDiagramData) => void;
  onCancel?: () => void;
}

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 10; // 10-yard intervals

const colors = [
  '#000000', '#FFFFFF', '#EF4444', '#3B82F6', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
  '#6B7280', '#DC2626', '#2563EB', '#059669'
];

const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

// Route templates
const routeTemplates = {
  slant: { name: 'Slant', path: [[0, 0], [0, -30], [40, -60]] },
  post: { name: 'Post', path: [[0, 0], [0, -60], [40, -80]] },
  corner: { name: 'Corner', path: [[0, 0], [0, -40], [40, -30]] },
  bubble: { name: 'Bubble', path: [[0, 0], [0, 10], [40, 10]] },
  screen: { name: 'Screen', path: [[0, 0], [-20, 0], [-20, 20]] },
  sweep: { name: 'Sweep', path: [[0, 0], [20, -10], [60, -10]] },
  drag: { name: 'Drag', path: [[0, 0], [0, -10], [40, -10]] },
  go: { name: 'Go/Fly', path: [[0, 0], [0, -80]] },
  out: { name: 'Out', path: [[0, 0], [0, -40], [40, -40]] },
  in: { name: 'In', path: [[0, 0], [0, -40], [-40, -40]] },
};

export default function PlayDesigner({ initial, onSave, onCancel }: PlayDesignerProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [elements, setElements] = useState<DesignElement[]>(() => initial?.elements || []);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPath, setDrawingPath] = useState<{ x: number; y: number }[]>([]);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<DesignElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [background, setBackground] = useState(initial?.background || '#2D5016');
  const [showFieldLines, setShowFieldLines] = useState(initial?.showFieldLines !== false);
  const [textAlign, setTextAlign] = useState<TextAlign>('left');
  const [fontSize, setFontSize] = useState(16);
  const [fontColor, setFontColor] = useState('#FFFFFF');
  const [fillColor, setFillColor] = useState('#3B82F6');
  const [borderColor, setBorderColor] = useState('#000000');
  const [borderWidth, setBorderWidth] = useState(2);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (initial) {
      setElements(initial.elements || []);
      setBackground(initial.background || '#2D5016');
      setShowFieldLines(initial.showFieldLines !== false);
    }
  }, [initial]);

  const addToHistory = (newElements: DesignElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newElements]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements([...history[historyIndex - 1]]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements([...history[historyIndex + 1]]);
    }
  };

  const getMousePos = (e: React.MouseEvent<HTMLDivElement>): { x: number; y: number } => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const pos = getMousePos(e);

    // Check if clicking on existing element
    const clickedElement = [...elements]
      .sort((a, b) => b.zIndex - a.zIndex)
      .find(el => isPointInElement(pos, el));

    if (tool === 'select') {
      if (clickedElement) {
        setSelectedElement(clickedElement.id);
        setIsDragging(true);
        setDragOffset({
          x: pos.x - clickedElement.x,
          y: pos.y - clickedElement.y
        });
      } else {
        setSelectedElement(null);
      }
      return;
    }

    // Drawing tools
    if (tool === 'text') {
      const newElement: DesignElement = {
        id: crypto.randomUUID(),
        type: 'text',
        x: pos.x,
        y: pos.y,
        content: 'Text',
        fontSize,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign,
        color: fontColor,
        zIndex: elements.length
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      addToHistory(newElements);
      setSelectedElement(newElement.id);
      setTool('select');
    } else if (tool === 'player-o' || tool === 'player-d') {
      const newElement: DesignElement = {
        id: crypto.randomUUID(),
        type: 'player',
        x: pos.x,
        y: pos.y,
        width: 30,
        height: 30,
        content: tool === 'player-o' ? 'O' : 'D',
        playerType: tool === 'player-o' ? 'offense' : 'defense',
        color: '#FFFFFF',
        backgroundColor: tool === 'player-o' ? '#10B981' : '#F59E0B',
        borderColor: '#000000',
        borderWidth: 2,
        fontSize: 18,
        zIndex: elements.length
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      addToHistory(newElements);
      setSelectedElement(newElement.id);
    } else if (tool === 'freehand') {
      setIsDrawing(true);
      setDrawingPath([pos]);
    } else if (tool === 'line' || tool === 'arrow') {
      setIsDrawing(true);
      setDrawStart(pos);
    } else if (tool === 'rectangle' || tool === 'circle' || tool === 'triangle') {
      setIsDrawing(true);
      setDrawStart(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const pos = getMousePos(e);

    if (isDragging && selectedElement && tool === 'select') {
      const newElements = elements.map(el => {
        if (el.id === selectedElement) {
          return { ...el, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y };
        }
        return el;
      });
      setElements(newElements);
    } else if (isDrawing && tool === 'freehand') {
      setDrawingPath([...drawingPath, pos]);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    const pos = getMousePos(e);

    if (isDragging) {
      setIsDragging(false);
      addToHistory(elements);
    } else if (isDrawing) {
      if (tool === 'freehand' && drawingPath.length > 1) {
        const newElement: DesignElement = {
          id: crypto.randomUUID(),
          type: 'freehand',
          x: drawingPath[0].x,
          y: drawingPath[0].y,
          path: drawingPath,
          color: fontColor,
          borderWidth,
          zIndex: elements.length
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        addToHistory(newElements);
      } else if ((tool === 'line' || tool === 'arrow') && drawStart) {
        const newElement: DesignElement = {
          id: crypto.randomUUID(),
          type: tool,
          x: drawStart.x,
          y: drawStart.y,
          x2: pos.x,
          y2: pos.y,
          color: fontColor,
          borderWidth,
          zIndex: elements.length
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        addToHistory(newElements);
      } else if ((tool === 'rectangle' || tool === 'circle' || tool === 'triangle') && drawStart) {
        const width = Math.abs(pos.x - drawStart.x);
        const height = Math.abs(pos.y - drawStart.y);
        const x = Math.min(drawStart.x, pos.x);
        const y = Math.min(drawStart.y, pos.y);
        
        const newElement: DesignElement = {
          id: crypto.randomUUID(),
          type: tool,
          x,
          y,
          width,
          height,
          backgroundColor: fillColor,
          borderColor,
          borderWidth,
          zIndex: elements.length
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        addToHistory(newElements);
      }

      setIsDrawing(false);
      setDrawingPath([]);
      setDrawStart(null);
    }
  };

  const isPointInElement = (point: { x: number; y: number }, el: DesignElement): boolean => {
    if (el.type === 'player' || el.type === 'text') {
      const width = el.width || 30;
      const height = el.height || 30;
      return point.x >= el.x && point.x <= el.x + width &&
             point.y >= el.y && point.y <= el.y + height;
    }
    if (el.type === 'rectangle' || el.type === 'circle' || el.type === 'triangle') {
      return point.x >= el.x && point.x <= el.x + (el.width || 0) &&
             point.y >= el.y && point.y <= el.y + (el.height || 0);
    }
    if (el.type === 'line' || el.type === 'arrow') {
      // Simple proximity check for lines
      const x2 = el.x2 || el.x;
      const y2 = el.y2 || el.y;
      const dist = Math.abs((y2 - el.y) * point.x - (x2 - el.x) * point.y + x2 * el.y - y2 * el.x) /
                   Math.sqrt((y2 - el.y) ** 2 + (x2 - el.x) ** 2);
      return dist < 10;
    }
    return false;
  };

  const deleteSelected = () => {
    if (!selectedElement) return;
    const newElements = elements.filter(el => el.id !== selectedElement);
    setElements(newElements);
    addToHistory(newElements);
    setSelectedElement(null);
  };

  const duplicateSelected = () => {
    if (!selectedElement) return;
    const el = elements.find(e => e.id === selectedElement);
    if (!el) return;
    const newElement: DesignElement = {
      ...el,
      id: crypto.randomUUID(),
      x: el.x + 20,
      y: el.y + 20,
      zIndex: elements.length
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    addToHistory(newElements);
    setSelectedElement(newElement.id);
  };

  const addRouteTemplate = (routeKey: string) => {
    const template = routeTemplates[routeKey as keyof typeof routeTemplates];
    if (!template) return;

    const startX = CANVAS_WIDTH / 2;
    const startY = CANVAS_HEIGHT * 0.7;
    
    const path = template.path.map(([dx, dy]) => ({
      x: startX + dx,
      y: startY + dy
    }));

    const newElement: DesignElement = {
      id: crypto.randomUUID(),
      type: 'arrow',
      x: path[0].x,
      y: path[0].y,
      path: path,
      color: '#EF4444',
      borderWidth: 3,
      zIndex: elements.length
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    addToHistory(newElements);
  };

  const exportToPNG = async () => {
    if (!canvasRef.current) return;
    const canvas = await html2canvas(canvasRef.current, { backgroundColor: null });
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'play-diagram.png';
    link.href = url;
    link.click();
  };

  const exportToPDF = async () => {
    if (!canvasRef.current) return;
    const canvas = await html2canvas(canvasRef.current, { backgroundColor: null });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [CANVAS_WIDTH, CANVAS_HEIGHT]
    });
    pdf.addImage(imgData, 'PNG', 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    pdf.save('play-diagram.pdf');
  };

  const handleSave = () => {
    const data: PlayDiagramData = {
      elements,
      background,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      showFieldLines
    };
    onSave(data);
  };

  const selectedEl = elements.find(el => el.id === selectedElement);

  return (
    <div className="flex flex-col h-full">
      {/* Top Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-gray-100 border-b flex-wrap">
        {/* File Actions */}
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={handleSave}>
            Save Play
          </Button>
          {onCancel && (
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Undo/Redo */}
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={undo} disabled={historyIndex <= 0}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={redo} disabled={historyIndex >= history.length - 1}>
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Tools */}
        <ToggleGroup type="single" value={tool} onValueChange={(v) => v && setTool(v as Tool)}>
          <ToggleGroupItem value="select" size="sm">
            <MousePointer2 className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="text" size="sm">
            <Type className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="player-o" size="sm" title="Add Offensive Player">
            <Users className="h-4 w-4 text-green-600" />
          </ToggleGroupItem>
          <ToggleGroupItem value="player-d" size="sm" title="Add Defensive Player">
            <Shield className="h-4 w-4 text-amber-600" />
          </ToggleGroupItem>
          <ToggleGroupItem value="arrow" size="sm">
            <ArrowRight className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="freehand" size="sm" title="Draw Freehand">
            <TrendingUp className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="rectangle" size="sm">
            <Square className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="circle" size="sm">
            <Circle className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="line" size="sm">
            <Minus className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <Separator orientation="vertical" className="h-6" />

        {/* Edit Actions */}
        {selectedElement && (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={duplicateSelected}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={deleteSelected}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        <Separator orientation="vertical" className="h-6" />

        {/* Export */}
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={exportToPNG}>
            <FileImage className="h-4 w-4 mr-1" />
            PNG
          </Button>
          <Button size="sm" variant="outline" onClick={exportToPDF}>
            <FileText className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* Secondary Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-gray-50 border-b flex-wrap text-sm">
        {/* Route Templates */}
        <Label className="text-xs font-semibold">Routes:</Label>
        <div className="flex gap-1 flex-wrap">
          {Object.entries(routeTemplates).map(([key, template]) => (
            <Button
              key={key}
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => addRouteTemplate(key)}
            >
              {template.name}
            </Button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Colors */}
        <div className="flex items-center gap-2">
          <Label className="text-xs">Color:</Label>
          <Input
            type="color"
            value={fontColor}
            onChange={(e) => setFontColor(e.target.value)}
            className="w-12 h-7"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs">Fill:</Label>
          <Input
            type="color"
            value={fillColor}
            onChange={(e) => setFillColor(e.target.value)}
            className="w-12 h-7"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs">Border:</Label>
          <Input
            type="color"
            value={borderColor}
            onChange={(e) => setBorderColor(e.target.value)}
            className="w-12 h-7"
          />
          <Input
            type="number"
            min="1"
            max="10"
            value={borderWidth}
            onChange={(e) => setBorderWidth(Number(e.target.value))}
            className="w-16 h-7"
          />
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Background */}
        <div className="flex items-center gap-2">
          <Label className="text-xs">Field:</Label>
          <Select value={background} onValueChange={setBackground}>
            <SelectTrigger className="w-32 h-7">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="#2D5016">Grass Green</SelectItem>
              <SelectItem value="#1E3A0E">Dark Green</SelectItem>
              <SelectItem value="#FFFFFF">White</SelectItem>
              <SelectItem value="#000000">Black</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={showFieldLines}
              onChange={(e) => setShowFieldLines(e.target.checked)}
            />
            Yard Lines
          </label>
        </div>

        {/* Font Size */}
        {selectedEl?.type === 'text' && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <Label className="text-xs">Font:</Label>
              <Select
                value={selectedEl.fontSize?.toString() || '16'}
                onValueChange={(v) => {
                  const newElements = elements.map(el =>
                    el.id === selectedElement ? { ...el, fontSize: Number(v) } : el
                  );
                  setElements(newElements);
                }}
              >
                <SelectTrigger className="w-20 h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontSizes.map(size => (
                    <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto bg-gray-200 p-4">
        <div className="mx-auto" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          <div
            ref={canvasRef}
            className="relative border-2 border-gray-400 shadow-lg cursor-crosshair"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              backgroundColor: background
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Field Grid */}
            {showFieldLines && (
              <svg className="absolute inset-0 pointer-events-none" width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
                {/* Yard lines (every 10 yards) */}
                {Array.from({ length: 11 }).map((_, i) => {
                  const x = (i / 10) * CANVAS_WIDTH;
                  return (
                    <g key={`yard-${i}`}>
                      <line
                        x1={x}
                        y1={0}
                        x2={x}
                        y2={CANVAS_HEIGHT}
                        stroke="#ffffff"
                        strokeWidth={i === 0 || i === 10 ? 3 : 2}
                        opacity={0.3}
                      />
                      {i > 0 && i < 10 && (
                        <>
                          <text x={x} y={30} fill="#ffffff" fontSize="20" textAnchor="middle" opacity={0.5}>
                            {i * 10}
                          </text>
                          <text x={x} y={CANVAS_HEIGHT - 10} fill="#ffffff" fontSize="20" textAnchor="middle" opacity={0.5}>
                            {i * 10}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}
                {/* 5-yard hash marks */}
                {Array.from({ length: 21 }).map((_, i) => {
                  if (i % 2 === 0) return null;
                  const x = (i / 20) * CANVAS_WIDTH;
                  return (
                    <line
                      key={`hash-${i}`}
                      x1={x}
                      y1={CANVAS_HEIGHT * 0.3}
                      x2={x}
                      y2={CANVAS_HEIGHT * 0.7}
                      stroke="#ffffff"
                      strokeWidth={1}
                      opacity={0.2}
                    />
                  );
                })}
              </svg>
            )}

            {/* Render Elements */}
            {elements.map((el) => (
              <div
                key={el.id}
                className={`absolute ${selectedElement === el.id ? 'ring-2 ring-blue-500' : ''}`}
                style={{
                  left: el.x,
                  top: el.y,
                  zIndex: el.zIndex,
                  pointerEvents: tool === 'select' ? 'auto' : 'none'
                }}
              >
                {el.type === 'text' && (
                  <div
                    style={{
                      color: el.color,
                      fontSize: el.fontSize,
                      fontFamily: el.fontFamily,
                      fontWeight: el.fontWeight,
                      fontStyle: el.fontStyle,
                      textDecoration: el.textDecoration,
                      textAlign: el.textAlign,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {el.content}
                  </div>
                )}

                {el.type === 'player' && (
                  <div
                    className="flex items-center justify-center font-bold rounded-full"
                    style={{
                      width: el.width,
                      height: el.height,
                      backgroundColor: el.backgroundColor,
                      color: el.color,
                      border: `${el.borderWidth}px solid ${el.borderColor}`,
                      fontSize: el.fontSize
                    }}
                  >
                    {el.content}
                  </div>
                )}

                {(el.type === 'rectangle' || el.type === 'circle' || el.type === 'triangle') && (
                  <div
                    className={el.type === 'circle' ? 'rounded-full' : ''}
                    style={{
                      width: el.width,
                      height: el.height,
                      backgroundColor: el.backgroundColor,
                      border: `${el.borderWidth}px solid ${el.borderColor}`
                    }}
                  />
                )}
              </div>
            ))}

            {/* Render lines and arrows */}
            <svg className="absolute inset-0 pointer-events-none" width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill="#EF4444" />
                </marker>
              </defs>

              {elements.map((el) => {
                if (el.type === 'line' || el.type === 'arrow') {
                  if (el.path && el.path.length > 1) {
                    const pathD = el.path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    return (
                      <path
                        key={el.id}
                        d={pathD}
                        stroke={el.color}
                        strokeWidth={el.borderWidth}
                        fill="none"
                        markerEnd={el.type === 'arrow' ? 'url(#arrowhead)' : undefined}
                      />
                    );
                  } else if (el.x2 !== undefined && el.y2 !== undefined) {
                    return (
                      <line
                        key={el.id}
                        x1={el.x}
                        y1={el.y}
                        x2={el.x2}
                        y2={el.y2}
                        stroke={el.color}
                        strokeWidth={el.borderWidth}
                        markerEnd={el.type === 'arrow' ? 'url(#arrowhead)' : undefined}
                      />
                    );
                  }
                }

                if (el.type === 'freehand' && el.path && el.path.length > 1) {
                  const pathD = el.path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  return (
                    <path
                      key={el.id}
                      d={pathD}
                      stroke={el.color}
                      strokeWidth={el.borderWidth}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                }

                return null;
              })}

              {/* Draw preview while drawing */}
              {isDrawing && tool === 'freehand' && drawingPath.length > 1 && (
                <path
                  d={drawingPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                  stroke={fontColor}
                  strokeWidth={borderWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.5}
                />
              )}

              {isDrawing && (tool === 'line' || tool === 'arrow') && drawStart && (
                <line
                  x1={drawStart.x}
                  y1={drawStart.y}
                  x2={drawingPath[drawingPath.length - 1]?.x || drawStart.x}
                  y2={drawingPath[drawingPath.length - 1]?.y || drawStart.y}
                  stroke={fontColor}
                  strokeWidth={borderWidth}
                  opacity={0.5}
                  markerEnd={tool === 'arrow' ? 'url(#arrowhead)' : undefined}
                />
              )}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
