FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Оптимизация: удаление кэша (не обязательно, но уменьшает размер)
RUN find . -name "__pycache__" -exec rm -rf {} + \
    && find . -name "*.pyc" -delete

# Запуск НАПРЯМУЮ через socketio (а не gunicorn)
CMD ["python", "app.py"]