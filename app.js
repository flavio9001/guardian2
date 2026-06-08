require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(morgan('combined'));

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.post('/api/export/whatsapp', (req, res) => {
  try {
    const { imageData, phoneNumber } = req.body;
    if (!imageData || !phoneNumber) {
      return res.status(400).json({ error: 'Dados incompletos para exportação' });
    }
    console.log(`Processando exportação para: ${phoneNumber}`);
    res.status(200).json({ success: true, message: 'Exportação iniciada com sucesso' });
  } catch (error) {
    console.error('Erro na rota de exportação:', error);
    res.status(500).json({ error: 'Erro interno ao processar imagem' });
  }
});

app.use((req, res, next) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Middleware de erro:', err.stack);
  res.status(500).json({ error: 'Erro crítico no servidor', details: err.message });
});

app.listen(PORT, () => {
  console.log(`Servidor Guardian rodando na porta ${PORT}`);
});