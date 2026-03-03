import { useAuth } from '../context/AuthContext';
import './Header.css';

export function Header() {
    const { host, status, logout } = useAuth();

    return (
        <header className="app-header glass">
            <div className="header-brand">
                <span className="brand-f">F</span>
                <span className="brand-text">reebox Remote</span>
            </div>
            {status === 'logged_in' && (
                <div className="header-status">
                    <span className="status-dot online" />
                    <span className="status-label">{host}</span>
                    <button className="logout-btn" onClick={logout} title="Se déconnecter">⏏</button>
                </div>
            )}
        </header>
    );
}
