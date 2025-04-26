# Используем официальный образ Python
FROM python:3.9-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем зависимости
COPY requirements.txt .

# Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем остальные файлы
COPY . .

# Порт, который будет использоваться
EXPOSE 8000

# Запускаем Gunicorn
CMD ["gunicorn", "--worker-class", "eventlet", "-w", "1", "-b", ":8000", "app:create_app()"]