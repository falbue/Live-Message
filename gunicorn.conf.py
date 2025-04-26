workers = 1  # Для SocketIO рекомендуется 1 worker с eventlet
worker_class = 'eventlet'
bind = '0.0.0.0:80'
timeout = 30
keepalive = 5