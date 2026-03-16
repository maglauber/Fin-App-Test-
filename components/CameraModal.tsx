
import React, { useRef, useState, useEffect } from 'react';
import { XMarkIcon, CameraIcon } from '@heroicons/react/24/outline';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64: string, mimeType: string) => void;
}

const CameraModal: React.FC<Props> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please ensure permissions are granted.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
        onCapture(base64, 'image/jpeg');
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
      <div className="bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Scan Receipt</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="relative aspect-[3/4] bg-black flex items-center justify-center">
          {error ? (
            <p className="text-rose-400 text-center px-8 text-sm">{error}</p>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
              {/* Scanning UI overlay */}
              <div className="absolute inset-0 pointer-events-none border-[20px] border-black/20">
                <div className="w-full h-full border-2 border-indigo-500/50 rounded-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,1)] animate-[scan_3s_ease-in-out_infinite]" />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-8 flex justify-center bg-slate-800">
          <button 
            onClick={captureFrame}
            disabled={!!error}
            className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            <div className="w-16 h-16 rounded-full border-4 border-slate-800 flex items-center justify-center">
               <CameraIcon className="h-8 w-8 text-slate-800" />
            </div>
          </button>
        </div>
        
        <canvas ref={canvasRef} className="hidden" />

        <style>{`
          @keyframes scan {
            0%, 100% { top: 0%; }
            50% { top: 100%; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default CameraModal;
