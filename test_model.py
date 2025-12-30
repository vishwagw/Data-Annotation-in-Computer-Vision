import webview
import os
import sys
from pathlib import Path

# HTML content with the React app embedded
HTML_CONTENT = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dataset Annotation Checker</title>
    <script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
    <script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/lucide/0.263.1/umd/lucide.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    <div id="root"></div>
    
    <script type="text/babel">
        const { Upload, AlertCircle, CheckCircle, ChevronLeft, ChevronRight } = lucide;
        const { useState } = React;

        function AnnotationChecker() {
          const [images, setImages] = useState([]);
          const [currentIndex, setCurrentIndex] = useState(0);
          const [stats, setStats] = useState(null);

          const handleFileUpload = async (e) => {
            const files = Array.from(e.target.files);
            const imageFiles = files.filter(f => f.type.startsWith('image/'));
            
            if (imageFiles.length === 0) {
              alert('Please select image files from your dataset folder');
              return;
            }

            const loadedImages = await Promise.all(
              imageFiles.map(async (file) => {
                const url = URL.createObjectURL(file);
                const pathParts = file.webkitRelativePath?.split('/') || file.name.split('/');
                const fileName = file.name;
                
                return {
                  url,
                  name: fileName,
                  file,
                  label: 'Unknown'
                };
              })
            );

            setImages(loadedImages);
            setCurrentIndex(0);
            calculateStats(loadedImages);
          };

          const calculateStats = (imgs) => {
            const labelCounts = {};
            imgs.forEach(img => {
              labelCounts[img.label] = (labelCounts[img.label] || 0) + 1;
            });

            setStats({
              total: imgs.length,
              labels: Object.keys(labelCounts).length,
              distribution: labelCounts
            });
          };

          const handleManualLabel = (label) => {
            const updated = [...images];
            updated[currentIndex].label = label;
            updated[currentIndex].manuallyLabeled = true;
            setImages(updated);
            calculateStats(updated);
          };

          const nextImage = () => {
            if (currentIndex < images.length - 1) {
              setCurrentIndex(currentIndex + 1);
            }
          };

          const prevImage = () => {
            if (currentIndex > 0) {
              setCurrentIndex(currentIndex - 1);
            }
          };

          const exportLabels = () => {
            const labelData = images.map(img => ({
              filename: img.name,
              label: img.label,
              verified: img.manuallyLabeled || false
            }));
            
            const dataStr = JSON.stringify(labelData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'annotations.json';
            link.click();
          };

          const currentImage = images[currentIndex];

          return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
              <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">Dataset Annotation Checker</h1>
                <p className="text-gray-600 mb-8">Visualize and verify your image classification labels</p>

                {images.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-lg p-12">
                    <div className="text-center">
                      <Upload className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
                      <h2 className="text-2xl font-semibold mb-4">Upload Your Dataset</h2>
                      <p className="text-gray-600 mb-6">
                        Select images from your dataset folder
                      </p>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="block mx-auto mb-4 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {stats && (
                      <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-semibold">Dataset Statistics</h3>
                          <button
                            onClick={exportLabels}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                          >
                            Export Labels
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
                            <div className="text-sm text-gray-600">Total Images</div>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg">
                            <div className="text-3xl font-bold text-green-600">{stats.labels}</div>
                            <div className="text-sm text-gray-600">Classes</div>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg">
                            <div className="text-3xl font-bold text-purple-600">
                              {images.filter(img => img.manuallyLabeled).length}
                            </div>
                            <div className="text-sm text-gray-600">Verified</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-white rounded-xl shadow-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold">
                          Image {currentIndex + 1} of {images.length}
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={prevImage}
                            disabled={currentIndex === 0}
                            className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            onClick={nextImage}
                            disabled={currentIndex === images.length - 1}
                            className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {currentImage && (
                        <div className="space-y-4">
                          <div className="relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: '400px' }}>
                            <img
                              src={currentImage.url}
                              alt={currentImage.name}
                              className="max-h-[500px] max-w-full object-contain"
                            />
                          </div>

                          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                            <div>
                              <p className="text-sm text-gray-600">Filename</p>
                              <p className="font-semibold">{currentImage.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-gray-600">Label:</p>
                              <span className={`px-4 py-2 rounded-lg font-semibold ${
                                currentImage.manuallyLabeled 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {currentImage.label}
                              </span>
                              {currentImage.manuallyLabeled && (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              )}
                            </div>
                          </div>

                          <div className="bg-indigo-50 p-4 rounded-lg">
                            <p className="text-sm font-semibold mb-2">Assign or verify label:</p>
                            <div className="flex gap-2 flex-wrap">
                              {Object.keys(stats?.distribution || {}).map(label => (
                                <button
                                  key={label}
                                  onClick={() => handleManualLabel(label)}
                                  className="px-4 py-2 bg-white rounded-lg hover:bg-indigo-100 border border-indigo-200 transition"
                                >
                                  {label}
                                </button>
                              ))}
                              <input
                                type="text"
                                placeholder="New label..."
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && e.target.value.trim()) {
                                    handleManualLabel(e.target.value.trim());
                                    e.target.value = '';
                                  }
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {stats && (
                      <div className="bg-white rounded-xl shadow-lg p-6">
                        <h3 className="text-xl font-semibold mb-4">Class Distribution</h3>
                        <div className="space-y-2">
                          {Object.entries(stats.distribution).map(([label, count]) => (
                            <div key={label} className="flex items-center gap-4">
                              <div className="w-32 text-sm font-medium">{label}</div>
                              <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                                <div
                                  className="bg-indigo-600 h-6 rounded-full flex items-center justify-end pr-2"
                                  style={{ width: `${(count / stats.total) * 100}%` }}
                                >
                                  <span className="text-xs text-white font-semibold">{count}</span>
                                </div>
                              </div>
                              <div className="w-16 text-sm text-gray-600 text-right">
                                {((count / stats.total) * 100).toFixed(1)}%
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        }

        ReactDOM.render(<AnnotationChecker />, document.getElementById('root'));
    </script>
</body>
</html>
"""

class API:
    """Backend API for additional desktop features"""
    
    def get_user_documents_path(self):
        """Get the user's documents directory"""
        if sys.platform == 'win32':
            return str(Path.home() / 'Documents')
        else:
            return str(Path.home())

def main():
    api = API()
    
    # Create the webview window
    window = webview.create_window(
        'Dataset Annotation Checker',
        html=HTML_CONTENT,
        js_api=api,
        width=1400,
        height=900,
        resizable=True,
        background_color='#EFF6FF'
    )
    
    # Start the application
    webview.start(debug=False)

if __name__ == '__main__':
    main()
