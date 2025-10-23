import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { AuthContextType, User } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = 'https://time.anuwat.in.th';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            try {
                // Decode token to get user info without server verification (for UI purposes)
                const payloadBase64 = storedToken.split('.')[1];
                const decodedPayload = JSON.parse(atob(payloadBase64));
                
                if (decodedPayload.exp * 1000 > Date.now()) {
                    setUser({
                        id: decodedPayload.id,
                        username: decodedPayload.username,
                        role: decodedPayload.role,
                        id_school: decodedPayload.id_school,
                    });
                    setToken(storedToken);
                } else {
                    // Token expired
                    localStorage.removeItem('token');
                }
            } catch (error) {
                console.error("Failed to parse token:", error);
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    }, []);

    const login = async (username: string, password: string, id_school: string): Promise<{ success: boolean; message: string; }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/${id_school}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, message: data.message || 'Login failed' };
            }

            setUser(data.user);
            setToken(data.token);
            localStorage.setItem('token', data.token);
            return { success: true, message: 'Login successful' };

        } catch (error) {
            console.error("Login error:", error);
            return { success: false, message: 'An network error occurred.' };
        }
    };

    const systemLogin = async (username: string, password: string): Promise<{ success: boolean; message: string; }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/system/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (!response.ok) {
                return { success: false, message: data.message || 'Login failed' };
            }
            setUser(data.user);
            setToken(data.token);
            localStorage.setItem('token', data.token);
            return { success: true, message: 'Login successful' };
        } catch (error) {
            console.error("System login error:", error);
            return { success: false, message: 'A network error occurred.' };
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, systemLogin, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};