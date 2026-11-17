import React, { useEffect, useRef } from 'react';

interface HistogramProps {
  imageSrc: string;
  width?: number;
  height?: number;
}

export const Histogram: React.FC<HistogramProps> = ({ imageSrc, width = 240, height = 90 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

    img.onload = () => {
      // Draw thumbnail onto offscreen canvas to extract pixels fast
      const offCanvas = document.createElement('canvas');
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return;

      const sampleW = 200;
      const sampleH = Math.round((img.height / img.width) * sampleW) || 150;
      offCanvas.width = sampleW;
      offCanvas.height = sampleH;

      offCtx.drawImage(img, 0, 0, sampleW, sampleH);
      const imgData = offCtx.getImageData(0, 0, sampleW, sampleH);
      const data = imgData.data;

      const rHist = new Uint32Array(256);
      const gHist = new Uint32Array(256);
      const bHist = new Uint32Array(256);
      const lHist = new Uint32Array(256);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

        rHist[r]++;
        gHist[g]++;
        bHist[b]++;
        lHist[lum]++;
      }

      let maxVal = 0;
      for (let i = 0; i < 256; i++) {
        if (rHist[i] > maxVal) maxVal = rHist[i];
        if (gHist[i] > maxVal) maxVal = gHist[i];
        if (bHist[i] > maxVal) maxVal = bHist[i];
      }

      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);

      // Helper to draw color histogram curve
      const drawChannel = (hist: Uint32Array, color: string, alpha: number) => {
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(0, height);

        for (let i = 0; i < 256; i++) {
          const x = (i / 255) * width;
          const h = (hist[i] / maxVal) * (height - 4);
          const y = height - h;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
      };

      drawChannel(rHist, '#ef4444', 0.4); // Red
      drawChannel(gHist, '#22c55e', 0.4); // Green
      drawChannel(bHist, '#3b82f6', 0.4); // Blue
      drawChannel(lHist, '#f59e0b', 0.3); // Luminance

      ctx.globalAlpha = 1.0;

      // Draw grid lines
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(width * 0.25, 0); ctx.lineTo(width * 0.25, height);
      ctx.moveTo(width * 0.5, 0); ctx.lineTo(width * 0.5, height);
      ctx.moveTo(width * 0.75, 0); ctx.lineTo(width * 0.75, height);
      ctx.stroke();
    };
  }, [imageSrc, width, height]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 p-1 shadow-md">
      <canvas ref={canvasRef} width={width} height={height} className="block w-full h-auto rounded" />
      <div className="flex items-center justify-between px-1 mt-1 text-[9px] font-mono text-zinc-500">
        <span className="text-zinc-600">Shadows</span>
        <span className="text-zinc-400 font-semibold">RGB Histogram</span>
        <span className="text-zinc-600">Highlights</span>
      </div>
    </div>
  );
};
