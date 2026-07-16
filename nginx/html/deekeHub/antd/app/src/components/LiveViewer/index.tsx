import { useEffect, useRef, useState } from 'react';

const LIVEKIT_SDK_URL = 'https://cdn.jsdelivr.net/npm/livekit-client@2/dist/livekit-client.umd.min.js';

let sdkReady: Promise<any> | null = null;
function ensureLiveKitSDK(): Promise<any> {
  if (sdkReady) return sdkReady;
  const g = (window as any).livekitClient || (window as any).LivekitClient;
  if (g) { sdkReady = Promise.resolve(g); return sdkReady; }
  sdkReady = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = LIVEKIT_SDK_URL;
    s.onload = () => {
      const lk = (window as any).livekitClient || (window as any).LivekitClient;
      if (lk) resolve(lk); else reject(new Error('LiveKit SDK not found'));
    };
    s.onerror = () => reject(new Error('LiveKit SDK load failed'));
    document.head.appendChild(s);
  });
  return sdkReady;
}

interface Props {
  token: string;
  url: string;
  room: string;
  style?: React.CSSProperties;
  stopUrl?: string;
}

export default function LiveViewer({ token, url, room, style, stopUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('');
  const roomRef = useRef<any>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    if (!stopUrl) return;
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      const t = localStorage.getItem('token');
      fetch(stopUrl, { method: 'POST', keepalive: true, headers: t ? { Authorization: `Bearer ${t}` } : {} });
    };
    window.addEventListener('beforeunload', stop);
    return () => { window.removeEventListener('beforeunload', stop); stop(); };
  }, [stopUrl]);

  useEffect(() => {
    activeRef.current = true;
    let cancelled = false;
    let pollTimer: any;

    (async () => {
      try {
        setStatus('连接中...');

        const prev = roomRef.current;
        if (prev) {
          try { prev.removeAllListeners(); prev.disconnect(); } catch (_) {}
          roomRef.current = null;
          await new Promise(r => setTimeout(r, 300));
        }
        if (cancelled) return;

        const LK = await ensureLiveKitSDK();
        if (cancelled) return;

        const r = new LK.Room();
        roomRef.current = r;

        let hasVideo = false;
        const tryAttach = () => {
          if (cancelled || hasVideo) return;
          r.remoteParticipants.forEach((p: any) => {
            if (hasVideo) return;
            p.videoTrackPublications?.forEach((pub: any) => {
              if (hasVideo) return;
              if (pub.track && pub.track.kind === 'video' && videoRef.current) {
                hasVideo = true;
                pub.track.attach(videoRef.current);
                setStatus('');
                if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
              }
            });
          });
        };

        r.on(LK.RoomEvent.TrackSubscribed, (track: any) => {
          if (track.kind === 'video') tryAttach();
        });
        r.on(LK.RoomEvent.Disconnected, () => setStatus('已断开'));

        setStatus('连接中...');
        await r.connect(url, token);
        if (cancelled) { r.removeAllListeners(); r.disconnect(); return; }

        tryAttach();
        if (!hasVideo) setStatus('等待设备推流...');

        const poll = () => {
          if (cancelled) return;
          tryAttach();
          if (!hasVideo) pollTimer = setTimeout(poll, 1000);
        };
        poll();
      } catch (e: any) {
        if (!cancelled) setStatus('连接失败: ' + (e.message || ''));
      }
    })();

    return () => {
      cancelled = true;
      activeRef.current = false;
      if (pollTimer) clearTimeout(pollTimer);
      const r = roomRef.current;
      if (r) { try { r.removeAllListeners(); r.disconnect(); } catch (_) {} roomRef.current = null; }
    };
  }, [token, url, room]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <video ref={videoRef} autoPlay playsInline muted
        style={{ width: '100%', height: '100%', background: '#000', borderRadius: 8, objectFit: 'contain', ...style }} />
      {status && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 14, pointerEvents: 'none' }}>
          {status}
        </div>
      )}
    </div>
  );
}
