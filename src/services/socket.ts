// services/socket.ts
import { io } from "socket.io-client";

export const socket = io("http://10.0.0.125:5000", {
  autoConnect: false,
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export const connectSocket = (driverId: string) => {
  if (!socket.connected) {
    socket.connect();
    socket.once('connect', () => {
      console.log('Socket connected, joining room:', driverId);
      socket.emit("join", driverId);
    });
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};