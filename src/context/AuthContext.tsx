/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';

import {
    setFreebox,
    registerApp,
    getTrackStatus,
    getChallenge,
    computePassword,
    openSession,
    closeSession,
    discoverFreebox,
    wakePlayer as fbxWakePlayer,
} from '../freebox/api';
import type { AuthStatus } from '../freebox/types';
import type { FbxProfile } from './types';

const APP_CONFIG = {
    app_id: 'fr.antigravity.freebox.remote',
    app_name: 'Freebox Remote',
    app_version: '1.0.1',
    device_name: 'Mon navigateur',
    permissions: {
        player: true,
        home: true,
    },
};

const LS_TOKEN = 'fbx_app_token';
const LS_HOST = 'fbx_host';
const LS_REMOTE_CODE = 'fbx_remote_code';
const LS_PROFILES = 'fbx_profiles';

interface AuthCtx {
    host: string;
    remoteCode: string;
    status: AuthStatus;
    permissions: Record<string, boolean>;
    errorMsg: string;
    savedProfiles: FbxProfile[];
    connect: (host: string, remoteCode: string) => Promise<void>;
    connectSaved: (profile: FbxProfile) => Promise<void>;
    deleteProfile: (id: string) => void;
    logout: () => Promise<void>;
    wakePlayer: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [host, setHost] = useState(() => localStorage.getItem(LS_HOST) || 'mafreebox.freebox.fr');
    const [remoteCode, setRemoteCode] = useState(() => localStorage.getItem(LS_REMOTE_CODE) || '');
    const [status, setStatus] = useState<AuthStatus>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});
    const [savedProfiles, setSavedProfiles] = useState<FbxProfile[]>(() => {
        try {
            return JSON.parse(localStorage.getItem(LS_PROFILES) || '[]');
        } catch {
            return [];
        }
    });
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const saveProfile = useCallback((h: string, rc: string, token: string) => {
        setSavedProfiles(prev => {
            const newList = prev.filter(p => p.id !== h);
            newList.push({ id: h, host: h, remoteCode: rc, appToken: token, lastUsed: Date.now() });
            newList.sort((a, b) => b.lastUsed - a.lastUsed);
            localStorage.setItem(LS_PROFILES, JSON.stringify(newList));
            return newList;
        });
    }, []);

    const deleteProfile = useCallback((id: string) => {
        setSavedProfiles(prev => {
            const newList = prev.filter(p => p.id !== id);
            localStorage.setItem(LS_PROFILES, JSON.stringify(newList));
            return newList;
        });
    }, []);

    const restoreSession = useCallback(async (h: string, appToken: string, currentRc: string) => {
        try {
            setFreebox(h);
            const { challenge } = await getChallenge();
            const password = await computePassword(appToken, challenge);

            const session = await openSession(APP_CONFIG.app_id, password);
            setPermissions(session.permissions);
            setStatus('logged_in');

            if (currentRc) await saveProfile(h, currentRc, appToken);
        } catch {
            setStatus('idle');
        }
    }, [saveProfile]);

    const connect = useCallback(async (h: string, rc: string) => {
        setErrorMsg('');
        setStatus('registering');
        setHost(h);
        setRemoteCode(rc);
        localStorage.setItem(LS_HOST, h);
        localStorage.setItem(LS_REMOTE_CODE, rc);

        try {
            setFreebox(h);

            const existingProfile = savedProfiles.find(p => p.host === h);
            if (existingProfile) {
                await restoreSession(h, existingProfile.appToken, rc);
                return;
            }

            const { app_token, track_id } = await registerApp(APP_CONFIG);
            localStorage.setItem(LS_TOKEN, app_token);
            setStatus('pending');

            if (pollRef.current) {
                clearInterval(pollRef.current);
            }
            pollRef.current = setInterval(async () => {
                try {
                    const trackStatus = await getTrackStatus(track_id);
                    if (trackStatus.status === 'granted') {
                        clearInterval(pollRef.current!);
                        const { challenge } = await getChallenge();
                        const password = await computePassword(app_token, challenge);

                        const session = await openSession(APP_CONFIG.app_id, password);
                        setPermissions(session.permissions);
                        setStatus('logged_in');

                        saveProfile(h, rc, app_token);
                    } else if (trackStatus.status === 'denied') {
                        clearInterval(pollRef.current!);
                        setStatus('denied');
                        setErrorMsg('Autorisation refusée sur la Freebox.');
                        localStorage.removeItem(LS_TOKEN);
                    } else if (trackStatus.status === 'timeout') {
                        clearInterval(pollRef.current!);
                        setStatus('error');
                        setErrorMsg('Délai dépassé. Veuillez réessayer.');
                        localStorage.removeItem(LS_TOKEN);
                    }
                } catch (e: unknown) {
                    clearInterval(pollRef.current!);
                    const msg = e instanceof Error ? e.message : 'Erreur inconnue';
                    setStatus('error');
                    setErrorMsg(msg);
                }
            }, 2000);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Erreur de connexion';
            setStatus('error');
            setErrorMsg(msg);
        }
    }, [restoreSession, saveProfile, savedProfiles]);

    const connectSaved = useCallback(async (profile: FbxProfile) => {
        setErrorMsg('');
        setStatus('registering');
        setHost(profile.host);
        setRemoteCode(profile.remoteCode);
        localStorage.setItem(LS_HOST, profile.host);
        localStorage.setItem(LS_REMOTE_CODE, profile.remoteCode);
        localStorage.setItem(LS_TOKEN, profile.appToken);

        await restoreSession(profile.host, profile.appToken, profile.remoteCode);
    }, [restoreSession]);

    const logout = useCallback(async () => {
        await closeSession();
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        localStorage.removeItem(LS_TOKEN);
        localStorage.removeItem(LS_HOST);
        localStorage.removeItem(LS_REMOTE_CODE);
        setRemoteCode('');
        setStatus('idle');
        setPermissions({});
    }, []);

    const wakePlayer = useCallback(async () => {
        try {
            await fbxWakePlayer();
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        const checkAuto = async () => {
            const savedToken = localStorage.getItem(LS_TOKEN);
            const savedHost = localStorage.getItem(LS_HOST);
            const savedRemoteCode = localStorage.getItem(LS_REMOTE_CODE);

            if (savedToken && savedHost) {
                await restoreSession(savedHost, savedToken, savedRemoteCode || '');
            }
        };
        checkAuto();
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [restoreSession]);


    return (
        <AuthContext.Provider value={{ host, remoteCode, status, permissions, errorMsg, savedProfiles, connect, connectSaved, deleteProfile, logout, wakePlayer }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
