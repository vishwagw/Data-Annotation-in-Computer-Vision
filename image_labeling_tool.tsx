import React, { useState, useRef, useEffect } from 'react';
import { Upload, Tag, Download, Trash2, Plus, X } from 'lucide-react';

export default function ImageLabelingTool() {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [labels, setLabels] = useState([]);
  const [newLabel, setNewLabel] = useState('');
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBox, setCurrentBox] = useState(null);
  const [mode, setMode] = useState('classification'); // 'classification' or 'detection'
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    if (images[currentIndex] && canvasRef.current) {
      drawCanvas();
    }
  }, [currentIndex, boxes, images]);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const imagePromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            id: Date.now() + Math.random(),
            url: event.target.result,
            name: file.name,
            labels: [],
            boxes: []
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then(newImages => {
      setImages(prev => [...prev, ...newImages]);
    });
  };

  const addLabel = () => {
    if (newLabel.trim() && !labels.includes(newLabel.trim())) {
      setLabels(prev => [...prev, newLabel.trim()]);
      setNewLabel('');
    }
  };

  const removeLabel = (labelToRemove) => {
    setLabels(prev => prev.filter(l => l !== labelToRemove));
    if (selectedLabel === labelToRemove) {
      setSelectedLabel(null);
    }
  };

  const assignClassificationLabel = (label) => {
    if (!images[currentIndex]) return;
    
    const updatedImages = [...images];
    const labelIndex = updatedImages[currentIndex].labels.indexOf(label);
    
    if (labelIndex > -1) {
      updatedImages[currentIndex].labels.splice(labelIndex, 1);
    } else {
      updatedImages[currentIndex].labels.push(label);
    }
    
    setImages(updatedImages);
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    if (!img || !img.complete) return;

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing boxes
    const currentBoxes = images[currentIndex]?.boxes || [];
    currentBoxes.forEach(box => {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      
      // Draw label
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(box.x, box.y - 20, ctx.measureText(box.label).width + 10, 20);
      ctx.fillStyle = 'white';
      ctx.font = '14px sans-serif';
      ctx.fillText(box.label, box.x + 5, box.y - 5);
    });

    // Draw current box being drawn
    if (currentBox) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
    }
  };

  const handleMouseDown = (e) => {
    if (mode !== 'detection' || !selectedLabel) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentBox({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentBox) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentBox({
      ...currentBox,
      width: x - currentBox.x,
      height: y - currentBox.y
    });

    drawCanvas();
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox || !selectedLabel) return;

    if (Math.abs(currentBox.width) > 10 && Math.abs(currentBox.height) > 10) {
      const normalizedBox = {
        x: currentBox.width < 0 ? currentBox.x + currentBox.width : currentBox.x,
        y: currentBox.height < 0 ? currentBox.y + currentBox.height : currentBox.y,
        width: Math.abs(currentBox.width),
        height: Math.abs(currentBox.height),
        label: selectedLabel
      };

      const updatedImages = [...images];
      updatedImages[currentIndex].boxes.push(normalizedBox);
      setImages(updatedImages);
    }

    setIsDrawing(false);
    setCurrentBox(null);
  };

  const removeBox = (index) => {
    const updatedImages = [...images];
    updatedImages[currentIndex].boxes.splice(index, 1);
    setImages(updatedImages);
  };

  const exportData = () => {
    const exportData = images.map(img => ({
      filename: img.name,
      labels: img.labels,
      boxes: img.boxes
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'labeled_data.json';
    a.click();
  };

  const currentImage = images[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Image Labeling Tool</h1>

          {/* Mode Selection */}
          <div className="mb-6 flex gap-4">
            <button
              onClick={() => setMode('classification')}
              className={`px-4 py-2 rounded-lg font-medium ${
                mode === 'classification'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Classification
            </button>
            <button
              onClick={() => setMode('detection')}
              className={`px-4 py-2 rounded-lg font-medium ${
                mode === 'detection'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Object Detection
            </button>
          </div>

          {/* Upload Section */}
          <div className="mb-6">
            <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
              <div className="flex flex-col items-center">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Upload Images</span>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Label Management */}
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3">Labels</h2>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addLabel()}
                placeholder="Enter label name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addLabel}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {labels.map(label => (
                <div
                  key={label}
                  onClick={() => setSelectedLabel(label)}
                  className={`px-3 py-1 rounded-full flex items-center gap-2 cursor-pointer ${
                    selectedLabel === label
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border border-gray-300 text-gray-700'
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  {label}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLabel(label);
                    }}
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Image Display */}
          {images.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-gray-100 rounded-lg p-4 relative">
                  <img
                    ref={imageRef}
                    src={currentImage.url}
                    alt={currentImage.name}
                    onLoad={drawCanvas}
                    className="max-w-full h-auto mx-auto"
                    style={{ display: mode === 'detection' ? 'none' : 'block' }}
                  />
                  {mode === 'detection' && (
                    <div className="relative">
                      <img
                        ref={imageRef}
                        src={currentImage.url}
                        alt={currentImage.name}
                        onLoad={drawCanvas}
                        className="max-w-full h-auto mx-auto"
                      />
                      <canvas
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        className="absolute top-0 left-0 cursor-crosshair"
                      />
                    </div>
                  )}
                  
                  <div className="mt-4 flex justify-between items-center">
                    <button
                      onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                      disabled={currentIndex === 0}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      {currentIndex + 1} / {images.length}
                    </span>
                    <button
                      onClick={() => setCurrentIndex(Math.min(images.length - 1, currentIndex + 1))}
                      disabled={currentIndex === images.length - 1}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {mode === 'classification' ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3">Assign Labels</h3>
                    <div className="space-y-2">
                      {labels.map(label => (
                        <button
                          key={label}
                          onClick={() => assignClassificationLabel(label)}
                          className={`w-full px-4 py-2 rounded-lg text-left ${
                            currentImage.labels.includes(label)
                              ? 'bg-blue-500 text-white'
                              : 'bg-white border border-gray-300 text-gray-700'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3">Bounding Boxes</h3>
                    {selectedLabel && (
                      <p className="text-sm text-gray-600 mb-3">
                        Draw boxes with: <span className="font-semibold text-blue-500">{selectedLabel}</span>
                      </p>
                    )}
                    <div className="space-y-2">
                      {currentImage.boxes.map((box, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                          <span className="text-sm">{box.label}</span>
                          <button
                            onClick={() => removeBox(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={exportData}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Data
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              Upload images to start labeling
            </div>
          )}
        </div>
      </div>
    </div>
  );
}