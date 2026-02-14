import { useEffect, useMemo } from "react";
import { io, type Socket } from "socket.io-client";
import useAuthStore from "../stores/authStore";

let sharedSocket: Socket | null = null;
let sharedToken: string | null = null;
let activeConsumers = 0;

const buildSocket = (token: string) =>
  io("/", {
    path: "/ws/socket.io",
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    auth: { token },
    transports: ["websocket", "polling"],
  });

const useSocket = () => {
  const token = useAuthStore((state) => state.token);

  const socket = useMemo(() => {
    if (!token) {
      return null;
    }

    if (!sharedSocket || sharedToken !== token) {
      if (sharedSocket) {
        sharedSocket.disconnect();
      }
      sharedSocket = buildSocket(token);
      sharedToken = token;
    } else {
      sharedSocket.auth = { token };
    }

    return sharedSocket;
  }, [token]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    activeConsumers += 1;
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      activeConsumers -= 1;
      if (activeConsumers <= 0) {
        socket.disconnect();
        sharedSocket = null;
        sharedToken = null;
        activeConsumers = 0;
      }
    };
  }, [socket]);

  return socket;
};

export default useSocket;
