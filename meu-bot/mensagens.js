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
  }
}

module.exports = { enviarParaGrupo };
