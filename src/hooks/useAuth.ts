import { socket } from "../services/socket";

export const connectSocket = (userId: string) => {
  socket.auth = { userId };
  socket.connect();
};