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

        let authenticatedUser = null;

        // 1. Validação estrita do token JWT do Supabase no handshake
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          authenticatedUser = user;
        } else if (token === 'dummy-token' && process.env.NODE_ENV !== 'production') {
          // Fallback de desenvolvimento local seguro
          const { data: fallbackProfile } = await supabase
            .from('profiles')
            .select('id, email, course, full_name')
            .limit(1)
            .maybeSingle();

          if (fallbackProfile) {
            authenticatedUser = {
              id: fallbackProfile.id,
              email: fallbackProfile.email,
              user_metadata: { course: fallbackProfile.course, full_name: fallbackProfile.full_name }
            };
          }
        }

        if (!authenticatedUser) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Obter dados do perfil do estudante
        const { data: profile } = await supabase
          .from('profiles')
          .select('course, full_name')
          .eq('id', authenticatedUser.id)
          .maybeSingle();

        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, {
            id: authenticatedUser.id,
            email: authenticatedUser.email,
            course: profile?.course || authenticatedUser.user_metadata?.course || '',
            full_name: profile?.full_name || authenticatedUser.user_metadata?.full_name || 'Estudante UCM'
          });
        });
      } catch (err) {
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws, user) => {
      ws.isAlive = true;
      console.log(`[WS CONNECTED]: Utilizador ${user.full_name} (${user.id})`);
      
      // Guardar a conexão ativa no Map
      this.activeSockets.set(user.id, { socket: ws, user });

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (message) => {
        this.handleMessage(user.id, message);
      });

      ws.on('close', () => {
        console.log(`[WS DISCONNECTED]: Utilizador ${user.id}`);
        this.activeSockets.delete(user.id);
      });
    });

    // Heartbeat a cada 30 segundos para detetar desconexões silenciosas em redes móveis
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  // Processar mensagem recebida pelo WebSocket
  handleMessage(senderId, rawMessage) {
    try {
      const data = JSON.parse(rawMessage);
      
      // 1. Heartbeat Ping-Pong
      if (data.type === 'PING') {
        const sender = this.activeSockets.get(senderId);
        if (sender) sender.socket.send(JSON.stringify({ type: 'PONG' }));
        return;
      }

      // 2. Indicador de Digitação (Typing Indicator: Start / Stop)
      if (data.type === 'TYPING_START' || data.type === 'TYPING_STOP') {
        const isTyping = data.type === 'TYPING_START';
        const receiverId = data.receiver_id;
        const target = this.activeSockets.get(receiverId);

        if (target && target.socket.readyState === WebSocket.OPEN) {
          target.socket.send(JSON.stringify({
            type: 'TYPING_STATUS',
            listing_id: data.listing_id,
            sender_id: senderId,
            isTyping
          }));
        }
        return;
      }

      // 3. Confirmação de Leitura em Tempo Real (Live Read Receipts)
      if (data.type === 'MARK_READ') {
        const receiverId = data.receiver_id;
        const target = this.activeSockets.get(receiverId);

        if (target && target.socket.readyState === WebSocket.OPEN) {
          target.socket.send(JSON.stringify({
            type: 'MESSAGES_READ',
            listing_id: data.listing_id,
            reader_id: senderId
          }));
        }
        return;
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
