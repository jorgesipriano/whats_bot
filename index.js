const { Client, LocalAuth } = require('whatsapp-web.js');
const { google } = require('googleapis');
const fs = require('fs');
const qrcode = require('qrcode-terminal');

const SHEET_ID = '11YZJ7jMPUzPPcG0KY-KdqOuluBKt0YLbxwUPU2wv4zk';
const SHEET_NAME = 'Pedidos_confeitaria';
const CREDENTIALS_PATH = './automacaocasas-6608713e559b.json';

// Autenticação Google Sheets
async function authorizeGoogle() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return await auth.getClient();
}

// Adiciona pedido ao Google Sheets
async function addPedidoAoSheet(pedidoData) {
  const authClient = await authorizeGoogle();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:E`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [pedidoData]
    }
  });
}

// Bot WhatsApp
const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ Bot está pronto!');
});

client.on('message', async (msg) => {
  try {
    const chat = await msg.getChat();

    // Formato esperado: Nome, Endereço, Pedido, Data Hora
    const partes = msg.body.split(',');
    if (partes.length < 4) return;

    const nome = partes[0].trim();
    const endereco = partes[1].trim();
    const pedido = partes[2].trim();
    const dataHora = partes[3].trim();

    await addPedidoAoSheet([nome, endereco, pedido, dataHora, new Date().toLocaleString('pt-BR')]);

    msg.reply(`🍰 Pedido registrado com sucesso!\n\n📦 *Pedido:* ${pedido}\n👤 *Cliente:* ${nome}\n🏠 *Endereço:* ${endereco}\n🕒 *Entrega:* ${dataHora}`);
  } catch (error) {
    console.error('Erro ao registrar pedido:', error);
    msg.reply('❌ Ocorreu um erro ao registrar seu pedido. Tente novamente.');
  }
});

client.initialize();
