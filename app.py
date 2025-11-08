import uuid
import os
import base64

from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, join_room

app = Flask(__name__)

# Папка для загруженных файлов
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "static", "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

socketio = SocketIO(app, async_mode="eventlet")


@app.route("/")
def index():
    chat_id = uuid.uuid4().hex
    return render_template("index.html", chat_id=chat_id)


@app.route("/chat/<chat_id>")
def chat(chat_id):
    return render_template("chat.html", chat_id=chat_id)


@socketio.on("join_chat")
def on_join(data):
    chat_id = data["chat_id"]
    join_room(chat_id)
    socketio.emit(
        "receive_message",
        {"text": "Пользователь подключился!", "sender_id": data["sender_id"]},
        to=chat_id,
    )


@socketio.on("update_message")
def handle_message(data):
    socketio.emit(
        "receive_message",
        {"text": data["text"], "sender_id": data["sender_id"]},
        to=data["chat_id"],
    )


@socketio.on("call:request")
def handle_call_request(data):
    chat_id = data["chatId"]
    socketio.emit("call:incoming", data, to=chat_id, skip_sid=request.sid)  # pyright: ignore[reportAttributeAccessIssue]


@socketio.on("call:response")
def handle_call_response(data):
    chat_id = data["chatId"]
    if data["accepted"]:
        socketio.emit("call:accepted", data, to=chat_id, skip_sid=request.sid)  # pyright: ignore[reportAttributeAccessIssue]
    else:
        socketio.emit("call:rejected", data, to=chat_id, skip_sid=request.sid)  # pyright: ignore[reportAttributeAccessIssue]


# WebRTC сигнализация
@socketio.on("webrtc:ice-candidate")
def handle_ice_candidate(data):
    chat_id = data["chatId"]
    socketio.emit("webrtc:ice-candidate", data, to=chat_id, skip_sid=request.sid)  # pyright: ignore[reportAttributeAccessIssue]


@socketio.on("update_attachments")
def handle_update_attachments(data):
    """При получении списка прикреплённых файлов от клиента — рассылка остальным в комнате."""
    chat_id = data.get("chat_id")
    if not chat_id:
        return
    socketio.emit("receive_attachments", data, to=chat_id, skip_sid=request.sid)  # pyright: ignore[reportAttributeAccessIssue]


@app.route("/upload", methods=["POST"])
def upload_files():
    # Принимаем multipart/form-data с полем files (может быть несколько файлов)
    # Изменено: не сохраняем файлы на диск. Читаем содержимое и возвращаем base64-данные.
    files = request.files.getlist("files")
    saved = []
    for f in files:
        if not f or f.filename == "":
            continue
        # читаем содержимое в память
        content = f.read()
        size = len(content)
        # кодируем в base64 для передачи в JSON; формируем data URL
        b64 = base64.b64encode(content).decode("ascii")
        mime = f.mimetype or "application/octet-stream"
        data_url = f"data:{mime};base64,{b64}"
        saved.append(
            {
                "name": f.filename,
                "size": size,
                "type": mime,
                "data": data_url,
            }
        )
    return jsonify({"files": saved})


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=80, debug=True)
