from flask import Flask
from flask_socketio import SocketIO
from . import routes

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'your-secret-key'  # Замените на реальный секретный ключ
    
    # Инициализация SocketIO
    socketio = SocketIO()
    socketio.init_app(app)
    
    # Регистрация blueprint
    app.register_blueprint(routes.Blueprint)
    
    return app