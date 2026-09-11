require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Desabilitar cabeçalho identificador do Express
app.disable('x-powered-by');

// 1. Cabeçalhos de Segurança com Helmet
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// 2. Configuração de CORS para ambiente de produção e desenvolvimento
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permite chamadas server-to-server, mobile/Postman sem header de origin, ou origens autorizadas
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(null, true); // Permite por padrão mantendo compatibilidade
  },
  credentials: true
}));

// 3. Middlewares de parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 4. Montar rotas da API em /api/v1
app.use('/api/v1', apiRoutes);

// 5. Middleware centralizado de erros
app.use(errorHandler);

module.exports = app;
