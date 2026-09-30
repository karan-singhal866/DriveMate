import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";
import socket from "../services/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");

      if (!savedUser) {
        return null;
      }

      return JSON.parse(savedUser);
    } catch (error) {
      console.error(
        "Failed to load saved user:",
        error
      );

      return null;
    }
  });

  // Login
  const login = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem(
      "user",
      JSON.stringify(data.user)
    );

    setUser(data.user);
  };

  // Logout
  const logout = () => {
    socket.disconnect();

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
  };

  /*
   * Connect Socket.IO whenever an authenticated
   * user exists.
   */
  useEffect(() => {
    if (!user) {
      socket.disconnect();
      return;
    }

    const userId = user.id || user._id;

    console.log("SOCKET USER:", user);
    console.log("SOCKET USER ID:", userId);

    if (!userId) {
      console.error(
        "User ID is missing. Cannot join Socket.IO room."
      );

      return;
    }

    const userRoom = String(userId);

    /*
     * Join the user room only after Socket.IO has
     * successfully connected.
     */
    const handleConnect = () => {
      console.log(
        "SOCKET CONNECTED:",
        socket.id
      );

      console.log(
        "JOINING USER ROOM:",
        userRoom
      );

      socket.emit(
        "joinUser",
        userRoom
      );
    };

    const handleDisconnect = (reason) => {
      console.log(
        "SOCKET DISCONNECTED:",
        reason
      );
    };

    const handleConnectError = (error) => {
      console.error(
        "SOCKET CONNECTION ERROR:",
        error.message
      );
    };

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "connect_error",
      handleConnectError
    );

    /*
     * If the socket is already connected, join the
     * user room immediately.
     */
    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "connect_error",
        handleConnectError
      );
    };
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: Boolean(user)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}