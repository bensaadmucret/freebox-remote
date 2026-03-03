import { useState, useCallback } from 'react';
import { sendKey, switchToChannel, switchToChannelAndOk } from '../freebox/api';
import { useAuth } from '../context/AuthContext';
import type { FbxKey } from '../freebox/types';
import './Remote.css';

const STREAMING_APPS = [
    { label: 'Netflix', channel: 130, icon: '🎬', color: '#e50914' },
    { label: 'Prime Video', channel: 131, icon: '📦', color: '#00a8e1' },
    { label: 'Disney+', channel: 132, icon: '✨', color: '#0f3fa8' },
    { label: 'Canal+', channel: 4, icon: '📺', color: '#000000' },
];

const QUICK_CHANNELS = [
    { label: 'TF1', number: 1 },
    { label: 'France 2', number: 2 },
    { label: 'France 3', number: 3 },
    { label: 'Canal+', number: 4 },
    { label: 'France 5', number: 5 },
    { label: 'M6', number: 6 },
    { label: 'Arte', number: 7 },
    { label: 'C8', number: 8 },
];

function useRemoteAction() {
    const [feedback, setFeedback] = useState<string | null>(null);

    const doAction = useCallback(async (fn: () => Promise<void>, label: string) => {
        setFeedback(label);
        setTimeout(() => setFeedback(null), 800);
        try {
            await fn();
        } catch {
            // silently ignore key errors to avoid spamming the console
        }
    }, []);

    return { feedback, doAction };
}

function RemoteKey({
    label,
    keyCode,
    className = '',
    icon,
    doAction,
}: {
    label: string;
    keyCode: FbxKey;
    className?: string;
    icon?: string;
    doAction: (fn: () => Promise<void>, label: string) => void;
}) {
    return (
        <button
            className={`rkey ${className}`}
            title={label}
            onClick={() => doAction(() => sendKey(keyCode), label)}
            onContextMenu={(e) => { e.preventDefault(); doAction(() => sendKey(keyCode, true), label + ' (long)'); }}
        >
            {icon || label}
        </button>
    );
}

