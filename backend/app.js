const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// 1. Cabeçalhos de Segurança com Helmet
app.use(helmet({
  contentSecurityPolicy: false // Desativado para facilitar assets dinâmicos em dev
}));

// 2. Configuração de CORS para permitir cookies em credenciais
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
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
