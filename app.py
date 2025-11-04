import uuid
from flask import Flask, render_template, send_from_directory
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
    socketio.emit('receive_message', 
                 {'text': 'Пользователь подключился!', 'sender_id': data['sender_id']}, 
                 room=chat_id)

@socketio.on('update_message')
def handle_message(data):
    socketio.emit('receive_message', 
                 {'text': data['text'], 'sender_id': data['sender_id']}, 
                 room=data['chat_id'])

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5001)