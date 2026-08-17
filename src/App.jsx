import { useEffect, useState } from "react";
import "./styles/globals.css";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Chat from "./components/Chat";
import TV from "./components/TV";
import Auth from "./components/Auth";
import Credits from "./components/Credits";
import Stats from "./components/Stats";
import AdminKeys from "./components/AdminKeys";
import { clearSession, getStoredSession, signOut as signOutRequest } from "./services/api";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [page, setPage] = useState("chat");
  const [session, setSession] = useState(getStoredSession);

  function handleAuth(nextSession) {
    setSession(nextSession);
  }

  useEffect(() => {
    function expireSession() {
      setSession(null);
      setSidebarOpen(false);
      setPage("chat");
    }

    window.addEventListener("threesixtybets:session-expired", expireSession);

    return () => {
      window.removeEventListener("threesixtybets:session-expired", expireSession);
    };
  }, []);

  async function signOut() {
    await signOutRequest(session);
    clearSession();
    setSession(null);
    setSidebarOpen(false);
    setPage("chat");
  }

  if (!session) {
    return <Auth onAuth={handleAuth} />;
  }

  return (
    <div className="app">
      <Sidebar
        open={sidebarOpen}
        close={() => setSidebarOpen(false)}
        page={page}
        setPage={setPage}
        user={session.user}
      />

      {sidebarOpen && (
        <div className="overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="main">
        <Header
          openSidebar={() => setSidebarOpen(true)}
          user={session.user}
          onSignOut={signOut}
        />

        {page === "chat" && <Chat session={session} />}
        {page === "tv" && <TV />}
        {page === "credits" && <Credits session={session} />}
        {page === "stats" && <Stats />}
        {page === "admin" && session.user.role === "admin" && (
          <AdminKeys session={session} />
        )}
      </main>
    </div>
  );
}

export default App;
