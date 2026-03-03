import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
    FbxApiResponse,
    AppTokenResult,
    AuthorizeStatus,
    SessionResult,
    AppConfig,
    FbxKey,
} from './types';

let _http: AxiosInstance | null = null;
let _apiVersion = 'v8';

export function setFreebox(host: string) {
    let baseURL = `http://${host}/api/${_apiVersion}`;

    // Cross-Origin (CORS) workaround for Vite local development
    if (import.meta.env?.DEV) {
        if (host === 'mafreebox.freebox.fr' || host.startsWith('192.168.')) {
            baseURL = `/fbx-proxy/api/${_apiVersion}`;
        }
    }

    _http = axios.create({
        baseURL,
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
    });
}

function http(): AxiosInstance {
    if (!_http) throw new Error('Freebox not configured. Call setFreebox() first.');
    return _http;
}

function setSessionToken(token: string) {
    http().defaults.headers.common['X-Fbx-App-Auth'] = token;
}

// ─── Registration ───────────────────────────────────────────────────────────

// Call to freebox directly to check if it's reachable and get the actual API version
export async function discoverFreebox(host: string): Promise<boolean> {
    try {
        let url = `http://${host}/api_version`;
        if (import.meta.env?.DEV) url = `/fbx-proxy/api_version`;

        const res = await axios.get(url, { timeout: 3000 });
        if (res.data && res.data.api_version) {
            // The FBX returns something like "8.0" or "10.2", we need "v8" or "v10"
            const major = Math.floor(parseFloat(res.data.api_version));
            _apiVersion = `v${major}`;
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

export async function registerApp(config: AppConfig): Promise<AppTokenResult> {
    const res = await http().post<FbxApiResponse<AppTokenResult>>('/login/authorize/', config);
    if (!res.data.success || !res.data.result) {
        throw new Error(res.data.msg || 'Registration failed');
    }
    return res.data.result;
}

export async function getTrackStatus(trackId: number): Promise<AuthorizeStatus> {
    const res = await http().get<FbxApiResponse<AuthorizeStatus>>(`/login/authorize/${trackId}`);
    if (!res.data.success || !res.data.result) {
        throw new Error(res.data.msg || 'Track status failed');
    }
    return res.data.result;
}

// ─── Session / Login ────────────────────────────────────────────────────────

export async function getChallenge(): Promise<{ challenge: string; logged_in: boolean }> {
    const res = await http().get<FbxApiResponse<{ challenge: string; logged_in: boolean }>>('/login/');
    if (!res.data.success || !res.data.result) throw new Error('Cannot get challenge');
    return res.data.result;
}

export async function computePassword(appToken: string, challenge: string): Promise<string> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(appToken),
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(challenge));
    return Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

export async function openSession(appId: string, password: string): Promise<SessionResult> {
    const res = await http().post<FbxApiResponse<SessionResult>>('/login/session/', {
        app_id: appId,
        password,
    });
    if (!res.data.success || !res.data.result) {
        throw new Error(res.data.msg || 'Session open failed');
    }
    setSessionToken(res.data.result.session_token);
    return res.data.result;
}

export async function closeSession(): Promise<void> {
    try {
        await http().post('/login/logout/');
    } catch {
        // best effort
    }
    delete http().defaults.headers.common['X-Fbx-App-Auth'];
}

// ─── Player Remote ──────────────────────────────────────────────────────────

// Retrieve the remote code from localStorage
function getRemoteCode(): string {
    return localStorage.getItem('fbx_remote_code') || '';
}

// Function to send a command via the classic hd1 API
async function sendHd1Command(key: string, longPress = false) {
    const code = getRemoteCode();
    if (!code) throw new Error('Code Télécommande manquant');

    // We use the Vite proxy /hd1-proxy mapped to http://hd1.freebox.fr
    const baseUrl = import.meta.env?.DEV ? '/hd1-proxy' : 'http://hd1.freebox.fr';
    const url = `${baseUrl}/pub/remote_control?code=${code}&key=${key}${longPress ? '&long=true' : ''}`;

    await axios.get(url, { timeout: 3000 });
}

export async function sendKey(key: FbxKey, longPress = false): Promise<void> {
    // We try the modern API first as it's more robust (works even if player server is slow)
    // But we fall back to hd1 which is usually more reliable on Revolution/Delta.
    try {
        const res = await http().post<FbxApiResponse<unknown>>(`/player/1/api/v6/control/key/`, { key, long: longPress });
        if (!res.data?.success) {
            throw new Error(res.data?.msg || 'Freebox OS keypress rejected');
        }
    } catch {
        // Fallback to classic API
        await sendHd1Command(key, longPress);
    }
}

export async function wakePlayer(): Promise<void> {
    // 1. Try to send the Power key via hd1
    try {
        await sendHd1Command('power');
    } catch {
        /* ignore */
    }

    // 2. Try the "Home" key via Freebox OS API (often wakes the box better)
    try {
        await http().post(`/player/1/api/v6/control/key/`, { key: 'home' });
    } catch {
        // ignore
    }

    // 3. One more "Home" to be sure it's on the main screen
    await new Promise(r => setTimeout(r, 1000));
    try {
        await sendHd1Command('home');
    } catch {
        // ignore
    }
}

export async function changeChannel(channel: number): Promise<void> {
    const digits = String(channel).split('');
    for (const d of digits) {
        await sendHd1Command(d);
        await new Promise((r) => setTimeout(r, 300));
    }
}

export async function launchPlayerApp(pkg: string): Promise<void> {
    // App launching by package is NOT supported on the classic hd1 API.
    // As a fallback, try the Freebox OS API anyway, ignoring the 403 error.
    try {
        await http().post(`/player/1/api/v6/control/open/`, { url: `app:?package=${pkg}` });
    } catch {
        /* ignore unsupported app launch */
    }
}

export async function switchToChannel(channel: number): Promise<void> {
    await changeChannel(channel);
}

export async function switchToChannelAndOk(channel: number, delayMs = 500): Promise<void> {
    await changeChannel(channel);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await sendKey('ok');
}

export async function getPlayerStatus(): Promise<unknown> {
    // Status check is not reliably available on hd1 without polling the OS API
    try {
        const res = await http().get('/player/');
        return res.data;
    } catch {
        return null;
    }
}
