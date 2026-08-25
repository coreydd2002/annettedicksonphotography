import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import Home from "./pages/Home/Home";
import Galleries from "./pages/Galleries/Galleries";
import AlbumDetail from "./pages/AlbumDetail/AlbumDetail";
import BookNow from "./pages/BookNow/BookNow";
import Admin from "./pages/Admin/Admin";
import { REDEPLOY_REDIRECT_KEY } from "./pages/Admin/utils";
import NotFound from "./pages/NotFound/NotFound";
import "./App.css";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// A hard refresh remounts the whole app fresh, so if the admin just
// published and reloaded the page (as instructed), send them to Home
// instead of wherever they happened to be (usually back to /admin).
function RedirectAfterRedeploy() {
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem(REDEPLOY_REDIRECT_KEY)) {
      sessionStorage.removeItem(REDEPLOY_REDIRECT_KEY);
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <RedirectAfterRedeploy />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/galleries" element={<Galleries />} />
          <Route path="/albums/:slug" element={<AlbumDetail />} />
          <Route path="/book-now" element={<BookNow />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
