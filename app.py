import uuid
from flask import Flask, render_template, send_from_directory, request, jsonify
from flask_socketio import SocketIO, join_room, leave_room, disconnect
import time
import hmac
import hashlib
from dotenv import load_dotenv
import os

load_dotenv()

TURN_SECRET = os.getenv("TURN_SECRET")
TURN_REALM = os.getenv("TURN_REALM")
TURN_SERVER = os.getenv("TURN_SERVER")
TURN_PORT = int(os.getenv("TURN_PORT"))

app = Flask(__name__)
socketio = SocketIO(app, async_mode='eventlet')

def generate_turn_credentials():
    # Время истечения креденциалов (в секундах)
    expiration_time = int(time.time()) + 3600  # 1 час
    
    # Генерируем пароль как HMAC(secret, username)
    username = str(expiration_time)
    
    password = hmac.new(
        TURN_SECRET.encode(),
        msg=username.encode(),
        digestmod=hashlib.sha1
    ).hexdigest()

    return {
        "username": username,
        "password": password,
        "ttl": 3600
    }

@app.route('/turn-config')
def turn_config():
    creds = generate_turn_credentials()
    return jsonify({
        "iceServers": [
            {"urls": "stun:stun.l.google.com:19302"},
            {
                "urls": [
                    f"turn:{TURN_SERVER}:{TURN_PORT}?transport=udp",
                    f"turn:{TURN_SERVER}:{TURN_PORT}?transport=tcp"
                ],
                "username": creds["username"],
                "credential": creds["password"],
                "credentialType": "token"  # Важно: указываем тип токен
            }
        ]
    })

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
    join_room(chat_id)
    socketio.emit(
        'receive_message', 
        {'text': 'Пользователь подключился!', 'sender_id': data['sender_id']},
        room=chat_id)

@socketio.on('update_message')
def handle_message(data):
    socketio.emit(
        'receive_message',
        {'text': data['text'], 'sender_id': data['sender_id']},
        room=data['chat_id'])

@socketio.on('call:request')
def handle_call_request(data):
    chat_id = data['chatId']
    socketio.emit('call:incoming', data, room=chat_id, skip_sid=request.sid)

@socketio.on('call:response')
def handle_call_response(data):
    chat_id = data['chatId']
    if data['accepted']:
        socketio.emit('call:accepted', data, room=chat_id, skip_sid=request.sid)
    else:
        socketio.emit('call:rejected', data, room=chat_id, skip_sid=request.sid)

@socketio.on('call:ended')
def handle_call_end(data):
    chat_id = data['chatId']
    socketio.emit('call:ended', data, room=chat_id, skip_sid=request.sid)

@socketio.on('webrtc:offer')
def handle_webrtc_offer(data):
    chat_id = data['chatId']
    socketio.emit('webrtc:offer', data, room=chat_id, skip_sid=request.sid)

@socketio.on('webrtc:answer')
def handle_webrtc_answer(data):
    chat_id = data['chatId']
    socketio.emit('webrtc:answer', data, room=chat_id, skip_sid=request.sid)

@socketio.on('webrtc:ice-candidate')
def handle_ice_candidate(data):
    chat_id = data['chatId']
    socketio.emit('webrtc:ice-candidate', data, room=chat_id, skip_sid=request.sid)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=80, debug=True)