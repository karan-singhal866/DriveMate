import { io } from "socket.io-client";

const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL ||
    "http://localhost:5000";

const socket = io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
});

socket.on("connect", () => {
    console.log("SOCKET CONNECTED:", socket.id);
});

socket.on("disconnect", reason => {
    console.log("SOCKET DISCONNECTED:", reason);
});

socket.on("connect_error", error => {
    console.error(
        "SOCKET CONNECTION ERROR:",
        error.message
    );
});

socket.on("reconnect", attempt => {
    console.log(
        "SOCKET RECONNECTED. Attempt:",
        attempt
    );
});

export default socket;