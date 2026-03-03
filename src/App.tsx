import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { SetupScreen } from './components/SetupScreen';
import { Remote } from './components/Remote';
import './index.css';

function AppContent() {
  const { status } = useAuth();

  return (
    <div className="app-root">
      <Header />
      <main className="app-main">
        {status === 'logged_in' ? <Remote /> : <SetupScreen />}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
