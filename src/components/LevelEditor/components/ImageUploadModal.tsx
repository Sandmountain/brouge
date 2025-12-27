import React, { useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (
    file: File,
    gridWidth: number,
    gridHeight: number,
    imageScale: number
  ) => void;
  currentGridWidth: number;
  currentGridHeight: number;
}

export function ImageUploadModal({
  isOpen,
  onClose,
  onApply,
  currentGridWidth,
  currentGridHeight,
}: ImageUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [gridWidth, setGridWidth] = useState(currentGridWidth);
  const [gridHeight, setGridHeight] = useState(currentGridHeight);
  const [imageScale, setImageScale] = useState(1.0);
  const [previewBricks, setPreviewBricks] = useState<number[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Update grid size when current values change
  useEffect(() => {
    setGridWidth(currentGridWidth);
    setGridHeight(currentGridHeight);
  }, [currentGridWidth, currentGridHeight]);

  // Clean up preview URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setImageScale(1.0);
      // Don't call updatePreview here - let useEffect handle it
    }
  };

  // Helper functions for pixel sampling
  const samplePixel = (
    imageData: ImageData,
    x: number,
    y: number,
    imageWidth: number
  ): number | null => {
    const pixelX = Math.round(x);
    const pixelY = Math.round(y);
    const clampedX = Math.max(0, Math.min(pixelX, imageWidth - 1));
    const clampedY = Math.max(0, Math.min(pixelY, imageData.height - 1));
    const index = (clampedY * imageWidth + clampedX) * 4;
    const a = imageData.data[index + 3];
    if (a < 128) return null;
    const r = imageData.data[index];
    const g = imageData.data[index + 1];
    const b = imageData.data[index + 2];
    return (r << 16) | (g << 8) | b;
  };

  const areColorsSimilar = (color1: number, color2: number, threshold: number = 10): boolean => {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;
    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;
    return (
      Math.abs(r1 - r2) <= threshold &&
      Math.abs(g1 - g2) <= threshold &&
      Math.abs(b1 - b2) <= threshold
    );
  };

  const updatePreview = useCallback(async (
    file: File,
    width: number,
    height: number,
    scale: number,
    url: string
  ) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      if (!canvasRef.current) return;
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate scaled dimensions
      const availableWidth = Math.max(1, width - 2); // 1 cell padding each side
      const availableHeight = Math.max(1, height - 2);
      const baseScale = Math.min(
        availableWidth / img.width,
        availableHeight / img.height
      );
      const finalScale = baseScale * scale;
      const scaledWidth = img.width * finalScale;
      const scaledHeight = img.height * finalScale;
      const offsetX = (width - scaledWidth) / 2;
      const offsetY = (height - scaledHeight) / 2;

      // Set canvas size (scale up for quality)
      const canvasScale = 4;
      canvas.width = width * canvasScale;
      canvas.height = height * canvasScale;

      // Draw grid background
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid lines
      ctx.strokeStyle = "#333333";
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x++) {
        const px = (x * canvasScale);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y++) {
        const py = (y * canvasScale);
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(canvas.width, py);
        ctx.stroke();
      }

      // Draw the scaled image
      ctx.drawImage(
        img,
        0,
        0,
        img.width,
        img.height,
        offsetX * canvasScale,
        offsetY * canvasScale,
        scaledWidth * canvasScale,
        scaledHeight * canvasScale
      );

      // Sample pixels to create preview bricks
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const bricks: number[][] = [];
      
      for (let row = 0; row < height; row++) {
        bricks[row] = [];
        for (let col = 0; col < width; col++) {
          const cellCenterX = (col + 0.5) * canvasScale;
          const cellCenterY = (row + 0.5) * canvasScale;
          const leftHalfX = (col + 0.25) * canvasScale;
          const rightHalfX = (col + 0.75) * canvasScale;

          const leftColor = samplePixel(imageData, leftHalfX, cellCenterY, canvas.width);
          const rightColor = samplePixel(imageData, rightHalfX, cellCenterY, canvas.width);

          // 0 = empty, 1 = left half, 2 = right half, 3 = full block
          if (leftColor === null && rightColor === null) {
            bricks[row][col] = 0;
          } else if (leftColor !== null && rightColor !== null) {
            if (areColorsSimilar(leftColor, rightColor, 10)) {
              bricks[row][col] = 3; // Full block
            } else {
              bricks[row][col] = 1; // Both halves (will show as two)
            }
          } else if (leftColor !== null) {
            bricks[row][col] = 1; // Left half
          } else {
            bricks[row][col] = 2; // Right half
          }
        }
      }

      setPreviewBricks(bricks);
    };
    img.src = url;
  }, []);

  // Update preview when file, grid size, or scale changes
  useEffect(() => {
    if (selectedFile && previewUrl) {
      updatePreview(selectedFile, gridWidth, gridHeight, imageScale, previewUrl);
    }
  }, [selectedFile, previewUrl, gridWidth, gridHeight, imageScale, updatePreview]);

  const handleGridWidthChange = (newWidth: number) => {
    const width = Math.max(5, Math.min(30, newWidth));
    setGridWidth(width);
    // Preview will update via useEffect
  };

  const handleGridHeightChange = (newHeight: number) => {
    const height = Math.max(3, Math.min(30, newHeight));
    setGridHeight(height);
    // Preview will update via useEffect
  };

  const handleScaleChange = (newScale: number) => {
    const scale = Math.max(0.1, Math.min(2.0, newScale));
    setImageScale(scale);
    // Preview will update via useEffect
  };

  const handleApply = () => {
    if (selectedFile) {
      onApply(selectedFile, gridWidth, gridHeight, imageScale);
      handleClose();
    }
  };

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    setPreviewBricks([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "900px", width: "90vw" }}>
        <div className="modal-header">
          <h2>Upload Image</h2>
          <button className="modal-close" onClick={handleClose} title="Close">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* File Upload */}
          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#ffffff" }}>
              Select Image
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{
                padding: "8px",
                background: "#2a2a2a",
                border: "1px solid #e63946",
                borderRadius: "4px",
                color: "#ffffff",
                width: "100%",
              }}
            />
          </div>

          {previewUrl && (
            <>
              {/* Preview Canvas */}
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#ffffff" }}>
                  Preview
                </label>
                <div style={{ border: "2px solid #e63946", borderRadius: "4px", overflow: "hidden", display: "inline-block" }}>
                  <canvas
                    ref={canvasRef}
                    style={{
                      display: "block",
                      maxWidth: "100%",
                      height: "auto",
                      imageRendering: "pixelated",
                    }}
                  />
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {/* Grid Size Controls */}
                <div>
                  <h3 style={{ color: "#ffffff", marginBottom: "12px", fontSize: "16px" }}>Grid Size</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ffffff" }}>
                      Width:
                      <input
                        type="number"
                        min="5"
                        max="30"
                        value={gridWidth}
                        onChange={(e) => handleGridWidthChange(parseInt(e.target.value) || 10)}
                        style={{
                          width: "80px",
                          padding: "4px 8px",
                          background: "#2a2a2a",
                          border: "1px solid #e63946",
                          borderRadius: "4px",
                          color: "#ffffff",
                        }}
                      />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ffffff" }}>
                      Height:
                      <input
                        type="number"
                        min="3"
                        max="30"
                        value={gridHeight}
                        onChange={(e) => handleGridHeightChange(parseInt(e.target.value) || 8)}
                        style={{
                          width: "80px",
                          padding: "4px 8px",
                          background: "#2a2a2a",
                          border: "1px solid #e63946",
                          borderRadius: "4px",
                          color: "#ffffff",
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Image Scale Control */}
                <div>
                  <h3 style={{ color: "#ffffff", marginBottom: "12px", fontSize: "16px" }}>Image Scale</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ffffff" }}>
                      Scale:
                      <input
                        type="range"
                        min="0.1"
                        max="2.0"
                        step="0.1"
                        value={imageScale}
                        onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ minWidth: "40px", textAlign: "right" }}>{imageScale.toFixed(1)}x</span>
                    </label>
                    <div style={{ fontSize: "12px", color: "#aaaaaa" }}>
                      Adjust how large the image appears in the grid
                    </div>
                  </div>
                </div>
              </div>

              {/* Apply Button */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  onClick={handleClose}
                  style={{
                    padding: "10px 20px",
                    background: "#444444",
                    border: "1px solid #666666",
                    borderRadius: "4px",
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  style={{
                    padding: "10px 20px",
                    background: "#e63946",
                    border: "1px solid #e63946",
                    borderRadius: "4px",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Apply
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

