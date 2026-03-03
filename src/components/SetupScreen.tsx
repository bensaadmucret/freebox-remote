import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './SetupScreen.css';

const FREEBOX_HOSTS = [
    { label: 'mafreebox.freebox.fr (par défaut)', value: 'mafreebox.freebox.fr' },
    { label: 'IP locale (192.168.0.254)', value: '192.168.0.254' },
    { label: 'IP locale (192.168.1.254)', value: '192.168.1.254' },
];

export function SetupScreen() {
    const { status, errorMsg, savedProfiles, connect, connectSaved, deleteProfile } = useAuth();
    const [customHost, setCustomHost] = useState('mafreebox.freebox.fr');
    const [remoteCode, setRemoteCode] = useState('');
    const [useCustom, setUseCustom] = useState(false);

    const handleConnect = () => {
        if (!remoteCode) {
            alert('Veuillez entrer le Code Télécommande de votre Freebox.');
            return;
        }
        connect(customHost.trim() || 'mafreebox.freebox.fr', remoteCode.trim());
    };

    return (
        <div className="setup-screen">
            <div className="setup-card glass">
                {/* Logo / Hero */}
                <div className="setup-hero">
                    <div className="fbx-logo">
                        <span className="logo-f">F</span>
                        <span className="logo-text">reebox</span>
                        <span className="logo-badge">Remote</span>
                    </div>
                    <p className="setup-subtitle">Application de télécommande pour votre Freebox</p>
                </div>

                {/* Saved Profiles */}
                {savedProfiles.length > 0 && (
                    <div className="saved-profiles-section">
                        <label className="form-label">Connexions sauvegardées</label>
                        <div className="profiles-grid">
                            {savedProfiles.map(p => (
                                <div key={p.id} className="profile-card glass">
                                    <button
                                        className="profile-connect-btn"
                                        onClick={() => connectSaved(p)}
                                        disabled={status === 'registering' || status === 'pending'}
                                    >
                                        <span className="profile-host">{p.host}</span>
                                        <span className="profile-code">Code: {p.remoteCode}</span>
                                    </button>
                                    <button
                                        className="profile-delete-btn"
                                        onClick={() => deleteProfile(p.id)}
                                        title="Supprimer la connexion"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="divider"><span>Nouvelle connexion</span></div>
                    </div>
                )}

                {/* Connection Form */}
                <div className="setup-form">
                    <label className="form-label">Adresse de la Freebox</label>
                    <div className="host-selector">
                        {FREEBOX_HOSTS.map((h) => (
                            <button
                                key={h.value}
                                className={`host-chip ${!useCustom && customHost === h.value ? 'active' : ''}`}
                                onClick={() => { setCustomHost(h.value); setUseCustom(false); }}
                            >
                                {h.label}
                            </button>
                        ))}
                        <button
                            className={`host-chip ${useCustom ? 'active' : ''}`}
                            onClick={() => setUseCustom(true)}
                        >
                            Autre adresse…
                        </button>
                    </div>

                    {useCustom && (
                        <input
                            className="host-input glass-input"
                            type="text"
                            placeholder="ex: 192.168.1.1"
                            value={customHost}
                            onChange={(e) => setCustomHost(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                        />
                    )}

                    <div style={{ marginTop: '20px' }}>
                        <label className="form-label">Code Télécommande (8 chiffres)</label>
                        <input
                            className="host-input glass-input"
                            type="text"
                            placeholder="ex: 12345678"
                            value={remoteCode}
                            onChange={(e) => setRemoteCode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                            style={{ letterSpacing: '2px', fontFamily: 'monospace' }}
                            autoFocus
                        />
                        <p style={{ fontSize: '0.8rem', color: '#a0a0a0', marginTop: '8px' }}>
                            Trouvable sur la TV : Réglages {'>'} Système {'>'} Informations Freebox ou Code télécommande
                        </p>
                    </div>
                </div>

                {/* Status feedback */}
                {status === 'pending' && (
                    <div className="status-box status-pending">
                        <div className="pulse-ring" />
                        <div>
                            <strong>En attente d'autorisation</strong>
                            <p>Appuyez sur la flèche droite ▶️ de votre Freebox pour autoriser l'application.</p>
                        </div>
                    </div>
                )}

                {(status === 'error' || status === 'denied') && (
                    <div className="status-box status-error">
                        <span className="status-icon">⚠️</span>
                        <p>{errorMsg || 'Une erreur est survenue. Veuillez réessayer.'}</p>
                    </div>
                )}

                {status === 'registering' && (
                    <div className="status-box status-info">
                        <div className="spinner" />
                        <span>Connexion en cours…</span>
                    </div>
                )}

                <button
                    className={`connect-btn ${status === 'registering' || status === 'pending' ? 'loading' : ''}`}
                    onClick={handleConnect}
                    disabled={status === 'registering' || status === 'pending'}
                >
                    {status === 'pending' ? 'En attente…' : status === 'registering' ? 'Connexion…' : 'Se connecter'}
                </button>

                <p className="setup-note">
                    La première connexion affichera un message sur votre Freebox Delta/Pop/Révolution.
                </p>
            </div>
        </div>
    );
}
