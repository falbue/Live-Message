import uuid
from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, leave_room
from dotenv import load_dotenv
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default_secret')
socketio = SocketIO(app, async_mode='eventlet', cors_allowed_origins="*")

# Хранилище для активных звонков: {chat_id: {user_sid: username}}
active_calls = {}

@app.route('/')
def index():
    chat_id = uuid.uuid4().hex
    return render_template('index.html', chat_id=chat_id)

@app.route('/chat/<chat_id>')
def chat(chat_id):
    return render_template('chat.html', chat_id=chat_id)

@socketio.on('join_chat')
def on_join(data):
    chat_id = data['chat_id']
    username = data.get('username', 'Anonymous')
    join_room(chat_id)
    
    # Сохраняем информацию о пользователе
    if chat_id not in active_calls:
        active_calls[chat_id] = {}
    active_calls[chat_id][request.sid] = username
    
    socketio.emit('receive_message', {
        'text': f'Пользователь {username} подключился!',
        'sender_id': data['sender_id']
    }, room=chat_id)

@socketio.on('update_message')
def handle_message(data):
    socketio.emit('receive_message', {
        'text': data['text'],
        'sender_id': data['sender_id']
    }, room=data['chat_id'])

@socketio.on('start_call')
def handle_start_call(data):
    chat_id = data['chat_id']
    sender_id = request.sid
    
    # Уведомляем всех в комнате о начале звонка
    for user_sid, username in active_calls.get(chat_id, {}).items():
        if user_sid != sender_id:
            socketio.emit('incoming_call', {
                'chat_id': chat_id,
                'caller_id': sender_id,
                'caller_name': active_calls[chat_id].get(sender_id, 'Anonymous')
            }, room=user_sid)

@socketio.on('join_call')
def handle_join_call(data):
    chat_id = data['chat_id']
    user_id = request.sid
    
    # Уведомляем всех в комнате о новом участнике звонка
    for user_sid in active_calls.get(chat_id, {}):
        if user_sid != user_id:
            socketio.emit('user_joined_call', {
                'chat_id': chat_id,
                'user_id': user_id,
                'username': active_calls[chat_id].get(user_id, 'Anonymous')
            }, room=user_sid)

@socketio.on('leave_call')
def handle_leave_call(data):
    chat_id = data['chat_id']
    user_id = request.sid
    
    # Удаляем пользователя из активных звонков
    if chat_id in active_calls and user_id in active_calls[chat_id]:
        del active_calls[chat_id][user_id]
        if not active_calls[chat_id]:
            del active_calls[chat_id]
    
    # Уведомляем всех в комнате об уходе участника
    socketio.emit('user_left_call', {
        'chat_id': chat_id,
        'user_id': user_id
    }, room=chat_id)

@socketio.on('webrtc_offer')
def handle_webrtc_offer(data):
    socketio.emit('webrtc_offer', data, room=data['recipient_id'])

@socketio.on('webrtc_answer')
def handle_webrtc_answer(data):
    socketio.emit('webrtc_answer', data, room=data['recipient_id'])

@socketio.on('webrtc_ice_candidate')
def handle_webrtc_ice_candidate(data):
    socketio.emit('webrtc_ice_candidate', data, room=data['recipient_id'])

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    
    # Удаляем пользователя из всех активных звонков
    for chat_id, users in list(active_calls.items()):
        if sid in users:
            del users[sid]
            if not users:
                del active_calls[chat_id]
            
            # Уведомляем остальных участников
            socketio.emit('user_left_call', {
                'chat_id': chat_id,
                'user_id': sid
            }, room=chat_id)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=80, debug=True)