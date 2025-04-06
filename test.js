const qrcode = require('qrcode-terminal');
const { Client, Buttons, List, MessageMedia } = require('whatsapp-web.js');
const client = new Client();

// Serviço de leitura do QR code
client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

// Após isso ele diz que foi tudo certo
client.on('ready', () => {
    console.log('Tudo certo! WhatsApp conectado.');
});

// Inicializa tudo
client.initialize();

const delay = ms => new Promise(res => setTimeout(res, ms));

// Nome do grupo de teste
const TEST_GROUP_NAME = "Teste_bot";

// Funil
client.on('message', async msg => {
    const chat = await msg.getChat();

    // Verifica se a mensagem veio do grupo de teste
    if (chat.isGroup && chat.name === TEST_GROUP_NAME) {

        // Responde às mensagens de saudação
        if (msg.body.match(/(menu|Menu|dia|tarde|noite|oi|Oi|Olá|olá|ola|Ola)/i)) {
            await delay(3000);
            await chat.sendStateTyping();
            await delay(3000);
            const contact = await msg.getContact();
            const name = contact.pushname;
            await client.sendMessage(msg.from,'Olá! '+ name.split(" ")[0] + ' Sou o assistente virtual da empresa tal. Como posso ajudá-lo hoje? Por favor, digite uma das opções abaixo:\n\n1 - Como funciona\n2 - Valores dos planos\n3 - Benefícios\n4 - Como aderir\n5 - Outras perguntas');
            await delay(3000);
            await chat.sendStateTyping();
            await delay(5000);
        }

        // Responde "tudo bem?"
        if (msg.body.match(/tudo bem?/i)) {
            await delay(3000);
            await chat.sendStateTyping();
            await delay(3000);
            await client.sendMessage(msg.from, 'Tudo bem, obrigado! Como posso ajudá-lo hoje?');
        }

        // Responde "já ouviu falar no Ugui?"
        if (msg.body.match(/já ouviu falar no Ugui?/i)) {
            await delay(3000);
            await chat.sendStateTyping();
            await delay(3000);
            await client.sendMessage(msg.from, 'Sim, já ouvi falar no Ugui! É um assistente virtual inovador. Como posso ajudá-lo com ele?');
        }

        // Responde às opções do menu
        if (msg.body === '1') {
            await delay(3000);
            await chat.sendStateTyping();
            await delay(3000);
            await client.sendMessage(msg.from, 'Nosso serviço oferece consultas médicas 24 horas por dia, 7 dias por semana, diretamente pelo WhatsApp.\n\nNão há carência, o que significa que você pode começar a usar nossos serviços imediatamente após a adesão.\n\nOferecemos atendimento médico ilimitado, receitas\n\nAlém disso, temos uma ampla gama de benefícios, incluindo acesso a cursos gratuitos');
            await delay(3000);
            await chat.sendStateTyping();
            await delay(3000);
            await client.sendMessage(msg.from, 'COMO FUNCIONA?\nÉ muito simples.\n\n1º Passo\nFaça seu cadastro e escolha o plano que desejar.\n\n2º Passo\nApós efetuar o pagamento do plano escolhido você já terá acesso a nossa área exclusiva para começar seu atendimento na mesma hora.\n\n3º Passo\nSempre que precisar');
            await delay(3000);
            await chat.sendStateTyping();
            await delay(3000);
            await client.sendMessage(msg.from, 'Link para cadastro: https://site.com');
        }

        if (msg.body === '2') {
            await delay(3000);
            await chat.sendStateTyping();
            await delay(3000);
            await client.sendMessage(msg.from, '*Plano Individual:* R$22,50 por mês.\n\n*Plano Família:* R$39,90 por mês, inclui você mais 3 dependentes.\n\n*Plano TOP Individual:* R$42,50 por mês, com benefícios adicionais como\n\n*Plano TOP Família:* R$79,90 por mês, inclui você mais 3 dependentes');
            await delay(3000);
            await chat.sendStateTyping();
            await delay(3000);
            await client.sendMessage(msg.from, 'Link para cadastro: https://site.com');
        }

        if (msg.body === '3') {
            await delay(3000);
            await chat.sendStateTyping();
            await delay(3000);
            await client.sendMessage(msg.from, 'Sorteio de em prêmios todo ano.\n\nAtendimento médico ilimitado 24h por dia.\n\nReceitas de medicamentos');
            await delay(3000);
            await chat.sendStateTyping();
            await delay(3000);
            await client.sendMessage(msg.from, 'Link para cadastro: https://site.com');
        }

        if (msg.body === '4') {
            await delay(3000);
            await chat.sendStateTyping();
            await delay(3000);
            await client.sendMessage(msg.from, 'Você pode aderir aos nossos planos diretamente pelo nosso site ou pelo WhatsApp.\n\nApós a adesão, você terá acesso imediato');
            await delay(3000);
            await chat.sendStateTyping();
            await delay(3000);
            await client.sendMessage(msg.from, 'Link para cadastro: https://site.com');
        }

        if (msg.body === '5') {
            await delay(3000);
            await chat.sendStateTyping();
            await delay(3000);
            await client.sendMessage(msg.from, 'Se você tiver outras dúvidas ou precisar de mais informações, por favor, fale aqui nesse whatsapp ou visite nosso site: https://site.com ');
        }
    }
});
