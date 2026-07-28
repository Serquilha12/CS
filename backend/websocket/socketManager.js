const WebSocket = require('ws');
const { supabase } = require('../config/supabase');

class SocketManager {
  constructor() {
    // Mapeamento direto: Map<userId, { socket: WebSocket, user: Object }>
    this.activeSockets = new Map();
  }

  // Inicializa o servidor WebSocket
  init(server) {
    this.wss = new WebSocket.Server({ noServer: true });

    // Lidar com evento de upgrade do HTTP -> WS
    server.on('upgrade', async (request, socket, head) => {
      try {
        const urlParams = new URLSearchParams(request.url.replace(/^.*\?/, ''));
        const token = urlParams.get('token');

        if (!token) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Validação estrita do token JWT do Supabase no handshake
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Obter dados do utilizador
        const { data: profile } = await supabase
          .from('profiles')
          .select('course, full_name')
          .eq('id', user.id)
          .single();

        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, {
            id: user.id,
            email: user.email,
            course: profile?.course || '',
            full_name: profile?.full_name || ''
          });
        });
      } catch (err) {
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws, user) => {
      console.log(`[WS CONNECTED]: Utilizador ${user.full_name} (${user.id})`);
      
      // Guardar a conexão ativa no Map
      this.activeSockets.set(user.id, { socket: ws, user });

      ws.on('message', (message) => {
        this.handleMessage(user.id, message);
      });

      ws.on('close', () => {
        console.log(`[WS DISCONNECTED]: Utilizador ${user.id}`);
        this.activeSockets.delete(user.id);
      });
    });
  }

  // Processar mensagem recebida
  handleMessage(senderId, rawMessage) {
    try {
      const data = JSON.parse(rawMessage);
      if (data.type === 'PING') {
        const sender = this.activeSockets.get(senderId);
        if (sender) sender.socket.send(JSON.stringify({ type: 'PONG' }));
      }
    } catch (e) {
      // Mensagem malformada ignorada
    }
  }

  // Enviar mensagem de chat privada para um utilizador específico
  sendPrivateMessage(receiverId, payload) {
    const target = this.activeSockets.get(receiverId);
    if (target && target.socket.readyState === WebSocket.OPEN) {
      target.socket.send(JSON.stringify({
        type: 'CHAT_MESSAGE',
        data: payload
      }));
      return true;
    }
    return false;
  }

  // Broadcast inteligente por curso: Envia alerta de novo anúncio apenas para alunos daquele curso
  broadcastCourseAlert(courseName, listingData) {
    let sentCount = 0;
    for (const [userId, client] of this.activeSockets.entries()) {
      if (client.user.course === courseName && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(JSON.stringify({
          type: 'NEW_LISTING_ALERT',
          course: courseName,
          data: listingData
        }));
        sentCount++;
      }
    }
    console.log(`[WS BROADCAST]: Alerta enviado para ${sentCount} alunos ativos de ${courseName}`);
  }
}

const socketManager = new SocketManager();
module.exports = socketManager;
