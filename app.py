import uuid
from flask import Flask, render_template
from flask_socketio import SocketIO, join_room, leave_room
from flask import request

# In-memory tracking of call room participants: {chat_id: set(sid)}
CALL_ROOMS = {}
# Reverse map: {sid: set(chat_id)}
SID_ROOMS = {}

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


@socketio.on("join_call")
def handle_join_call(data):
    chat_id = data.get("chat_id")
    if not chat_id:
        return

    sid = request.sid
    room = CALL_ROOMS.setdefault(chat_id, set())
    # enforce max participants
    if len(room) >= 12:
        socketio.emit("call_full", {"chat_id": chat_id}, to=sid)
        return

    room.add(sid)
    SID_ROOMS.setdefault(sid, set()).add(chat_id)
    join_room(chat_id)
    # notify the joining client and the room
    socketio.emit("call_joined", {"chat_id": chat_id, "count": len(room)}, to=sid)
    socketio.emit("participant_joined", {"chat_id": chat_id, "count": len(room)}, to=chat_id)


@socketio.on("leave_call")
def handle_leave_call(data):
    chat_id = data.get("chat_id")
    if not chat_id:
        return

    sid = request.sid
    room = CALL_ROOMS.get(chat_id)
    if room and sid in room:
        room.discard(sid)
        if not room:
            # remove empty room entry
            CALL_ROOMS.pop(chat_id, None)
        SID_ROOMS.get(sid, set()).discard(chat_id)
        leave_room(chat_id)
        socketio.emit("call_left", {"chat_id": chat_id, "count": len(room) if room else 0}, to=chat_id)


@socketio.on("disconnect")
def handle_disconnect():
    sid = request.sid
    rooms = SID_ROOMS.pop(sid, set())
    for chat_id in list(rooms):
        room = CALL_ROOMS.get(chat_id)
        if room and sid in room:
            room.discard(sid)
            if not room:
                CALL_ROOMS.pop(chat_id, None)
            socketio.emit("call_left", {"chat_id": chat_id, "count": len(room) if room else 0}, to=chat_id)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=1100, debug=True)