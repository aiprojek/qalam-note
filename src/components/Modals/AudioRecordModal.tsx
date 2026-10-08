import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Square, Play, Pause, RotateCcw, Check, AlertCircle } from 'lucide-react';
import type { AppLanguage } from '../../types';

interface AudioRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertAudio: (audioDataUrl: string, audioTitle?: string) => void;
  language?: AppLanguage;
}

export const AudioRecordModal: React.FC<AudioRecordModalProps> = ({
  isOpen,
  onClose,
  onInsertAudio,
  language = 'id',
}) => {
  const isId = language === 'id';
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [memoTitle, setMemoTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setIsRecording(false);
      setRecordingTime(0);
      setAudioUrl(null);
      setAudioDataUrl(null);
      setMemoTitle(isId ? `Memo Suara ${new Date().toLocaleDateString('id-ID')}` : `Voice Memo ${new Date().toLocaleDateString()}`);
      setErrorMessage(null);
    } else {
      stopRecordingCleanup();
    }
  }, [isOpen, isId]);

  const stopRecordingCleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const previewUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(previewUrl);

        // Convert to base64 Data URL for persistent offline storage in IndexedDB
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioDataUrl(reader.result as string);
        };

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      setErrorMessage(
        isId
          ? 'Gagal mengakses mikrofon. Pastikan Anda telah memberikan izin mikrofon di peramban.'
          : 'Failed to access microphone. Please ensure microphone permissions are granted.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSaveAndInsert = () => {
    if (audioDataUrl) {
      onInsertAudio(audioDataUrl, memoTitle);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#1e2739] border border-slate-700 shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/80 bg-[#161d2b]">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-red-400" />
            <h3 className="text-sm font-semibold">{isId ? 'Rekam Memo Suara' : 'Record Voice Memo'}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center space-y-5">
          {errorMessage && (
            <div className="w-full p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300 text-left flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Recording Timer & Visualizer Pulse */}
          <div className="relative flex items-center justify-center my-2">
            {isRecording && (
              <div className="absolute w-24 h-24 rounded-full bg-red-500/20 animate-ping" />
            )}
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center border-2 transition ${
                isRecording
                  ? 'bg-red-600/30 border-red-500 text-red-400'
                  : audioUrl
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Mic className={`w-8 h-8 ${isRecording ? 'animate-bounce' : ''}`} />
            </div>
          </div>

          <div className="text-2xl font-mono font-bold text-white tracking-wider">
            {formatTimer(recordingTime)}
          </div>

          <p className="text-xs text-slate-400 max-w-xs">
            {isRecording
              ? (isId ? 'Sedang merekam suara... Tekan tombol merah untuk menghentikan.' : 'Recording audio... Tap stop when finished.')
              : audioUrl
              ? (isId ? 'Rekaman selesai! Anda dapat mendengarkan kembali sebelum menyisipkannya.' : 'Recording finished! Preview audio below before inserting.')
              : (isId ? 'Tekan tombol di bawah untuk mulai merekam memo audio lokal.' : 'Tap below to start recording your voice memo.')}
          </p>

          {/* Title input */}
          <div className="w-full text-left">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              {isId ? 'Judul Memo Suara:' : 'Voice Memo Title:'}
            </label>
            <input
              type="text"
              value={memoTitle}
              onChange={(e) => setMemoTitle(e.target.value)}
              placeholder="Memo Suara..."
              className="w-full bg-slate-900 text-xs text-slate-200 px-3 py-2 rounded-lg border border-slate-700 outline-none focus:border-blue-500"
            />
          </div>

          {/* Audio Preview Player */}
          {audioUrl && (
            <div className="w-full p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <audio controls src={audioUrl} className="w-full h-9 outline-none" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {!isRecording && !audioUrl && (
              <button
                onClick={startRecording}
                className="px-5 py-2.5 min-h-[44px] rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white font-semibold text-xs shadow-lg shadow-red-900/40 flex items-center gap-2 transition"
              >
                <Mic className="w-4 h-4" />
                <span>{isId ? 'Mulai Merekam' : 'Start Recording'}</span>
              </button>
            )}

            {isRecording && (
              <button
                onClick={stopRecording}
                className="px-5 py-2.5 min-h-[44px] rounded-full bg-slate-800 hover:bg-slate-700 text-red-400 font-semibold text-xs border border-red-500/50 flex items-center gap-2 transition active:scale-95"
              >
                <Square className="w-4 h-4 fill-red-400" />
                <span>{isId ? 'Hentikan Rekaman' : 'Stop Recording'}</span>
              </button>
            )}

            {audioUrl && (
              <>
                <button
                  onClick={() => {
                    setAudioUrl(null);
                    setAudioDataUrl(null);
                    setRecordingTime(0);
                  }}
                  className="px-3.5 py-2 min-h-[44px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition active:scale-95 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isId ? 'Rekam Ulang' : 'Re-record'}</span>
                </button>
                <button
                  onClick={handleSaveAndInsert}
                  className="px-5 py-2 min-h-[44px] rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isId ? 'Sisipkan ke Catatan' : 'Insert into Note'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
