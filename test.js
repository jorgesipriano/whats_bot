
const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SHEET_ID = '11YZJ7jMPUzPPcG0KY-KdqOuluBKt0YLbxwUPU2wv4zk';
const GOOGLE_CREDENTIALS = require('./automacaocasas-6608713e559b.json');

// Autenticação Google Sheets
const auth = new google.auth.GoogleAuth({
  credentials: GOOGLE_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const client = new Client();
client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('Tudo certo! WhatsApp conectado.'));
client.initialize();

const delay = ms => new Promise(res => setTimeout(res, ms));
const TEST_GROUP_NAME = "Teste_bot";

// Extrai dados do texto
function extrairDados(texto) {
  const regex = /^(.*?),\s*(.*?),\s*'(.*?)',\s*(\d{2}\/\d{2})\s*(\d{2}:\d{2})H/;
  const match = texto.match(regex);
  if (!match) return null;

  const nome = match[1].trim();
  const endereco = match[2].trim();
  const pedido = match[3].trim();
  const dataEntrega = match[4].trim();
  const horaEntrega = match[5].trim();
  return { nome, endereco, pedido, dataEntrega, horaEntrega };
}

async function clienteExiste(nome) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Cadastro_clientes!A2:B',
  });
  const nomes = res.data.values || [];
  return nomes.find(row => row[1]?.toLowerCase() === nome.toLowerCase());
}

async function adicionarCliente(nome, endereco) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Cadastro_clientes!A2:A',
  });
  const id = res.data.values?.length + 1 || 1;
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Cadastro_clientes!A:D',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[id, nome, endereco]] },
  });
}

async function adicionarPedido({ nome, pedido, total, pagamento, dataEntrega, horaEntrega }) {
  const hoje = new Date().toLocaleDateString('pt-BR');
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Pedidos_confeitaria!A:H',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        '', hoje, nome, pedido, total, pagamento, `${dataEntrega} ${horaEntrega}`, 'NÃO'
      ]],
    },
  });
}

client.on('message', async msg => {
  const chat = await msg.getChat();
  if (!chat.isGroup || chat.name !== TEST_GROUP_NAME) return;

  const dados = extrairDados(msg.body);
  if (!dados) return;

  const { nome, endereco, pedido, dataEntrega, horaEntrega } = dados;
  const existe = await clienteExiste(nome);
  if (!existe) await adicionarCliente(nome, endereco);

  const total = calcularTotal(pedido);
  const pagamento = 'Pendente';

  await adicionarPedido({ nome, pedido, total, pagamento, dataEntrega, horaEntrega });

  const resumo = `Seu Pedido é:
${pedido.split(',').map(p => `- ${p.trim()}`).join('\n')}
Horário de entrega: ${dataEntrega} às ${horaEntrega}
💰 Total: R$ ${total}`;

  const msgEmpresa = `Pedido de ${nome} PENDENTE pagamento.
Entrega: ${endereco} às ${dataEntrega} ${horaEntrega}.`;

  await msg.reply(resumo);
  await delay(3000);
  await client.sendMessage(chat.id._serialized, msgEmpresa);
});

// Total fictício (você pode puxar do catálogo depois)
function calcularTotal(pedidoTexto) {
  let total = 0;
  const mapa = {
    'Fatia Cenoura': 12,
    'Fatia Chocolate': 12,
    'Coxinha de Morango': 10,
  };
  pedidoTexto.split(',').forEach(item => {
    const chave = item.trim();
    if (mapa[chave]) total += mapa[chave];
  });
  return total;
}
