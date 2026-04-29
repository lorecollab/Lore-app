import { useEffect, useRef, useState } from "react";

// Voice recorder using MediaRecorder API.
// Constraints: 15s min, 180s max.
export const REC_MIN_SEC = 15;
export const REC_MAX_SEC = 180;

export default function useVoiceRecorder({ onError } = {}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const mediaRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const tickRef = useRef(null);
  const startedAt = useRef(0);
  const stopTimerRef = useRef(null);

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setBlob(null);
    setPreviewUrl(null);
    setSeconds(0);
  };

  const start = async () => {
    reset();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mime });
        setBlob(b);
        setPreviewUrl(URL.createObjectURL(b));
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        if (tickRef.current) clearInterval(tickRef.current);
        if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
        setRecording(false);
      };
      startedAt.current = Date.now();
      tickRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - startedAt.current) / 1000);
        setSeconds(s);
      }, 250);
      stopTimerRef.current = setTimeout(() => { try { mr.stop(); } catch {} }, REC_MAX_SEC * 1000);
      mr.start();
      setRecording(true);
    } catch (e) {
      onError?.(e);
    }
  };

  const stop = () => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      try { mediaRef.current.stop(); } catch {}
    }
  };

  const cancel = () => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      try { mediaRef.current.stop(); } catch {}
    }
    chunksRef.current = [];
    reset();
  };

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  // eslint-disable-next-line
  }, []);

  return { recording, seconds, blob, previewUrl, start, stop, cancel, reset };
}
