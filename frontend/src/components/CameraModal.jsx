import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, X, Check, Image as ImageIcon, AlertCircle, FlipHorizontal } from 'lucide-react';

export function CameraModal({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const nativeCameraInputRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (traseira) ou 'user' (frontal)
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedFile, setCapturedFile] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
      setCapturedImage(null);
      setCapturedFile(null);
      setCameraError(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  async function startCamera(mode) {
    try {
      setIsStarting(true);
      setCameraError(null);
      stopCamera();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('O seu navegador não suporta acesso direto à câmera.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('[CAMERA ERROR]:', err);
      setCameraError('Não foi possível aceder à câmera em tempo real. Pode usar a câmera nativa do seu dispositivo abaixo.');
    } finally {
      setIsStarting(false);
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }

  function toggleCamera() {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }

  function takeSnapshot() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Se estiver usando câmera frontal, espelhar a imagem para naturalidade
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          setCapturedImage(dataUrl);
          setCapturedFile(file);
          stopCamera();
        }
      },
      'image/jpeg',
      0.9
    );
  }

  function handleRetake() {
    setCapturedImage(null);
    setCapturedFile(null);
    startCamera(facingMode);
  }

  function handleConfirm() {
    if (capturedFile && onCapture) {
      onCapture(capturedFile);
      onClose();
    }
  }

  function handleNativeFileInput(e) {
    const file = e.target.files?.[0];
    if (file && onCapture) {
      onCapture(file);
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[80] flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-lg bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabeçalho */}
        <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-carrot" />
            <h3 className="font-extrabold text-white text-sm tracking-wide">Câmera CampusStore</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Área do Visor da Câmera / Imagem Capturada */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[320px] overflow-hidden">
          {capturedImage ? (
            /* Foto Capturada (Pré-visualização) */
            <img src={capturedImage} alt="Foto Capturada" className="w-full h-full object-contain max-h-[60vh]" />
          ) : cameraError ? (
            /* Mensagem de Erro / Fallback */
            <div className="p-6 text-center space-y-4 max-w-xs">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
              <p className="text-xs text-slate-300 font-medium leading-relaxed">{cameraError}</p>
            </div>
          ) : (
            /* Transmissão ao Vivo da Câmera */
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover max-h-[60vh] ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
          )}

          {/* Canvas Invisível para Captura */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Botão de Alternar Câmera (Traseira / Frontal) */}
          {!capturedImage && !cameraError && stream && (
            <button
              type="button"
              onClick={toggleCamera}
              className="absolute top-4 right-4 p-3 bg-slate-900/60 backdrop-blur-md text-white border border-white/20 rounded-full hover:bg-slate-900/90 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Alternar Câmera"
            >
              <FlipHorizontal className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Rodapé com Controles */}
        <div className="p-5 bg-slate-900 border-t border-slate-800 space-y-3">
          {capturedImage ? (
            /* Ações da Foto Capturada */
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center transition-colors min-h-[48px]"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Repetir Foto
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-3.5 bg-persian hover:bg-persian-hover text-white font-extrabold rounded-2xl text-xs flex items-center justify-center shadow-lg shadow-persian/30 transition-all min-h-[48px]"
              >
                <Check className="w-4 h-4 mr-2 text-carrot" /> Confirmar Foto
              </button>
            </div>
          ) : (
            /* Ações de Disparo e Métodos Alternativos */
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                {/* Botão Obturador da Câmera */}
                <button
                  type="button"
                  onClick={takeSnapshot}
                  disabled={isStarting || !!cameraError}
                  className="w-16 h-16 rounded-full bg-white hover:bg-slate-200 border-4 border-persian shadow-xl active:scale-90 transition-all flex items-center justify-center disabled:opacity-50"
                  title="Tirar Foto"
                >
                  <div className="w-12 h-12 rounded-full bg-persian border-2 border-white" />
                </button>
              </div>

              {/* Botões Secundários: Câmera Nativa / Galeria */}
              <div className="flex space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center min-h-[44px]"
                >
                  <Camera className="w-4 h-4 mr-1.5 text-carrot" /> Câmera Nativa
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center min-h-[44px]"
                >
                  <ImageIcon className="w-4 h-4 mr-1.5 text-persian" /> Galeria
                </button>
              </div>
            </div>
          )}

          {/* Inputs Escondidos para Fallback */}
          <input
            ref={nativeCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleNativeFileInput}
            className="hidden"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleNativeFileInput}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
