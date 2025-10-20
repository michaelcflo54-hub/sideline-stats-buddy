import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Redo
} from 'lucide-react';

type Tool = 'select' | 'text' | 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow' | 'freehand';
type TextAlign = 'left' | 'center' | 'right';

export interface DesignElement {
  id: string;
  type: 'text' | 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow' | 'freehand';
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
}

export interface PowerPointDesign {
  elements: DesignElement[];
  background: string;
  width: number;
  height: number;
}

interface PowerPointDesignerProps {
  initial?: PowerPointDesign | null;
  onSave: (data: PowerPointDesign) => void;
  onCancel?: () => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 20;

const colors = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000', '#808080',
  '#C0C0C0', '#800000', '#808000', '#000080', '#800080', '#008080'
];

const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

export default function PowerPointDesigner({ initial, onSave, onCancel }: PowerPointDesignerProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [elements, setElements] = useState<DesignElement[]>(() => initial?.elements || []);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPath, setDrawingPath] = useState<{ x: number; y: number }[]>([]);
  const [history, setHistory] = useState<DesignElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [background, setBackground] = useState(initial?.background || '#ffffff');
  const [textAlign, setTextAlign] = useState<TextAlign>('left');
  const [fontSize, setFontSize] = useState(16);
  const [fontColor, setFontColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('#ffffff');
  const [borderColor, setBorderColor] = useState('#000000');
  const [borderWidth, setBorderWidth] = useState(1);

  useEffect(() => {
    if (initial) {
      setElements(initial.elements || []);
      setBackground(initial.background || '#ffffff');
    }
  }, [initial]);

  const snap = (n: number) => Math.round(n / GRID_SIZE) * GRID_SIZE;

  const clientToCanvas = (e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return tool === 'freehand' ? { x, y } : { x: snap(x), y: snap(y) };
  };

  const addToHistory = (newElements: DesignElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newElements]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
    }
  };

  const addElement = (element: Omit<DesignElement, 'id' | 'zIndex'>) => {
    const newElement: DesignElement = {
      ...element,
      id: crypto.randomUUID(),
      zIndex: Math.max(...elements.map(e => e.zIndex), 0) + 1
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    addToHistory(newElements);
    setSelectedElement(newElement.id);
  };

  const updateElement = (id: string, updates: Partial<DesignElement>) => {
    const newElements = elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    );
    setElements(newElements);
    addToHistory(newElements);
  };

  const deleteElement = (id: string) => {
    const newElements = elements.filter(el => el.id !== id);
    setElements(newElements);
    addToHistory(newElements);
    if (selectedElement === id) {
      setSelectedElement(null);
    }
  };

  const duplicateElement = (id: string) => {
    const element = elements.find(el => el.id === id);
    if (element) {
      const newElement: DesignElement = {
        ...element,
        id: crypto.randomUUID(),
        x: element.x + 20,
        y: element.y + 20,
        zIndex: Math.max(...elements.map(e => e.zIndex), 0) + 1
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      addToHistory(newElements);
      setSelectedElement(newElement.id);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = clientToCanvas(e);
    
    if (tool === 'select') {
      // Find element at click position
      const clickedElement = elements
        .slice()
        .reverse()
        .find(el => {
          if (el.type === 'text') {
            return pos.x >= el.x && pos.x <= el.x + (el.width || 100) &&
                   pos.y >= el.y && pos.y <= el.y + (el.height || 20);
          } else if (el.type === 'freehand') {
            return el.path?.some(point => 
              Math.abs(point.x - pos.x) < 10 && Math.abs(point.y - pos.y) < 10
            );
          } else {
            return pos.x >= el.x && pos.x <= el.x + (el.width || 50) &&
                   pos.y >= el.y && pos.y <= el.y + (el.height || 50);
          }
        });
      
      setSelectedElement(clickedElement?.id || null);
    } else if (tool === 'freehand') {
      setIsDrawing(true);
      setDrawingPath([pos]);
    } else if (tool === 'text') {
      addElement({
        type: 'text',
        x: pos.x,
        y: pos.y,
        width: 100,
        height: 20,
        content: 'Text',
        fontSize,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign,
        color: fontColor,
        backgroundColor: 'transparent'
      });
    } else if (tool === 'line' || tool === 'arrow') {
      addElement({
        type: tool,
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color: borderColor,
        borderWidth
      });
    } else {
      addElement({
        type: tool as 'rectangle' | 'circle' | 'triangle',
        x: pos.x,
        y: pos.y,
        width: 50,
        height: 50,
        color: borderColor,
        backgroundColor: fillColor,
        borderWidth
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawing && tool === 'freehand') {
      const pos = clientToCanvas(e);
      setDrawingPath(prev => [...prev, pos]);
    } else if (selectedElement && tool === 'select') {
      const element = elements.find(el => el.id === selectedElement);
      if (element) {
        const pos = clientToCanvas(e);
        updateElement(selectedElement, { x: pos.x, y: pos.y });
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDrawing && tool === 'freehand') {
      const pos = clientToCanvas(e);
      const finalPath = [...drawingPath, pos];
      addElement({
        type: 'freehand',
        x: Math.min(...finalPath.map(p => p.x)),
        y: Math.min(...finalPath.map(p => p.y)),
        width: Math.max(...finalPath.map(p => p.x)) - Math.min(...finalPath.map(p => p.x)),
        height: Math.max(...finalPath.map(p => p.y)) - Math.min(...finalPath.map(p => p.y)),
        color: borderColor,
        path: finalPath
      });
      setIsDrawing(false);
      setDrawingPath([]);
    }
  };

  const exportPNG = async () => {
    if (!canvasRef.current) return;
    const canvas = await html2canvas(canvasRef.current, { 
      backgroundColor: background,
      scale: 2 
    });
    const data = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = data;
    a.download = 'play-design.png';
    a.click();
  };

  const exportPDF = async () => {
    if (!canvasRef.current) return;
    const canvas = await html2canvas(canvasRef.current, { 
      backgroundColor: background,
      scale: 2 
    });
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
    pdf.save('play-design.pdf');
  };

  const handleSave = () => {
    onSave({
      elements,
      background,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT
    });
  };

  const selectedElementData = elements.find(el => el.id === selectedElement);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap p-4 bg-gray-50 rounded-lg">
        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={undo} disabled={historyIndex <= 0}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={redo} disabled={historyIndex >= history.length - 1}>
            <Redo className="h-4 w-4" />
          </Button>
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        {/* Tools */}
        <div className="flex items-center gap-1">
          <Button size="sm" variant={tool === 'select' ? 'default' : 'outline'} onClick={() => setTool('select')}>
            <MousePointer2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={tool === 'text' ? 'default' : 'outline'} onClick={() => setTool('text')}>
            <Type className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={tool === 'rectangle' ? 'default' : 'outline'} onClick={() => setTool('rectangle')}>
            <Square className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={tool === 'circle' ? 'default' : 'outline'} onClick={() => setTool('circle')}>
            <Circle className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={tool === 'triangle' ? 'default' : 'outline'} onClick={() => setTool('triangle')}>
            <Triangle className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={tool === 'line' ? 'default' : 'outline'} onClick={() => setTool('line')}>
            <Minus className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={tool === 'arrow' ? 'default' : 'outline'} onClick={() => setTool('arrow')}>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={tool === 'freehand' ? 'default' : 'outline'} onClick={() => setTool('freehand')}>
            <Move className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Text Formatting */}
        {selectedElementData?.type === 'text' && (
          <div className="flex items-center gap-1">
            <Select value={fontSize.toString()} onValueChange={(v) => {
              setFontSize(parseInt(v));
              updateElement(selectedElement!, { fontSize: parseInt(v) });
            }}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontSizes.map(size => (
                  <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button size="sm" variant="outline" onClick={() => {
              const newWeight = selectedElementData.fontWeight === 'bold' ? 'normal' : 'bold';
              updateElement(selectedElement!, { fontWeight: newWeight });
            }}>
              <Bold className="h-4 w-4" />
            </Button>
            
            <Button size="sm" variant="outline" onClick={() => {
              const newStyle = selectedElementData.fontStyle === 'italic' ? 'normal' : 'italic';
              updateElement(selectedElement!, { fontStyle: newStyle });
            }}>
              <Italic className="h-4 w-4" />
            </Button>
            
            <Button size="sm" variant="outline" onClick={() => {
              const newDecoration = selectedElementData.textDecoration === 'underline' ? 'none' : 'underline';
              updateElement(selectedElement!, { textDecoration: newDecoration });
            }}>
              <Underline className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => {
                updateElement(selectedElement!, { textAlign: 'left' });
                setTextAlign('left');
              }}>
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                updateElement(selectedElement!, { textAlign: 'center' });
                setTextAlign('center');
              }}>
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                updateElement(selectedElement!, { textAlign: 'right' });
                setTextAlign('right');
              }}>
                <AlignRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <Separator orientation="vertical" className="h-6" />

        {/* Colors */}
        <div className="flex items-center gap-2">
          <Label className="text-sm">Text:</Label>
          <div className="flex gap-1">
            {colors.slice(0, 8).map(color => (
              <button
                key={color}
                className={`w-6 h-6 rounded border-2 ${fontColor === color ? 'border-gray-800' : 'border-gray-300'}`}
                style={{ backgroundColor: color }}
                onClick={() => {
                  setFontColor(color);
                  if (selectedElementData?.type === 'text') {
                    updateElement(selectedElement!, { color: color });
                  }
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm">Fill:</Label>
          <div className="flex gap-1">
            {colors.slice(0, 8).map(color => (
              <button
                key={color}
                className={`w-6 h-6 rounded border-2 ${fillColor === color ? 'border-gray-800' : 'border-gray-300'}`}
                style={{ backgroundColor: color }}
                onClick={() => {
                  setFillColor(color);
                  if (selectedElementData) {
                    updateElement(selectedElement!, { backgroundColor: color });
                  }
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm">Border:</Label>
          <div className="flex gap-1">
            {colors.slice(0, 8).map(color => (
              <button
                key={color}
                className={`w-6 h-6 rounded border-2 ${borderColor === color ? 'border-gray-800' : 'border-gray-300'}`}
                style={{ backgroundColor: color }}
                onClick={() => {
                  setBorderColor(color);
                  if (selectedElementData) {
                    updateElement(selectedElement!, { color: color, borderColor: color });
                  }
                }}
              />
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportPNG}>Export PNG</Button>
          <Button size="sm" variant="outline" onClick={exportPDF}>Export PDF</Button>
          <Button size="sm" onClick={handleSave}>Save Design</Button>
          {onCancel && (
            <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
        <div
          ref={canvasRef}
          className="relative"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            backgroundColor: background,
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Elements */}
          {elements
            .sort((a, b) => a.zIndex - b.zIndex)
            .map(element => (
            <div
              key={element.id}
              className={`absolute ${selectedElement === element.id ? 'ring-2 ring-blue-500' : ''}`}
              style={{
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                transform: `rotate(${element.rotation || 0}deg)`,
                cursor: tool === 'select' ? 'move' : 'default'
              }}
              onClick={() => setSelectedElement(element.id)}
            >
              {element.type === 'text' && (
                <div
                  style={{
                    fontSize: element.fontSize,
                    fontFamily: element.fontFamily,
                    fontWeight: element.fontWeight,
                    fontStyle: element.fontStyle,
                    textDecoration: element.textDecoration,
                    textAlign: element.textAlign,
                    color: element.color,
                    backgroundColor: element.backgroundColor,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px'
                  }}
                  contentEditable
                  onBlur={(e) => updateElement(element.id, { content: e.currentTarget.textContent || '' })}
                  suppressContentEditableWarning
                >
                  {element.content}
                </div>
              )}
              
              {element.type === 'rectangle' && (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: element.backgroundColor,
                    border: `${element.borderWidth}px solid ${element.borderColor}`,
                    borderRadius: '4px'
                  }}
                />
              )}
              
              {element.type === 'circle' && (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: element.backgroundColor,
                    border: `${element.borderWidth}px solid ${element.borderColor}`,
                    borderRadius: '50%'
                  }}
                />
              )}
              
              {element.type === 'triangle' && (
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: `${(element.width || 50) / 2}px solid transparent`,
                    borderRight: `${(element.width || 50) / 2}px solid transparent`,
                    borderBottom: `${element.height || 50}px solid ${element.backgroundColor}`,
                    borderBottomColor: element.backgroundColor
                  }}
                />
              )}
              
              {element.type === 'line' && (
                <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                  <line
                    x1="0"
                    y1="0"
                    x2={element.width || 50}
                    y2={element.height || 0}
                    stroke={element.color}
                    strokeWidth={element.borderWidth}
                  />
                </svg>
              )}
              
              {element.type === 'arrow' && (
                <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                  <defs>
                    <marker id={`arrow-${element.id}`} markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
                      <polygon points="0,0 8,4 0,8" fill={element.color} />
                    </marker>
                  </defs>
                  <line
                    x1="0"
                    y1="0"
                    x2={element.width || 50}
                    y2={element.height || 0}
                    stroke={element.color}
                    strokeWidth={element.borderWidth}
                    markerEnd={`url(#arrow-${element.id})`}
                  />
                </svg>
              )}
              
              {element.type === 'freehand' && element.path && (
                <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                  <path
                    d={`M ${element.path.map((p, i) => `${p.x - element.x} ${p.y - element.y}`).join(' L ')}`}
                    fill="none"
                    stroke={element.color}
                    strokeWidth={element.borderWidth}
                  />
                </svg>
              )}
            </div>
          ))}

          {/* Drawing path while drawing */}
          {isDrawing && drawingPath.length > 1 && (
            <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
              <path
                d={`M ${drawingPath.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                fill="none"
                stroke={borderColor}
                strokeWidth={borderWidth}
              />
            </svg>
          )}
        </div>
      </div>

      {/* Element Properties Panel */}
      {selectedElementData && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Element Properties</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Position X</Label>
              <Input
                type="number"
                value={selectedElementData.x}
                onChange={(e) => updateElement(selectedElement!, { x: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Position Y</Label>
              <Input
                type="number"
                value={selectedElementData.y}
                onChange={(e) => updateElement(selectedElement!, { y: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Width</Label>
              <Input
                type="number"
                value={selectedElementData.width || 0}
                onChange={(e) => updateElement(selectedElement!, { width: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Height</Label>
              <Input
                type="number"
                value={selectedElementData.height || 0}
                onChange={(e) => updateElement(selectedElement!, { height: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={() => duplicateElement(selectedElement!)}>
              <Copy className="h-4 w-4 mr-1" />
              Duplicate
            </Button>
            <Button size="sm" variant="destructive" onClick={() => deleteElement(selectedElement!)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
