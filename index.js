const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// ========== CONFIGURAÇÕES ==========

// Nome do grupo para interações do bot
const TEST_GROUP_NAME = "Teste_bot";

// Nome do arquivo da chave da API
const CREDENTIALS_PATH = path.join(__dirname, 'automacaocasas-6608713e559b.json');

// Nome da planilha e abas
const SPREADSHEET_ID = 'coloque_o_ID_da_planilha_aqui'; // <-- COLAR o ID da planilha aqui!
const ABA_CLIENTES = 'Cadastro_Clientes';
const ABA_PEDIDOS = 'Pedidos_confeitaria';

// Delay utilitário
const delay = ms => new Promise(res => setTimeout(res, ms));

// ========== AUTENTICAÇÃO GOOGLE SHEETS ==========
const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

// ========== WHATSAPP ==========
const client = new Client();

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot conectado ao WhatsApp');
});

client.initialize();

// ========== FUNÇÃO PRINCIPAL ==========
client.on('message', async msg => {
    const chat = await msg.getChat();

    if (chat.isGroup && chat.name === TEST_GROUP_NAME) {
        const body = msg.body.trim();

        // Detecta mensagem no padrão: Nome, Endereço, Pedido, DataHora
        const pedidoRegex = /^([^,]+),\s*([^,]+),\s*['"]?([^'"]+)['"]?,\s*(.+)$/i;
        const match = body.match(pedidoRegex);

        if (match) {
            const nomeCliente = match[1].trim();
            const endereco = match[2].trim();
            const pedido = match[3].trim();
            const dataHora = match[4].trim();

            // 1. Checar se cliente já está cadastrado
            const clienteExiste = await verificarCliente(nomeCliente);

            if (!clienteExiste) {
                await cadastrarCliente(nomeCliente, endereco);
                await delay(1000);
                await client.sendMessage(msg.from, `✅ Cliente *${nomeCliente}* cadastrado com sucesso.`);
            }

            // 2. Criar pedido
            const numeroPedido = gerarNumeroPedido();
            const dataHoje = new Date().toLocaleDateString('pt-BR');
            const formaPagamento = 'a confirmar';
            const totalPedido = 'a calcular';
            const pedidoFinalizado = 'não';

            await adicionarPedido([
                numeroPedido,
                dataHoje,
                nomeCliente,
                pedido,
                totalPedido,
                formaPagamento,
                dataHora,
                pedidoFinalizado
            ]);

            // 3. Resposta de confirmação
            await client.sendMessage(msg.from, `🧾 Pedido registrado!\n\n*Nº:* ${numeroPedido}\n*Cliente:* ${nomeCliente}\n*Pedido:* ${pedido}\n*Data/Hora:* ${dataHora}`);
        }
    }
});

// ========== FUNÇÕES AUXILIARES ==========

async function verificarCliente(nome) {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${ABA_CLIENTES}!B2:B`,
    });

    const nomes = res.data.values?.flat() || [];
    return nomes.includes(nome);
}

async function cadastrarCliente(nome, endereco) {
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${ABA_CLIENTES}!A:D`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [[
                gerarIdUnico(), nome, endereco, new Date().toLocaleDateString('pt-BR')
            ]]
        }
    });
}

async function adicionarPedido(valores) {
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${ABA_PEDIDOS}!A:H`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [valores]
        }
    });
}

function gerarIdUnico() {
    return Date.now().toString(36).slice(-6).toUpperCase();
}

function gerarNumeroPedido() {
    return Math.floor(100000 + Math.random() * 900000); // número aleatório de 6 dígitos
}
