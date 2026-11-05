import React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import {
  addAuthChangeListener,
  clearAuthSession,
  getAuthSession,
  saveAuthSession,
} from "./api/authSession.js";
import { expressRequest } from "./api/expressApi.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getAuthSession());
  const [sessionError, setSessionError] = useState("");

  useEffect(() => addAuthChangeListener(() => setSession(getAuthSession())), []);

  useEffect(() => {
    if (!session) return;
    setSessionError("");
    expressRequest("/auth/me").catch((error) => {
      if (error.status !== 401) setSessionError(error.message);
    });
  }, [session?.token]);

  function login(token, user) {
    setSessionError("");
    setSession(saveAuthSession(token, user));
  }

  function logout() {
    setSessionError("");
    clearAuthSession();
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, sessionError, user: session?.user ?? null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
