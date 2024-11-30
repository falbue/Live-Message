from flask import Flask, render_template
from flask_socketio import SocketIO

app = Flask(__name__)
socketio = SocketIO(app)

@app.route('/')
def index():
    return render_template('chat.html')

@socketio.on('update_message')
def handle_message(data):
    # Отправляем сообщение всем клиентам, кроме отправителя
    socketio.emit('receive_message', data, include_self=False)


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=80, debug=True)