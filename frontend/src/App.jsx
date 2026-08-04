import { useState } from 'react';
import axios from 'axios';
import { API_BASE } from './config';
import { useAuth } from './context/useAuth';
import { saveTeam as saveTeamRequest } from './api/authApi';
import Nav        from './components/Nav';
import Ticker     from './components/Ticker';
import TeamIdForm from './components/TeamIdForm';
import Squad      from './components/Squad';
import AIAdvice   from './components/AIAdvice';
import Chat       from './components/Chat';
import AuthModal  from './components/AuthModal';

function App() {
  const [managerData, setManagerData] = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [teamSaved, setTeamSaved] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const { token, isAuthed } = useAuth();

  async function handleTeamSubmit(teamId) {
    setLoading(true);
    setError(null);
    setTeamSaved(false);
    try {
      const { data } = await axios.get(`${API_BASE}/fpl/manager/${teamId}`);
      setManagerData({ ...data, teamId });
    } catch (err) {
      const message = err.response?.data?.error
        ?? 'Could not find that team ID. Please check and try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTeam() {
    if (!isAuthed || !managerData?.teamId) return;
    setSavingTeam(true);
    try {
      await saveTeamRequest(token, managerData.teamId, managerData.manager?.teamName);
      setTeamSaved(true);
    } catch {
      // Non-critical action — the "Save team" button just stays enabled to retry.
    } finally {
      setSavingTeam(false);
    }
  }

  const loaded = managerData && managerData.squad;

  return (
    <>
      <Nav
        teamId={managerData?.teamId ?? null}
        managerData={managerData?.manager ?? null}
        onLoginClick={() => setShowAuthModal(true)}
        onSaveTeam={handleSaveTeam}
        saved={teamSaved}
        saving={savingTeam}
      />
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      <Ticker
        squad={managerData?.squad ?? []}
        managerData={managerData?.manager ?? null}
      />

      {!loaded ? (
        <TeamIdForm
          onSubmit={handleTeamSubmit}
          loading={loading}
          error={error}
        />
      ) : (
        <main style={{ paddingTop: 'var(--top-offset)' }}>
          {/* Squad */}
          <section id="squad" className="fpl-section">
            <div className="fpl-section-header">
              <h2 className="fpl-section-title">
                {managerData.manager.teamName
                  ? <em>{managerData.manager.teamName}</em>
                  : <>Current <em>squad</em></>}
              </h2>
              <div className="fpl-section-meta">
                {managerData.squad.length} Players<br />
                GW{managerData.manager.gameweek || '—'}
              </div>
            </div>
            <Squad
              squad={managerData.squad}
              manager={managerData.manager}
              transfers={managerData.transfers}
            />
          </section>

          {/* AI Advice */}
          <section id="advice" className="fpl-section">
            <div className="fpl-section-header">
              <h2 className="fpl-section-title">AI <em>analysis</em></h2>
              <div className="fpl-section-meta">
                Context-aware<br />Squad + fixture data
              </div>
            </div>
            <AIAdvice teamId={managerData.teamId} onLoginClick={() => setShowAuthModal(true)} />
          </section>

          {/* Chat */}
          <section id="chat" className="fpl-section">
            <div className="fpl-section-header">
              <h2 className="fpl-section-title">Ask the <em>AI</em></h2>
              <div className="fpl-section-meta">
                Full squad context<br />Live fixture data
              </div>
            </div>
            <Chat teamId={managerData.teamId} onLoginClick={() => setShowAuthModal(true)} />
          </section>
        </main>
      )}
    </>
  );
}

export default App;