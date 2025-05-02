const cron = require("node-cron");
const { exec } = require("child_process");
const { carregarLogs } = require('./validadorCrons');
const { enviarParaGrupo } = require('./mensagens');

const NOME_DO_PROCESSO = "bot-what";
const GRUPO = "Mensagens";

// Verificação do PM2 e reinício se necessário
function iniciarMonitoramento(client) {
  cron.schedule("*/5 * * * *", () => {
    exec(`pm2 show ${NOME_DO_PROCESSO}`, async (err, stdout) => {
      if (err || stdout.includes("errored")) {
        const alerta = `⚠️ Bot fora do ar! Tentando reiniciar...`;
        console.log(alerta);
        await enviarParaGrupo(GRUPO, alerta, client);

        exec(`pm2 restart ${NOME_DO_PROCESSO}`, (err2) => {
          if (!err2) {
            const sucesso = `✅ Bot reiniciado com sucesso!`;
            console.log(sucesso);
            enviarParaGrupo(GRUPO, sucesso, client);
          }
        });
      }
    });
  });

  // Status completo a cada 30 minutos
  cron.schedule("*/30 * * * *", async () => {
    try {
      const logs = carregarLogs();
      const statusHora = new Date().toLocaleTimeString("pt-BR");

      const execStatus = await new Promise((resolve) => {
        exec(`pm2 show ${NOME_DO_PROCESSO}`, (err, stdout) => {
          if (err || stdout.includes("errored")) {
            resolve("❌ Bot fora do ar!");
          } else {
            resolve("✅ Bot ativo via PM2.");
          }
        });
      });

      let statusCrons = "✅ Todos os crons estão atualizados.";
      const agora = new Date();
      const falhas = [];

      for (const [nome, dataStr] of Object.entries(logs)) {
        const data = new Date(dataStr);
        const dif = (agora - data) / 60000; // diferença em minutos
        if (dif > 40) {
          falhas.push(`⚠️ *${nome}* não executado há mais de 40 minutos.`);
        }
      }

      if (falhas.length > 0) {
        statusCrons = `⚠️ Problemas detectados nos crons:\n${falhas.join("\n")}`;
      }

      const msgFinal = `📢 *Status do Bot - ${statusHora}*\n\n${execStatus}\n\n${statusCrons}`;
      await enviarParaGrupo(GRUPO, msgFinal, client);
    } catch (e) {
      console.error("Erro ao enviar status:", e);
    }
  });
}

module.exports = iniciarMonitoramento;
