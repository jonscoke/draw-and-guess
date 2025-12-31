const http = require('http');
const next = require('next');
const { WebSocketServer } = require('ws');

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const history = [];
const MAX_HISTORY = 5000;

function addToHistory(message) {
  history.push(message);
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
}

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  const wss = new WebSocketServer({ server });

  wss.on('connection', (socket) => {
    socket.on('message', (data) => {
      let message;
      try {
        message = JSON.parse(data.toString());
      } catch (error) {
        return;
      }

      if (message.type === 'join') {
        socket.send(JSON.stringify({ type: 'history', payload: history }));
        return;
      }

      if (message.type === 'draw' || message.type === 'clear' || message.type === 'guess') {
        addToHistory(message);
      }

      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
