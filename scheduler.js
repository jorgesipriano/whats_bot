const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cron = require('node-cron');

const tarefas = JSON.parse(fs.readFileSync(path.join(__dirname, 'scheduled_messages.json'), 'utf-8')).messages;

tarefas.forEach(tarefa => {
  if (!tarefa.enabled) return;

  cron.schedule(tarefa.schedule, () => {
    console.log(`⏰ Executando tarefa: ${tarefa.id} (${new Date().toISOString()})`);

    if (tarefa.python_method) {
      const [modulo, funcao] = tarefa.python_method.split('.');
      const scriptPath = `${modulo}.py`;

      // Executa o script Python
      exec(`python3 ${scriptPath}`, (err, stdout, stderr) => {
        if (err) {
          console.error(`❌ Erro na tarefa ${tarefa.id}:`, stderr);
        } else {
          console.log(`✅ Tarefa ${tarefa.id} executada com sucesso:\n${stdout}`);
        }
      });

    } else if (tarefa.message && tarefa.type === 'whatsapp') {
      exec(`curl -X POST http://localhost:3000/enviar-mensagem -H "Content-Type: application/json" -d '${JSON.stringify({
        grupo: tarefa.destination,
        mensagem: tarefa.message
      })}'`);
    } else if (tarefa.message && tarefa.type === 'discord') {
      exec(`curl -X POST ${tarefa.destination} -H "Content-Type: application/json" -d '${JSON.stringify({
        content: tarefa.message.replace('${new Date().toLocaleString(\'pt-BR\')}', new Date().toLocaleString('pt-BR'))
      })}'`);
    }
  });
});
