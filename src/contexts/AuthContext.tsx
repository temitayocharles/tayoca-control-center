import React, { createContext, useContext, type ReactNode } from 'react';

interface ExternalAuthContextType {
  isAuthenticated: true;
  loading: false;
}

const ExternalAuthContext = createContext<ExternalAuthContextType>({
  isAuthenticated: true,
  loading: false,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ExternalAuthContext.Provider value={{ isAuthenticated: true, loading: false }}>
    {children}
  </ExternalAuthContext.Provider>
);

export const useAuth = () => useContext(ExternalAuthContext);