export function Remote() {
    const { feedback, doAction } = useRemoteAction();
    const [channelInput, setChannelInput] = useState('');
    const [activeTab, setActiveTab] = useState<'remote' | 'apps' | 'channels'>('remote');
    const { wakePlayer, remoteCode } = useAuth();

    const ensureRemoteCode = useCallback(() => {
        if (!remoteCode) {
            alert('Veuillez entrer votre Code Télécommande sur l’écran de connexion.');
            return false;
        }
        return true;
    }, [remoteCode]);

    const dialChannel = (ch: number) => {
        if (!ensureRemoteCode()) return;
        doAction(() => switchToChannel(ch), `Chaîne ${ch}`);
    };

    return (
        <div className="remote-wrap">
            {/* Feedback Toast */}
            {feedback && <div className="action-toast">{feedback}</div>}

            {/* Tab bar */}
            <div className="tab-bar">
                <button className={activeTab === 'remote' ? 'tab active' : 'tab'} onClick={() => setActiveTab('remote')}>🎮 Télécommande</button>
                <button className={activeTab === 'apps' ? 'tab active' : 'tab'} onClick={() => setActiveTab('apps')}>📱 Applications</button>
                <button className={activeTab === 'channels' ? 'tab active' : 'tab'} onClick={() => setActiveTab('channels')}>📺 Chaînes</button>
            </div>

            {/* ── REMOTE TAB ── */}
            {activeTab === 'remote' && (
                <div className="remote-body">
                    {/* Top controls */}
                    <div className="top-strip">
                        <div className="power-group" style={{ display: 'flex', gap: '8px' }}>
                            <RemoteKey label="Power" keyCode="power" className="key-power" icon="⏻" doAction={doAction} />
                            <button
                                className="rkey key-wake"
                                title="Sortir de veille forcée"
                                onClick={() => doAction(wakePlayer, 'Réveil...')}
                            >
                                ⚡ Réveil
                            </button>
                        </div>
                        <RemoteKey label="Home" keyCode="home" className="key-home" icon="⌂" doAction={doAction} />
                        <RemoteKey label="Guide TV" keyCode="epg" className="key-epg" icon="📋" doAction={doAction} />
                        <RemoteKey label="Mute" keyCode="mute" className="key-mute" icon="🔇" doAction={doAction} />
                    </div>

                    {/* Color keys */}
                    <div className="color-keys">
                        <RemoteKey label="Rouge" keyCode="red" className="key-red" icon="●" doAction={doAction} />
                        <RemoteKey label="Vert" keyCode="green" className="key-green" icon="●" doAction={doAction} />
                        <RemoteKey label="Jaune" keyCode="yellow" className="key-yellow" icon="●" doAction={doAction} />
                        <RemoteKey label="Bleu" keyCode="blue" className="key-blue" icon="●" doAction={doAction} />
                    </div>

                    {/* D-Pad */}
                    <div className="dpad-section glass">
                        <div className="dpad-row">
                            <RemoteKey label="Haut" keyCode="up" className="key-nav" icon="▲" doAction={doAction} />
                        </div>
                        <div className="dpad-row">
                            <RemoteKey label="Gauche" keyCode="left" className="key-nav" icon="◀" doAction={doAction} />
                            <RemoteKey label="OK" keyCode="ok" className="key-ok" doAction={doAction} />
                            <RemoteKey label="Droite" keyCode="right" className="key-nav" icon="▶" doAction={doAction} />
                        </div>
                        <div className="dpad-row">
                            <RemoteKey label="Bas" keyCode="down" className="key-nav" icon="▼" doAction={doAction} />
                        </div>
                        <div className="dpad-row dpad-sub">
                            <RemoteKey label="Retour" keyCode="back" className="key-back" icon="↩" doAction={doAction} />
                            <RemoteKey label="Options" keyCode="options" className="key-options" icon="☰" doAction={doAction} />
                        </div>
                    </div>

                    {/* Volume + Channels */}
                    <div className="vol-ch-section">
                        <div className="vol-group glass">
                            <span className="group-label">Volume</span>
                            <RemoteKey label="Vol +" keyCode="vol_inc" className="key-vol" icon="+" doAction={doAction} />
                            <RemoteKey label="Sourdine" keyCode="mute" className="key-vol" icon="M" doAction={doAction} />
                            <RemoteKey label="Vol -" keyCode="vol_dec" className="key-vol" icon="-" doAction={doAction} />
                        </div>
                        <div className="ch-group glass">
                            <span className="group-label">Chaînes</span>
                            <RemoteKey label="Chaîne +" keyCode="prgm_inc" className="key-ch" icon="+" doAction={doAction} />
                            <RemoteKey label="Liste" keyCode="list" className="key-ch" icon="≡" doAction={doAction} />
                            <RemoteKey label="Chaîne -" keyCode="prgm_dec" className="key-ch" icon="-" doAction={doAction} />
                        </div>
                    </div>

                    {/* Playback */}
                    <div className="playback-strip glass">
                        <RemoteKey label="Préc." keyCode="prev" className="key-media" icon="⏮" doAction={doAction} />
                        <RemoteKey label="Retour arrière" keyCode="bwd" className="key-media" icon="⏪" doAction={doAction} />
                        <RemoteKey label="Play/Pause" keyCode="play" className="key-media key-play" icon="⏯" doAction={doAction} />
                        <RemoteKey label="Avance rapide" keyCode="fwd" className="key-media" icon="⏩" doAction={doAction} />
                        <RemoteKey label="Suivant" keyCode="next" className="key-media" icon="⏭" doAction={doAction} />
                        <RemoteKey label="Stop" keyCode="stop" className="key-media" icon="⏹" doAction={doAction} />
                        <RemoteKey label="Enreg." keyCode="rec" className="key-media key-rec" icon="⏺" doAction={doAction} />
                    </div>

                    {/* Numpad */}
                    <div className="numpad glass">
                        {(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as FbxKey[]).map((n) => (
                            <RemoteKey key={n} label={n} keyCode={n} className="key-num" doAction={doAction} />
                        ))}
                    </div>
                </div>
            )}

            {/* ── APPS TAB ── */}
            {activeTab === 'apps' && (
                <div className="apps-grid">
                    {STREAMING_APPS.map((app) => (
                        <button
                            key={app.label}
                            className="app-card glass"
                            style={{ '--app-color': app.color } as React.CSSProperties}
                            onClick={() => {
                                if (!ensureRemoteCode()) return;
                                doAction(() => switchToChannelAndOk(app.channel), `${app.label} (chaîne ${app.channel} + OK)`);
                            }}
                        >
                            <span className="app-icon">{app.icon}</span>
                            <span className="app-label">{app.label}</span>
                        </button>
                    ))}
                    <div style={{ gridColumn: '1 / -1', fontSize: '0.8rem', color: '#a0a0a0', textAlign: 'center', marginTop: '10px' }}>
                        YouTube et d'autres applications sans chaîne dédiée sont accessibles via le menu ⌂ de la Freebox.
                    </div>
                </div>
            )}

            {/* ── CHANNELS TAB ── */}
            {activeTab === 'channels' && (
                <div className="channels-section">
                    {/* Manual entry */}
                    <div className="channel-input-row glass">
                        <label>Saisir numéro de chaîne</label>
                        <div className="ch-input-wrap">
                            <input
                                type="number"
                                min={1}
                                max={999}
                                value={channelInput}
                                onChange={(e) => setChannelInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && channelInput) { dialChannel(parseInt(channelInput)); setChannelInput(''); } }}
                                placeholder="ex: 130 (Netflix)"
                                className="glass-input"
                            />
                            <button
                                className="go-btn"
                                onClick={() => { if (channelInput) { dialChannel(parseInt(channelInput)); setChannelInput(''); } }}
                            >
                                Go
                            </button>
                        </div>
                        <p className="ch-tip">💡 Netflix = chaîne 130, Disney+ = 135</p>
                    </div>

                    {/* Quick channel grid */}
                    <div className="quick-channels">
                        <h3>Chaînes rapides</h3>
                        <div className="ch-grid">
                            {QUICK_CHANNELS.map((ch) => (
                                <button key={ch.number} className="ch-btn glass" onClick={() => dialChannel(ch.number)}>
                                    <span className="ch-num">{ch.number}</span>
                                    <span className="ch-name">{ch.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
