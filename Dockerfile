FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn eventlet && \
    find . -name "__pycache__" -exec rm -rf {} + && \
    find . -name "*.pyc" -delete

COPY . .

RUN find . -name "__pycache__" -exec rm -rf {} + \
    && find . -name "*.pyc" -delete

CMD ["gunicorn", "--worker-class", "eventlet", "-w", "1", "--bind", "0.0.0.0:1100", "app:app"]