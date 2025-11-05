import uuid
from flask import Flask, render_template, send_from_directory, request
from flask_socketio import SocketIO, join_room, leave_room, disconnect

app = Flask(__name__)
socketio = SocketIO(app, async_mode='eventlet')

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
    # Передаём ВЕСЬ объект data, включая sdp (offer)
    socketio.emit('call:incoming', data, room=chat_id, skip_sid=request.sid)

@socketio.on('call:response')
def handle_call_response(data):
    chat_id = data['chatId']
    if data['accepted']:
        socketio.emit('call:accepted', data, room=chat_id, skip_sid=request.sid)
    else:
        socketio.emit('call:rejected', data, room=chat_id, skip_sid=request.sid)

# WebRTC сигнализация
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