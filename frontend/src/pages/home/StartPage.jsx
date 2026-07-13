import React from 'react';
import { useNavigate } from 'react-router-dom';
import BG from './../../assets/Olivia1.gif';

const StartPage = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Centered Background Image */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src={BG}
          alt="Background"
          className="max-w-full max-h-full opacity-20 object-contain"
        />
      </div>

      {/* Top Right Buttons */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-4">
        <button
          onClick={() => navigate('/signup')}
          className="px-8 py-3 text-white border-0 outline-none transition duration-300 transform hover:scale-150 hover:text-blue-600 hover:bg-transparent"
        >
          Sign Up
        </button>
        <button
          onClick={() => navigate('/login')}
          className="px-8 py-3 text-white border-0 outline-none transition duration-300 transform hover:scale-150 hover:text-blue-600 hover:bg-transparent"
        >
          Sign In
        </button>
        <button
          onClick={() => navigate('/home')}
          className="px-8 py-3 text-white border-0 outline-none transition duration-300 transform hover:scale-150 hover:text-blue-600 hover:bg-transparent"
        >
          Home
        </button>
      </div>

      {/* Footer */}
      <footer className="z-10 text-center p-4 absolute bottom-0 w-full">
        <p>© {currentYear} Desire Link. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default StartPage;
