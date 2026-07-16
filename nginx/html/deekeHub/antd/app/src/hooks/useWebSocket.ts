import { useEffect, useRef, useState, useCallback } from 'react';

function useWebSocket(url: string | null) {
  const [messages, setMessages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<any>(null);
  const urlRef = useRef(url);

  const connect = useCallback((wsUrl: string) => {
    const ws = new WebSocket(wsUrl);
    websocketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        let msg = '';
        if (message.msg && typeof message.msg === 'string') {
          msg = message.msg.replace(/\n/g, '<br/>');
        } else if (message.type === 'debug_log' && message.data) {
          msg = typeof message.data === 'string' ? message.data : JSON.stringify(message.data);
        } else {
          msg = JSON.stringify(message);
        }
        setMessages((prev) => [...prev, msg]);
      } catch {
        setMessages((prev) => [...prev, event.data]);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    return ws;
  }, []);

  useEffect(() => {
    urlRef.current = url;
    if (!url) return;

    const ws = connect(url);

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      ws.close();
    };
  }, [url, connect]);

  const sendMessage = useCallback((message: string) => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(message);
    }
  }, []);

  return { messages, sendMessage, isConnected, setMessages };
}

export default useWebSocket;
