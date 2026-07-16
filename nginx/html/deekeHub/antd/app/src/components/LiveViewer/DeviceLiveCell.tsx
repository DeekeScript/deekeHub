import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import LiveViewer from './index';

interface Props {
  deviceId: number;
  deviceName: string;
  androidId?: string;
  fetchToken: (id: number) => Promise<any>;
  stopUrl?: string;
}

export default function DeviceLiveCell({ deviceId, fetchToken, stopUrl }: Props) {
  const [viewer, setViewer] = useState<{ token: string; url: string; room: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchToken(deviceId);
        if (cancelled) return;
        if (res?.code === 0 && res.data) {
          setViewer(res.data);
        } else {
          setError('获取画面失败');
        }
      } catch {
        if (!cancelled) setError('获取画面失败');
      }
    })();
    return () => { cancelled = true; };
  }, [deviceId, fetchToken]);

  return (
    <div style={{ background: '#000', height: 280, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {viewer ? (
        <LiveViewer token={viewer.token} url={viewer.url} room={viewer.room} stopUrl={stopUrl} />
      ) : error ? (
        <span style={{ color: '#ff4d4f' }}>{error}</span>
      ) : (
        <Spin tip="获取画面..." />
      )}
    </div>
  );
}
