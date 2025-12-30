import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Trash2, Square, Circle, Tag, Save, ZoomIn, ZoomOut, Move } from 'lucide-react';

const ImageAnnotationTool = () => {
  const [images, setImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [annotations, setAnnotations] = useState({});
  const [currentTool, setCurrentTool] = useState('box');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [labels, setLabels] = useState(['person', 'car', 'object']);
  const [newLabel, setNewLabel] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);

  const currentImage = images[currentImageIndex];
  const currentImageAnnotations = annotations[currentImage?.name] || [];

  useEffect(() => {
    drawCanvas();
  }, [currentImageIndex, annotations, zoom, pan, currentAnnotation]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImages(prev => [...prev, { name: file.name, src: event.target.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !currentImage) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
    const x = (canvas.width / zoom - image.width * scale) / 2;
    const y = (canvas.height / zoom - image.height * scale) / 2;
    
    ctx.drawImage(image, x, y, image.width * scale, image.height * scale);

    currentImageAnnotations.forEach((ann, idx) => {
      ctx.strokeStyle = idx === currentImageAnnotations.length - 1 ? '#00ff00' : '#ff0000';
      ctx.lineWidth = 2 / zoom;
      ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';

      if (ann.type === 'box') {
        ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
        ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
      } else if (ann.type === 'circle') {
        ctx.beginPath();
        ctx.arc(ann.x + ann.width / 2, ann.y + ann.height / 2, Math.max(Math.abs(ann.width), Math.abs(ann.height)) / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = '#ff0000';
      ctx.font = `${14 / zoom}px Arial`;
      ctx.fillText(ann.label, ann.x, ann.y - 5 / zoom);
    });

    if (currentAnnotation) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2 / zoom;
      ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';

      if (currentTool === 'box') {
        ctx.fillRect(currentAnnotation.x, currentAnnotation.y, currentAnnotation.width, currentAnnotation.height);
        ctx.strokeRect(currentAnnotation.x, currentAnnotation.y, currentAnnotation.width, currentAnnotation.height);
      } else if (currentTool === 'circle') {
        ctx.beginPath();
        ctx.arc(
          currentAnnotation.x + currentAnnotation.width / 2,
          currentAnnotation.y + currentAnnotation.height / 2,
          Math.max(Math.abs(currentAnnotation.width), Math.abs(currentAnnotation.height)) / 2,
          0, 2 * Math.PI
        );
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left - pan.x) / zoom);
    const y = ((e.clientY - rect.top - pan.y) / zoom);
    return { x, y };
  };

  const handleMouseDown = (e) => {
    if (currentTool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (!selectedLabel) {
      alert('Please select a label first');
      return;
    }

    const point = getCanvasCoordinates(e);
    setIsDrawing(true);
    setStartPoint(point);
    setCurrentAnnotation({ x: point.x, y: point.y, width: 0, height: 0, type: currentTool, label: selectedLabel });
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (!isDrawing || !startPoint) return;

    const point = getCanvasCoordinates(e);
    setCurrentAnnotation({
      x: Math.min(startPoint.x, point.x),
      y: Math.min(startPoint.y, point.y),
      width: Math.abs(point.x - startPoint.x),
      height: Math.abs(point.y - startPoint.y),
      type: currentTool,
      label: selectedLabel
    });
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDrawing && currentAnnotation && currentAnnotation.width > 5 && currentAnnotation.height > 5) {
      const imageName = currentImage.name;
      setAnnotations(prev => ({
        ...prev,
        [imageName]: [...(prev[imageName] || []), currentAnnotation]
      }));
    }
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentAnnotation(null);
  };

  const deleteLastAnnotation = () => {
    if (currentImageAnnotations.length === 0) return;
    const imageName = currentImage.name;
    setAnnotations(prev => ({
      ...prev,
      [imageName]: prev[imageName].slice(0, -1)
    }));
  };

  const addLabel = () => {
    if (newLabel && !labels.includes(newLabel)) {
      setLabels([...labels, newLabel]);
      setNewLabel('');
    }
  };

  const exportAnnotations = () => {
    const data = JSON.stringify(annotations, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotations.json';
    a.click();
  };

  const handleZoom = (delta) => {
    setZoom(prev => Math.max(0.1, Math.min(5, prev + delta)));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Image Annotation Tool</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                >
                  <Upload size={16} /> Upload Images
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <button
                  onClick={() => setCurrentTool('box')}
                  className={`flex items-center gap-2 px-4 py-2 rounded ${currentTool === 'box' ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                  <Square size={16} /> Box
                </button>
                
                <button
                  onClick={() => setCurrentTool('circle')}
                  className={`flex items-center gap-2 px-4 py-2 rounded ${currentTool === 'circle' ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                  <Circle size={16} /> Circle
                </button>
                
                <button
                  onClick={() => setCurrentTool('pan')}
                  className={`flex items-center gap-2 px-4 py-2 rounded ${currentTool === 'pan' ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                  <Move size={16} /> Pan
                </button>
                
                <button
                  onClick={() => handleZoom(0.1)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  <ZoomIn size={16} /> Zoom In
                </button>
                
                <button
                  onClick={() => handleZoom(-0.1)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  <ZoomOut size={16} /> Zoom Out
                </button>
                
                <button
                  onClick={deleteLastAnnotation}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                >
                  <Trash2 size={16} /> Delete Last
                </button>
                
                <button
                  onClick={exportAnnotations}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
                >
                  <Download size={16} /> Export JSON
                </button>
              </div>

              {currentImage && (
                <>
                  <img
                    ref={imageRef}
                    src={currentImage.src}
                    alt="annotation"
                    className="hidden"
                    onLoad={drawCanvas}
                  />
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="w-full border-2 border-gray-700 rounded cursor-crosshair bg-gray-900"
                  />
                  <div className="mt-2 text-sm text-gray-400">
                    Zoom: {(zoom * 100).toFixed(0)}% | Annotations: {currentImageAnnotations.length}
                  </div>
                </>
              )}
              
              {!currentImage && (
                <div className="w-full h-96 border-2 border-dashed border-gray-700 rounded flex items-center justify-center text-gray-500">
                  Upload images to start annotating
                </div>
              )}
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Images ({images.length})</h3>
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`cursor-pointer border-2 rounded p-1 flex-shrink-0 ${idx === currentImageIndex ? 'border-blue-500' : 'border-gray-700'}`}
                  >
                    <img src={img.src} alt={img.name} className="w-20 h-20 object-cover" />
                    <div className="text-xs truncate w-20 mt-1">{img.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Tag size={16} /> Labels
              </h3>
              <div className="space-y-2 mb-4">
                {labels.map(label => (
                  <button
                    key={label}
                    onClick={() => setSelectedLabel(label)}
                    className={`w-full text-left px-3 py-2 rounded ${selectedLabel === label ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addLabel()}
                  placeholder="New label"
                  className="flex-1 px-3 py-2 bg-gray-700 rounded text-white"
                />
                <button
                  onClick={addLabel}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Current Annotations</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {currentImageAnnotations.map((ann, idx) => (
                  <div key={idx} className="bg-gray-700 p-2 rounded text-sm">
                    <div className="font-semibold">{ann.label}</div>
                    <div className="text-gray-400">
                      {ann.type} | {Math.round(ann.width)}×{Math.round(ann.height)}
                    </div>
                  </div>
                ))}
                {currentImageAnnotations.length === 0 && (
                  <div className="text-gray-500 text-sm">No annotations yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageAnnotationTool;