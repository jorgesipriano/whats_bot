const express = require('express');
const client = require('./bot');
const handleMessage = require('./handlers');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const qrcode = require('qrcode-terminal'); // Adicionado para exibir QR code no terminal

const app = express();
app.use(express.json());

client.on('qr', (qr) => {
  console.log('📱 QR Code gerado! Escaneie com o WhatsApp:');
  qrcode.generate(qr, { small: true }); // Exibe o QR code no terminal
  // Opcional: Salvar o QR code em um arquivo para acesso remoto
  fs.writeFile('/home/ubuntu/meu-bot/qrcode.txt', qr)
    .then(() => console.log('✅ QR code salvo em /home/ubuntu/meu-bot/qrcode.txt'))
    .catch(err => console.error('❌ Erro ao salvar QR code:', err));
});

client.on('authenticated', () => {
  console.log('✅ Autenticado com sucesso!');
});

client.on('message', async (msg) => {
  try {
    await handleMessage(msg, client);
  } catch (err) {
    console.error('❌ Erro ao processar mensagem:', err);
  }
});

client.on('ready', async () => {
  console.log('🤖 Bot pronto e conectado!');
  try {
    let chats = [];
    for (let i = 0; i < 5; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 3000));
        chats = await client.getChats();
        break;
      } catch (err) {
        console.warn(`⚠️ Tentativa ${i + 1} falhou ao carregar chats:`, err.message);
        if (i === 4) {
          console.log('🔄 Reinicializando cliente devido a falhas persistentes...');
          await client.destroy();
          await client.initialize();
          throw err;
        }
      }
    }
    console.log('📚 Chats carregados:', chats.length);
    await enviarParaGrupo(client, 'Mensagens', '🤖 Bot inicializado e online!');
    await scheduleMessages();
  } catch (err) {
    console.error('❌ Erro ao iniciar o bot:', err);
  }
});

async function enviarParaGrupo(client, nomeDoGrupo, mensagem) {
  try {
    if (!client || typeof client.getChats !== 'function') {
      console.warn('⚠️ Cliente do WhatsApp ainda não está pronto.');
      return;
    }
    const chats = await client.getChats();
    if (!Array.isArray(chats) || chats.length === 0) {
      console.warn('⚠️ Nenhum chat foi retornado pelo cliente.');
      return;
    }
    const grupo = chats.find(chat => chat.name === nomeDoGrupo);
    if (!grupo) {
      console.warn(`❌ Grupo "${nomeDoGrupo}" não encontrado.`);
      return;
    }
    await grupo.sendMessage(mensagem);
    console.log(`✅ Mensagem enviada para o grupo "${nomeDoGrupo}"`);
  } catch (error) {
    console.error(`❌ Erro ao tentar enviar mensagem para o grupo "${nomeDoGrupo}":`, error.message || error);
    if (error.message.includes('Evaluation failed') || error.message.includes('disconnected')) {
      console.log('🔄 Tentando reconectar o cliente...');
      try {
        await client.destroy();
        await client.initialize();
        const chats = await client.getChats();
        const grupo = chats.find(chat => chat.name === nomeDoGrupo);
        if (grupo) {
          await grupo.sendMessage(mensagem);
          console.log(`✅ Mensagem enviada após reconexão para o grupo "${nomeDoGrupo}"`);
        }
      } catch (retryError) {
        console.error('❌ Falha na reconexão:', retryError);
      }
    }
  }
}

app.post('/enviar-relatorio', async (req, res) => {
  const { mensagem } = req.body;
  if (!mensagem) {
    return res.status(400).json({ error: 'Mensagem não fornecida' });
  }
  try {
    await enviarParaGrupo(client, 'DOCES DA MORENA EMPRESA', mensagem);
    res.status(200).json({ status: 'Mensagem enviada com sucesso' });
  } catch (err) {
    console.error('❌ Erro ao enviar relatório:', err);
    res.status(500).json({ error: 'Erro ao enviar relatório' });
  }
});

async function runPythonMethod(module, method) {
  try {
    const script = `
import sys
from ${module} import ${method}
${method}()
`;
    const { stdout, stderr } = await execPromise(`/home/ubuntu/meu-bot/venv310/bin/python3 -c "${script}"`, {
      env: { ...process.env, PYTHONPATH: '/home/ubuntu/meu-bot' }
    });
    console.log(`✅ Método Python ${module}.${method} executado:`, stdout);
    if (stderr) console.error(`⚠️ Erro no método Python ${module}.${method}:`, stderr);
  } catch (err) {
    console.error(`❌ Falha ao executar método Python ${module}.${method}:`, err.message);
  }
}

async function scheduleMessages() {
  try {
    const data = await fs.readFile('/home/ubuntu/meu-bot/scheduled_messages.json', 'utf8');
    const { messages } = JSON.parse(data);
    messages.forEach((msg) => {
      if (!msg.enabled) return;
      cron.schedule(msg.schedule, async () => {
        console.log(`📤 Enviando mensagem agendada: ${msg.id}`);
        try {
          if (msg.python_method) {
            const [module, method] = msg.python_method.split('.');
            await runPythonMethod(module, method);
            console.log(`✅ Método Python ${msg.python_method} executado para ${msg.id}`);
          } else if (msg.type === 'whatsapp') {
            const mensagem = msg.message.replace(/\${(.*?)}/g, (match, code) => eval(code));
            await enviarParaGrupo(client, msg.destination, mensagem);
            console.log(`✅ Mensagem WhatsApp enviada: ${msg.id}`);
          } else if (msg.type === 'discord') {
            const mensagem = msg.message.replace(/\${(.*?)}/g, (match, code) => eval(code));
            await axios.post(msg.destination, { content: mensagem });
            console.log(`✅ Mensagem Discord enviada: ${msg.id}`);
          }
        } catch (err) {
          console.error(`❌ Erro ao enviar mensagem agendada ${msg.id}:`, err.message || err);
        }
      });
    });
    console.log('📅 Mensagens agendadas carregadas com sucesso');
  } catch (err) {
    console.error('❌ Erro ao carregar scheduled_messages.json:', err);
  }
}

app.post('/enviar-mensagem', async (req, res) => {
  const { mensagem } = req.body;
  if (!mensagem) {
    return res.status(400).json({ error: 'Mensagem não fornecida' });
  }
  try {
    await enviarParaGrupo(client, 'Mensagens', mensagem);
    res.status(200).json({ status: 'Mensagem enviada com sucesso' });
  } catch (err) {
    console.error('❌ Erro ao enviar mensagem:', err);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

app.listen(3000, () => {
  console.log('🚀 Servidor rodando na porta 3000');
});

client.initialize();
