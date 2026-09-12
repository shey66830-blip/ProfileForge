import React, { useEffect, useState, Suspense, lazy, createContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from "react-router-dom";

import ParticleCanvas from "./components/ParticleCanvas.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import Navbar from "./components/Navbar.jsx";

// Route-level lazy loading — each page is a separate chunk
const Home = lazy(() => import("./pages/home.jsx"));
const Dashboard = lazy(() => import("./pages/dashboard.jsx"));
const Builder = lazy(() => import("./pages/builder.jsx"));
const Output = lazy(() => import("./pages/output.jsx"));
const JobSearch = lazy(() => import("./pages/jobSearch.jsx"));
const Matchmaking = lazy(() => import("./pages/matchmaking.jsx"));
const AiEditor = lazy(() => import("./pages/aiEditor.jsx"));
const Auth = lazy(() => import("./pages/auth.jsx"));
const Premium = lazy(() => import("./pages/premium.jsx"));
const Profile = lazy(() => import("./pages/profile.jsx"));
const SavedJobs = lazy(() => import("./pages/savedJobs.jsx"));
const Applications = lazy(() => import("./pages/applications.jsx"));
const Subscription = lazy(() => import("./pages/subscription.jsx"));
const Courses = lazy(() => import("./pages/courses.jsx"));
const ResumeJobAnalysis = lazy(() => import("./pages/resumeJobAnalysis.jsx"));
const ProfileBuilder = lazy(() => import("./pages/profileBuilder.jsx"));
const Tailoring = lazy(() => import("./pages/tailoring.jsx"));
const ExportATS = lazy(() => import("./pages/exportATS.jsx"));
const ReverseBoard = lazy(() => import("./pages/reverseBoard.jsx"));

import { getCurrentUser, logoutUser } from "./services/authService.js";
import { fetchDocuments } from "./services/documentService.js";
import { checkPremiumStatus } from "./services/paymentService.js";

export const AppContext = createContext(null);

function LoadingPlaceholder() {
  return (
    <main className="container" style={{ minHeight: "50vh", display: "grid", placeItems: "center" }} role="status" aria-label="Loading">
      <div className="loading-spinner">
        <div className="spinner" aria-hidden="true" />
        <p>Loading…</p>
      </div>
    </main>
  );
}

function ProtectedRoute({ user, authLoading, children }) {
  // While the initial /api/auth/me check is in flight, do not redirect —
  // a hard reload would otherwise bounce to /auth before the session resolves.
  if (authLoading) return <LoadingPlaceholder />;
  if (!user) return <RedirectToAuth />;
  return children;
}

function GuestRoute({ user, authLoading, children }) {
  const location = useLocation();
  // Same gate: wait for the auth check to settle before deciding.
  if (authLoading) return <LoadingPlaceholder />;
  if (user) {
    // If the user was bounced here from a protected route, send them back
    // to the page they originally requested instead of always home.
    const from = location.state?.from;
    return <Navigate to={from || "/"} replace />;
  }
  return children;
}

// The builder type comes from the route itself (/builder/resume, /builder/cv),
// not from context state — otherwise the CV nav, home cards, and direct URLs
// would all render the resume builder.
function BuilderRoute(props) {
  const { type } = useParams();
  return <Builder type={type} {...props} />;
}

// Remembers the route the user tried to reach so the auth page can send
// them back after login/signup instead of always landing on home.
function RedirectToAuth() {
  const location = useLocation();
  return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />;
}

function AppRoutes() {
  const navigate = useNavigate();
  const ctx = React.useContext(AppContext);
  const authLoading = ctx.authLoading;

  const setPage = (page) => navigate(`/${page}`);

  const openBuilder = (type) => {
    if (!ctx.user) return navigate("/auth");
    if (type === "biodata") return navigate("/premium");
    navigate(`/builder/${type}`);
  };

  const openDocument = (doc) => {
    if (!ctx.user) return navigate("/auth");
    ctx.setActiveDocument(doc);
    navigate("/output");
  };

  const editDocument = (doc) => {
    if (!ctx.user) return navigate("/auth");
    ctx.setActiveDocument(doc);
    ctx.setBuilderType(doc.type);
    navigate(`/builder/${doc.type}`);
  };

  const handleLogout = async () => {
    await logoutUser();
    ctx.setUser(null);
    ctx.setDocuments([]);
    ctx.setActiveDocument(null);
    navigate("/");
  };

  return (
    <>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <div className="aria-live-region" aria-live="polite" aria-atomic="true" id="aria-live" />
        <ParticleCanvas />
        <div className="app-shell">
      <Navbar setPage={setPage} openBuilder={openBuilder} user={ctx.user} logout={handleLogout} />

      <main id="main-content" tabIndex="-1">
      <Suspense fallback={<LoadingPlaceholder />}>
      <Routes>
        <Route path="/" element={<Home user={ctx.user} openBuilder={openBuilder} setPage={setPage} />} />
        <Route path="/auth" element={<GuestRoute user={ctx.user} authLoading={authLoading}><Auth setUser={ctx.setUser} /></GuestRoute>} />

        <Route path="/profile" element={
          <ProtectedRoute user={ctx.user} authLoading={authLoading}>
            <Profile user={ctx.user} setUser={ctx.setUser} setPage={setPage} />
          </ProtectedRoute>
        } />

        <Route path="/premium" element={
          <ProtectedRoute user={ctx.user} authLoading={authLoading}>
            <Premium user={ctx.user} setUser={ctx.setUser} setPage={setPage} />
          </ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute user={ctx.user} authLoading={authLoading}>
            <Dashboard
              documents={ctx.documents}
              openBuilder={openBuilder}
              openDocument={openDocument}
              editDocument={editDocument}
              setPage={setPage}
              onDeleteDocument={(id) => ctx.setDocuments((prev) => prev.filter((d) => d._id !== id))}
            />
          </ProtectedRoute>
        } />

        <Route path="/builder/:type" element={
          <ProtectedRoute user={ctx.user} authLoading={authLoading}>
            <BuilderRoute
              existingDocument={ctx.activeDocument}
              refreshDocuments={ctx.refreshDocuments}
              setActiveDocument={ctx.setActiveDocument}
              setPage={setPage}
            />
          </ProtectedRoute>
        } />

        <Route path="/output" element={
          <ProtectedRoute user={ctx.user} authLoading={authLoading}>
            {ctx.activeDocument ? (
              <Output document={ctx.activeDocument} editDocument={editDocument} setPage={setPage} />
            ) : (
              <Navigate to="/dashboard" replace />
            )}
          </ProtectedRoute>
        } />

        <Route path="/subscription" element={<ProtectedRoute user={ctx.user} authLoading={authLoading}><Subscription /></ProtectedRoute>} />
        <Route path="/courses" element={<ProtectedRoute user={ctx.user} authLoading={authLoading}><Courses /></ProtectedRoute>} />
        <Route path="/applications" element={
          <ProtectedRoute user={ctx.user} authLoading={authLoading}>
            <Applications setPage={setPage} />
          </ProtectedRoute>
        } />

        <Route path="/resume-job-analysis" element={
          <ProtectedRoute user={ctx.user} authLoading={authLoading}>
            <ResumeJobAnalysis
              documents={ctx.documents}
              onDocumentsChange={ctx.refreshDocuments}
            />
          </ProtectedRoute>
        } />

        <Route path="/profile-builder" element={
          <ProtectedRoute user={ctx.user} authLoading={authLoading}>
            <ProfileBuilder />
          </ProtectedRoute>
        } />

        <Route path="/tailoring" element={
          <ProtectedRoute user={ctx.user} authLoading={authLoading}>
            <Tailoring />
          </ProtectedRoute>
        } />

        <Route path="/export-ats" element={
          <ProtectedRoute user={ctx.user} authLoading={authLoading}>
            <ExportATS />
          </ProtectedRoute>
        } />

        <Route path="/reverse-board" element={
          <ProtectedRoute user={ctx.user} authLoading={authLoading}>
            <ReverseBoard />
          </ProtectedRoute>
        } />

        <Route path="/saved-jobs" element={
          <ProtectedRoute user={ctx.user} authLoading={authLoading}>
            <SavedJobs setPage={setPage} />
          </ProtectedRoute>
        } />

        <Route path="/jobs" element={
          <ProtectedRoute user={ctx.user} authLoading={authLoading}>
            <JobSearch documents={ctx.documents} />
          </ProtectedRoute>
        } />

        <Route path="/matchmaking" element={
          <ProtectedRoute user={ctx.user} authLoading={authLoading}>
            <Matchmaking documents={ctx.documents} setPage={setPage} />
          </ProtectedRoute>
        } />

        <Route path="/ai-editor" element={
          <ProtectedRoute user={ctx.user} authLoading={authLoading}>
            <AiEditor
              documents={ctx.documents}
              refreshDocuments={ctx.refreshDocuments}
              setActiveDocument={ctx.setActiveDocument}
              setPage={setPage}
            />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      </main>
    </div>
      </>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  // True until the initial /api/auth/me check settles (success, 401, or error).
  // Route guards must not redirect while this is true — otherwise a hard reload
  // bounces a valid session to /auth, and a 429 on /me reads as logged-out.
  const [authLoading, setAuthLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [builderType, setBuilderType] = useState("resume");
  const [plan, setPlan] = useState("free");
  const [premiumExpiry, setPremiumExpiry] = useState(null);

  async function refreshDocuments() {
    if (!user) {
      setDocuments([]);
      return;
    }
    const docs = await fetchDocuments();
    setDocuments(docs);
  }

  useEffect(() => {
    async function loadUser() {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setAuthLoading(false);
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      refreshDocuments();
    } else {
      setDocuments([]);
    }
  }, [user]);

  // Single source of truth for plan status: backend is the authority.
  // Fetch once on mount/login; consumers call refreshPlan() after payment/cancel.
  useEffect(() => {
    if (!user) {
      setPlan("free");
      setPremiumExpiry(null);
      return;
    }
    let cancelled = false;
    checkPremiumStatus().then(r => {
      if (cancelled || !r.ok) return;
      setPlan(r.plan || "free");
      setPremiumExpiry(r.expiry || null);
    });
    return () => { cancelled = true; };
  }, [user]);

  async function refreshPlan() {
    if (!user) {
      setPlan("free");
      setPremiumExpiry(null);
      return { ok: true, plan: "free" };
    }
    const r = await checkPremiumStatus();
    if (r.ok) {
      setPlan(r.plan || "free");
      setPremiumExpiry(r.expiry || null);
        setUser(prev => prev
        ? { ...prev, plan: r.plan || "free", premium: !!r.premium, premiumExpiry: r.expiry || null }
        : prev);
    }
    return r;
  }

  return (
    <ToastProvider>
      <AppContext.Provider
      value={{
        user, setUser,
        authLoading,
        documents, setDocuments,
        activeDocument, setActiveDocument,
        builderType, setBuilderType,
        refreshDocuments,
        plan, premiumExpiry,
        isPremium: plan === "premium" || plan === "pro",
        isPro: plan === "pro",
        refreshPlan,
      }}
    >
      <BrowserRouter>
        <ErrorBoundary><AppRoutes /></ErrorBoundary>
      </BrowserRouter>
    </AppContext.Provider>
      </ToastProvider>
  );
}
