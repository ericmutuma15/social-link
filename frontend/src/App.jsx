import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { BookmarkProvider } from "./context/BookmarkContext";
import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout";
import LoadingScreen from "./components/LoadingScreen";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

const FeedPage = lazy(() => import("./pages/home/FeedsPage"));
const ProfilePage = lazy(() => import("./pages/home/Profile"));
const CreatePostPage = lazy(() => import("./pages/home/CreatePost"));
const PeoplePage = lazy(() => import("./pages/home/card"));
const EditProfilePage = lazy(() => import("./pages/home/EditProfile"));
const NotificationsPage = lazy(() => import("./pages/home/notify"));
const FriendsPage = lazy(() => import("./pages/home/FriendsList"));
const ChatPage = lazy(() => import("./pages/home/Chat"));
const MessagesPage = lazy(() => import("./pages/home/Messages"));
const LoginPrompt = lazy(() => import("./pages/home/LoginPrompt"));
const SubscriptionPage = lazy(() => import("./pages/home/Subscription"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const BookmarksPage = lazy(() => import("./pages/BookmarksPage"));

const PlaceholderPage = ({ title, description }) => (
  <section className="surface-card page-intro">
    <p className="eyebrow">DESIRE LINK</p><h1>{title}</h1><p>{description}</p>
  </section>
);

const ProtectedLayout = () => <ProtectedRoute><AppLayout /></ProtectedRoute>;
const Lazy = ({ children }) => <Suspense fallback={<LoadingScreen compact />}>{children}</Suspense>;

export default function App() {
  return <BrowserRouter><ThemeProvider><AuthProvider><BookmarkProvider><Toaster position="top-right" toastOptions={{ duration: 3500 }} />
    <Suspense fallback={<LoadingScreen />}><Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<AuthLayout />}><Route path="/login" element={<LoginPage />} /><Route path="/signup" element={<RegisterPage />} /></Route>
      <Route element={<ProtectedLayout />}>
        <Route path="/home" element={<Lazy><FeedPage /></Lazy>} />
        <Route path="/profile" element={<Lazy><ProfilePage /></Lazy>} /><Route path="/profile/:userId" element={<Lazy><ProfilePage /></Lazy>} />
        <Route path="/create-post" element={<Lazy><CreatePostPage /></Lazy>} /><Route path="/add-users" element={<Lazy><PeoplePage /></Lazy>} />
        <Route path="/edit-profile" element={<Lazy><EditProfilePage /></Lazy>} /><Route path="/notifications" element={<Lazy><NotificationsPage /></Lazy>} />
        <Route path="/friends" element={<Lazy><FriendsPage /></Lazy>} /><Route path="/messages" element={<Lazy><MessagesPage /></Lazy>} />
        <Route path="/chat/:userId" element={<Lazy><ChatPage /></Lazy>} /><Route path="/subscriptions" element={<Lazy><SubscriptionPage /></Lazy>} />
        <Route path="/explore" element={<Lazy><ExplorePage /></Lazy>} />
        <Route path="/communities" element={<PlaceholderPage title="Communities" description="Find your next favourite corner of Desire Link." />} />
        <Route path="/bookmarks" element={<Lazy><BookmarksPage /></Lazy>} />
        <Route path="/loginprompt" element={<Lazy><LoginPrompt /></Lazy>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></Suspense>
  </BookmarkProvider></AuthProvider></ThemeProvider></BrowserRouter>;
}
