const http = require('http');
const app = require('./app');
const socketManager = require('./websocket/socketManager');
const reservationTimeoutService = require('./services/reservationTimeoutService');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Inicializar gestor WebSocket para tempo real
socketManager.init(server);

// Inicializar agendador de limpeza automática de timeouts de reservas (48h e 7d)
reservationTimeoutService.startScheduler();

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Servidor CampusStore MVC a rodar na porta: ${PORT}`);
  console.log(`📡 WebSocket Server ativo em ws://localhost:${PORT}`);
  console.log(`⏱️ Timeout Scheduler ativo (48h pending / 7d reserved)`);
  console.log(`=======================================================`);
});
