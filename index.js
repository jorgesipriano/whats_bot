const { Client, LocalAuth } = require('whatsapp-web.js');
const { google } = require('googleapis');
const qrcode = require('qrcode-terminal');
const express = require('express');
require('dotenv').config(); // Para carregar variáveis do arquivo .env

const SHEET_ID = '11YZJ7jMPUzPPcG0KY-KdqOuluBKt0YLbxwUPU2wv4zk';
const PEDIDOS_SHEET = 'Pedidos_confeitaria';
const CLIENTES_SHEET = 'Cadastro_Clientes';
const CATALOGO_SHEET = 'Catalogo_produtos';

async function authorizeGoogle() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error('❌ Variável GOOGLE_SERVICE_ACCOUNT_JSON não encontrada!');
  }

const path = require('path');

async function authorizeGoogle() {
  const keyPath = path.join(__dirname, 'credentials.json');

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return await auth.getClient();
}


async function buscarPrecoTotal(pedidoTexto) {
  const auth = await authorizeGoogle();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${CATALOGO_SHEET}!C:D`, // Nome completo e preço
  });

  const catalogo = res.data.values;
  let total = 0;

  for (let i = 1; i < catalogo.length; i++) {
    const [nomeCompleto, precoStr] = catalogo[i];
    const preco = parseFloat(precoStr.replace(',', '.'));

    const regex = new RegExp(`(\\d+)\\s*${nomeCompleto}`, 'gi');
    let match;
    while ((match = regex.exec(pedidoTexto)) !== null) {
      const quantidade = parseInt(match[1]);
      total += quantidade * preco;
    }
  }

  return total;
}

async function addCliente(nome, endereco) {
  const auth = await authorizeGoogle();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${CLIENTES_SHEET}!A:C`,
  });

  const clientes = res.data.values || [];
  const jaExiste = clientes.some(
    ([, nomeExistente, enderecoExistente]) =>
      nomeExistente?.toLowerCase() === nome.toLowerCase() &&
      enderecoExistente?.toLowerCase() === endereco.toLowerCase()
  );

  if (!jaExiste) {
    const id = Date.now().toString(36).toUpperCase();
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${CLIENTES_SHEET}!A:D`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[id, nome, endereco, dataHoje]],
      },
    });
  }
}

async function addPedidoAoSheet(pedidoData) {
  const auth = await authorizeGoogle();
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${PEDIDOS_SHEET}!A:H`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [pedidoData],
    },
  });
}

// ✅ Cria o cliente do WhatsApp com persistência de sessão
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('🤖 Bot está pronto!');
});

client.on('message', async (msg) => {
  try {
    const chat = await msg.getChat();

    // ✅ Responde apenas no grupo "Test_bot"
    if (!chat.isGroup || chat.name !== 'Test_bot') return;

    const partes = msg.body.split(',');
    if (partes.length < 4) return;

    const nome = partes[0].trim();
    const endereco = partes[1].trim();
    const pedido = partes[2].trim();
    const dataHora = partes[3].trim();

    const total = await buscarPrecoTotal(pedido);
    const totalFormatado = total.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    const obs = '';
    const numeroPedido = Date.now().toString().slice(-6);

    await addCliente(nome, endereco);
    await addPedidoAoSheet([
      numeroPedido,
      nome,
      pedido,
      dataHora,
      totalFormatado,
      endereco,
      '', // status removido
      obs,
    ]);

    await msg.reply(
      `✅ *Seu pedido foi registrado!*\n\n📦 *Pedido:* ${pedido}\n🕒 *Entrega:* ${dataHora}\n💰 *Total:* ${totalFormatado}\n💳 Qual a forma de pagamento?\n🔢 Pix: 31984915396`
    );

    await msg.reply(
      `🧾 *Pedido salvo no sistema!*\n\nNº: ${numeroPedido}\nCliente: ${nome}\nPedido: ${pedido}\nData/Hora: ${dataHora}\nTotal Pedido: ${totalFormatado}\nEndereço: ${endereco}\nObservações: ${obs}`
    );
  } catch (error) {
    console.error('Erro ao processar pedido:', error);
    msg.reply('❌ Ocorreu um erro ao registrar seu pedido.');
  }
});

client.initialize();

// ✅ Servidor HTTP para manter app vivo (se usar monitoramento externo)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot WhatsApp rodando com sucesso!');
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor rodando na porta ${PORT}`);
});
