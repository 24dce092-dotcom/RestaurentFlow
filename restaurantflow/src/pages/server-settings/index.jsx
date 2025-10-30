import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export default function ServerSettings() {
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    try {
      const fromStorage = localStorage.getItem('backend_url') || '';
      setUrl(fromStorage);
    } catch {}
  }, []);

  const save = () => {
    try {
      const clean = (url || '').trim().replace(/\/$/, '');
      localStorage.setItem('backend_url', clean);
      // Also set on window so current session picks it up immediately
      if (typeof window !== 'undefined') window.__BACKEND_URL__ = clean;
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {}
  };

  const stopScan = () => {
    setScanning(false);
    try {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const s = streamRef.current;
      streamRef.current = null;
      if (s) s.getTracks().forEach(t => t.stop());
    } catch {}
  };

  const tickScan = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w && h) {
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(video, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const code = jsQR(imgData.data, w, h);
      if (code && code.data) {
        stopScan();
        const value = String(code.data).trim();
        setUrl(value);
        return;
      }
    }
    rafRef.current = requestAnimationFrame(tickScan);
  };

  const startScan = async () => {
    if (scanning) return;
    setScanning(true);
    setTestResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      rafRef.current = requestAnimationFrame(tickScan);
    } catch (err) {
      setScanning(false);
      setTestResult({ ok: false, msg: 'Camera access denied or unavailable' });
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const base = (url || '').trim().replace(/\/$/, '');
      if (!base) throw new Error('Please enter a server URL');
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), 3000);
      const r = await fetch(`${base}/healthz`, { signal: controller.signal });
      clearTimeout(to);
      if (r.ok) {
        setTestResult({ ok: true, msg: 'Connection successful' });
      } else {
        setTestResult({ ok: false, msg: `Server responded with ${r.status}` });
      }
    } catch (err) {
      setTestResult({ ok: false, msg: err?.message || 'Failed to connect' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-lg bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-semibold mb-4">Server Settings</h1>
        <p className="text-sm text-neutral-600 mb-4">Set the backend server URL your app should use. Example: http://192.168.29.241:5001</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://<PC-IP>:5001"
            className="flex-1 border rounded px-3 py-2"
          />
          <button onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2">Save</button>
        </div>
        {saved && <div className="mt-3 text-green-700">Saved! Reloading calls will use the new server.</div>}

        <div className="mt-4 flex gap-2">
          <button onClick={testConnection} disabled={testing} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded px-4 py-2">
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          {!scanning && (
            <button onClick={startScan} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-4 py-2">Scan QR</button>
          )}
          {scanning && (
            <button onClick={stopScan} className="bg-gray-500 hover:bg-gray-600 text-white rounded px-4 py-2">Stop Scan</button>
          )}
        </div>
        {testResult && (
          <div className={`mt-3 ${testResult.ok ? 'text-green-700' : 'text-red-700'}`}>{testResult.msg}</div>
        )}

        {scanning && (
          <div className="mt-4">
            <video ref={videoRef} playsInline muted style={{ width: '100%', borderRadius: 8, background: '#000' }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="text-xs text-neutral-600 mt-2">Point the camera at a QR that contains the server URL (e.g. http://192.168.x.x:5001)</div>
          </div>
        )}
        <div className="mt-6 text-sm text-neutral-600">
          <p>Tip: If your PC IP changes, update this value. You don’t need to reinstall the app.</p>
        </div>
      </div>
    </div>
  );
}
