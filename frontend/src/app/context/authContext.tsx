"use client"

import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

// Define the shape of the user object
interface User {
  id: number;
  username: string;
  avatarUrl: string;
}

// Create a context to manage authentication
interface AuthContextProps {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Auth provider to wrap the app
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user data from the backend (cookie-based JWT authentication)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
          withCredentials: true
        }); // API endpoint to fetch the current user
        setUser(response.data);
      } catch (error) {
        setError("Failed to authenticate.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/discord`; // Redirect to Discord login page
  };

  const logout = async () => {
    try {
      await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
        withCredentials: true
      });
      setUser(null);
      window.location.href = "/";
    } catch (error) {
      setError("Failed to logout.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to access the context
export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
