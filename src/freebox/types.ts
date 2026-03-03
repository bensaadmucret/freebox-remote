// ─── Freebox API types ─────────────────────────────────────────────────────

export interface FbxApiResponse<T> {
    success: boolean;
    result?: T;
    error_code?: string;
    msg?: string;
}

export interface AppTokenResult {
    app_token: string;
    track_id: number;
}

export interface AuthorizeStatus {
    status: 'unknown' | 'pending' | 'timeout' | 'granted' | 'denied';
    challenge: string;
    password_salt: string;
    logged_in: boolean;
}

export interface SessionResult {
    session_token: string;
    challenge: string;
    permissions: Record<string, boolean>;
}

// Keys for the player remote
export type FbxKey =
    | 'red' | 'green' | 'yellow' | 'blue'
    | 'power' | 'list' | 'tv' | 'swap' | 'info'
    | 'epg' | 'mail' | 'media' | 'help' | 'options'
    | 'pip' | 'rec' | 'stop' | 'play' | 'fwd' | 'bwd'
    | 'prev' | 'next' | 'up' | 'down' | 'left' | 'right'
    | 'ok' | 'back' | 'home' | 'mute' | 'prgm_inc' | 'prgm_dec'
    | 'vol_inc' | 'vol_dec'
    | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export interface PlayerStatus {
    power_state: string;
}

export interface AppConfig {
    app_id: string;
    app_name: string;
    app_version: string;
    device_name: string;
    permissions?: Record<string, boolean>;
}

export type AuthStatus = 'idle' | 'registering' | 'pending' | 'granted' | 'denied' | 'error' | 'logged_in';
