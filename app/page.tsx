'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type DrawMessage = {
  type: 'draw';
  payload: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    color: string;
    size: number;
  };
};

type ClearMessage = { type: 'clear' };

type GuessMessage = {
  type: 'guess';
  payload: {
    text: string;
    by: string;
    timestamp: number;
  };
};

type HistoryMessage = { type: 'history'; payload: Array<DrawMessage | ClearMessage | GuessMessage> };

type SocketMessage = DrawMessage | ClearMessage | GuessMessage | HistoryMessage | { type: 'join' };

const CHAT_LABELS = {
  ai: 'AI',
  system: '系统',
};

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState('#1d4ed8');
  const [size, setSize] = useState(6);
  const [status, setStatus] = useState('正在连接房间...');
  const [guess, setGuess] = useState('等待 AI 猜测');
  const [chat, setChat] = useState<GuessMessage['payload'][]>([]);

  const wsUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}`;
  }, []);

  const applyDraw = useCallback((payload: DrawMessage['payload']) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = payload.color;
    ctx.lineWidth = payload.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(payload.x0, payload.y0);
    ctx.lineTo(payload.x1, payload.y1);
    ctx.stroke();
    ctx.closePath();
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const handleIncoming = useCallback(
    (message: SocketMessage) => {
      if (message.type === 'draw') {
        applyDraw(message.payload);
      }
      if (message.type === 'clear') {
        clearCanvas();
      }
      if (message.type === 'guess') {
        setChat((prev) => [...prev, message.payload].slice(-20));
      }
      if (message.type === 'history') {
        message.payload.forEach((entry) => handleIncoming(entry));
      }
    },
    [applyDraw, clearCanvas]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  useEffect(() => {
    if (!wsUrl) return;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      setStatus('已连接，开始绘画');
      socket.send(JSON.stringify({ type: 'join' }));
    });

    socket.addEventListener('close', () => {
      setStatus('连接已断开');
    });

    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as SocketMessage;
        handleIncoming(message);
      } catch (error) {
        console.warn('Invalid message', error);
      }
    });

    return () => {
      socket.close();
    };
  }, [handleIncoming, wsUrl]);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const sendMessage = (message: SocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    lastPoint.current = getPoint(event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const point = getPoint(event);
    const previous = lastPoint.current;
    if (!point || !previous) return;
    const message: DrawMessage = {
      type: 'draw',
      payload: {
        x0: previous.x,
        y0: previous.y,
        x1: point.x,
        y1: point.y,
        color,
        size,
      },
    };
    applyDraw(message.payload);
    sendMessage(message);
    lastPoint.current = point;
  };

  const handlePointerUp = () => {
    drawing.current = false;
    lastPoint.current = null;
  };

  const handleClear = () => {
    clearCanvas();
    sendMessage({ type: 'clear' });
  };

  const handleGuess = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setGuess('AI 思考中...');

    const response = await fetch('/api/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl }),
    });

    if (!response.ok) {
      setGuess('AI 暂时无法猜测');
      return;
    }

    const data = await response.json();
    setGuess(data.result);
    const payload = {
      text: data.result,
      by: CHAT_LABELS.ai,
      timestamp: Date.now(),
    };
    sendMessage({ type: 'guess', payload });
  };

  return (
    <main>
      <div className="header">
        <div>
          <h1>你画我猜</h1>
          <p>多人实时同步画板 + AI 猜测</p>
        </div>
        <div className="status">{status}</div>
      </div>

      <section className="card">
        <div className="controls">
          <label>
            画笔颜色
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </label>
          <label>
            画笔粗细
            <input
              type="range"
              min={2}
              max={20}
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
            />
          </label>
          <button onClick={handleClear} className="secondary">
            清空画板
          </button>
          <button onClick={handleGuess}>让 AI 猜一猜</button>
        </div>
        <div className="canvas-wrapper">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>
        <div className="ai-panel">
          <div>
            <div>AI 猜测结果</div>
            <div className="result">{guess}</div>
          </div>
          <div className="status">其他玩家会同步收到 AI 的猜测</div>
        </div>
        <div className="chat">
          {chat.map((item) => (
            <div className="chat-item" key={item.timestamp}>
              [{item.by}] {item.text}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
