import uuid
from flask import Flask, render_template
from flask_socketio import SocketIO, join_room

app = Flask(__name__)
socketio = SocketIO(app, async_mode="eventlet")


@app.route("/")
def index():
    chat_id = uuid.uuid4().hex
    return render_template("index.html", chat_id=chat_id)


@app.route("/chat/<chat_id>")
def chat(chat_id):
    return render_template("chat.html", chat_id=chat_id)


@socketio.on("update_message")
def handle_message(data):
    chat_id = data.get("chat_id")
    if chat_id:
        join_room(chat_id)

    socketio.emit(
        "receive_message",
        {"text": data.get("text"), "sender_id": data.get("sender_id")},
        to=chat_id,
    )


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=1100, debug=True)