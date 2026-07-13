import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import LandingPage from "./pages/home/LoadingPage.jsx"; // Import the LandingPage component

const Main = () => {
  const [loading, setLoading] = useState(true);

  // useEffect hook to simulate app loading
  useEffect(() => {
    // Simulate a delay for loading screen, this can be removed when the app is fully ready
    const timer = setTimeout(() => {
      setLoading(false); // Set loading to false when the app is ready
    }, 2000); // Simulate loading for 2 seconds

    // Cleanup the timeout if the component is unmounted
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {loading ? (
        <LandingPage /> // Display the landing page while loading
      ) : (
        <App /> // Render the app after loading is complete
      )}
    </>
  );
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Main />
  </StrictMode>
);
