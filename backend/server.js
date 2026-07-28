const http = require('http');
const app = require('./app');
const socketManager = require('./websocket/socketManager');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Inicializar gestor WebSocket para tempo real
socketManager.init(server);

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Servidor CampusStore MVC a rodar na porta: ${PORT}`);
  console.log(`📡 WebSocket Server ativo em ws://localhost:${PORT}`);
  console.log(`=======================================================`);
});
