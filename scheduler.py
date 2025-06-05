import json
import importlib
import schedule
import time
import requests
from datetime import datetime

def load_scheduled_messages():
    try:
        with open('scheduled_messages.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print('scheduled_messages.json não encontrado.')
        return []

def run_scheduled_task(task):
    try:
        module_name, function_name = task['python_method'].split('.')
        module = importlib.import_module(module_name)
        func = getattr(module, function_name)
        if func():
            print(f"Mensagem enviada para '{task['destination']}' ({task['id']})")
        else:
            print(f"Erro ao enviar mensagem para '{task['destination']}' ({task['id']})")
    except Exception as e:
        print(f"Erro ao executar tarefa '{task['id']}': {str(e)}")

def main():
    tasks = load_scheduled_messages()
    for task in tasks:
        if task.get('enabled', False):
            # Extract hour from cron schedule (e.g., "0 9 * * 1" -> "09:00")
            cron_parts = task['schedule'].split()
            hour = cron_parts[1]
            minute = cron_parts[0]
            day_of_week = cron_parts[4]
            # Map cron day (0=Sun, 1=Mon, ..., 6=Sat) to schedule's day
            days = {
                '0': 'sunday',
                '1': 'monday',
                '2': 'tuesday',
                '3': 'wednesday',
                '4': 'thursday',
                '5': 'friday',
                '6': 'saturday'
            }
            if day_of_week in days:
                getattr(schedule.every(), days[day_of_week]).at(f"{hour.zfill(2)}:{minute.zfill(2)}").do(
                    run_scheduled_task, task=task
                ).tag(task['id'])
    
    print("Agendador rodando...")
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == '__main__':
    main()
