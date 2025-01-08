PROJECT_NAME = "live-message"

import uuid
from flask import Flask, render_template, redirect, url_for, Blueprint
from flask_socketio import SocketIO, join_room, leave_room

if __name__ == '__main__':
    app = Flask(__name__)
    socketio = SocketIO(app)
else:
    socketio = SocketIO()

LiveMessage_bp = Blueprint(
    PROJECT_NAME,
    __name__,
    template_folder='templates',
    static_folder='static',
    static_url_path='/static'
    )
app.register_blueprint(LiveMessage_bp, url_prefix=f'/{PROJECT_NAME}')

@app.context_processor
def inject_project_name():
    return {'PROJECT_NAME': PROJECT_NAME}

@app.route('/')
def index():
    chat_id = uuid.uuid4().hex  # генерируем chat_id
    return render_template('index.html', chat_id=chat_id)

@app.route('/chat/<chat_id>')
def chat(chat_id):
    return render_template('chat.html', chat_id=chat_id)

@socketio.on('join_chat')
def on_join(data):
    chat_id = data['chat_id']
    sender_id = data['sender_id']
    join_room(chat_id)  # Подключаем клиента к комнате с chat_id
    print(f'Client joined chat {chat_id}')
    socketio.emit('receive_message', {'text': 'Пользователь подключился!', 'sender_id': sender_id}, room=chat_id)


@socketio.on('update_message')
def handle_message(data):
    chat_id = data['chat_id']
    text = data['text']
    sender_id = data['sender_id']
    # Отправляем сообщение только в комнату chat_id
    socketio.emit('receive_message', {'text': text, 'sender_id': sender_id}, room=chat_id)

@socketio.on('leave_chat')
def on_leave(data):
    chat_id = data['chat_id']
    leave_room(chat_id)  # клиент покидает комнату
    print(f'Client left chat {chat_id}')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)