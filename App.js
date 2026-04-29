import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Discover from "./pages/Discover";
import Home from "./pages/Home";
import ChatList from "./pages/ChatList";
import CharacterForm from "./pages/CharacterForm";
import CharacterProfile from "./pages/CharacterProfile";
import Chat from "./pages/Chat";
import Memories from "./pages/Memories";
import Personas from "./pages/Personas";
import PersonaForm from "./pages/PersonaForm";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import VoiceLibrary from "./pages/VoiceLibrary";
import CreateVoice from "./pages/CreateVoice";
import World from "./pages/World";
import Legal from "./pages/Legal";
import Paywall from "./pages/Paywall";
import LoadingScreen from "./components/LoadingScreen";
import { FEATURES } from "./lib/features";
import "./App.css";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen/>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen/>;
  return <Navigate to={user ? "/home" : "/welcome"} replace />;
}

function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/welcome" element={<Landing />} />
              <Route path="/login" element={<Auth mode="login" />} />
              <Route path="/signup" element={<Auth mode="signup" />} />

              {/* Phase 1 primary nav */}
              <Route path="/home" element={<Protected><Home /></Protected>} />
              <Route path="/chats" element={<Protected><ChatList /></Protected>} />
              <Route path="/personas" element={<Protected><Personas /></Protected>} />
              <Route path="/social" element={<Protected><ChatList /></Protected>} />
              <Route path="/life" element={<Protected><ChatList /></Protected>} />

              {/* Discovery / characters */}
              <Route path="/discover" element={<Protected><Discover /></Protected>} />
              <Route path="/characters" element={<Protected><Discover /></Protected>} />
              <Route path="/characters/new" element={<Protected><CharacterForm /></Protected>} />
              <Route path="/characters/:id" element={<Protected><CharacterProfile /></Protected>} />
              <Route path="/characters/:id/edit" element={<Protected><CharacterForm /></Protected>} />
              <Route path="/characters/:id/memories" element={<Protected><Memories /></Protected>} />

              {/* Personas */}
              <Route path="/personas/new" element={<Protected><PersonaForm /></Protected>} />
              <Route path="/personas/:id/edit" element={<Protected><PersonaForm /></Protected>} />

              {/* Chat */}
              <Route path="/chat/:id" element={<Protected><Chat /></Protected>} />

              {/* Settings & user */}
              <Route path="/settings" element={<Protected><Settings /></Protected>} />
              <Route path="/profile" element={<Protected><Profile /></Protected>} />
              <Route path="/u/:username" element={<Protected><Profile /></Protected>} />
              <Route path="/paywall" element={<Protected><Paywall /></Protected>} />
              <Route path="/create-voice" element={<Protected><CreateVoice /></Protected>} />

              {/* Legal */}
              <Route path="/legal/:doc" element={<Legal />} />

              {/* Phase-2-only (kept routable for direct URL but hidden from nav) */}
              {FEATURES.voiceLibraryPage && <Route path="/voices" element={<Protected><VoiceLibrary /></Protected>} />}
              {FEATURES.worldPage && <Route path="/world" element={<Protected><World /></Protected>} />}

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "#171414",
                border: "1px solid rgba(214,185,140,0.18)",
                color: "#F7F1E8",
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
