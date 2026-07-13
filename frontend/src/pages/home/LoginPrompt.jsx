import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const LoginPrompt = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { message } = location.state || { message: "You must be logged in to access this section." };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold text-white mb-4 text-center">Access Required</h2>
        <p className="text-gray-300 mb-8 text-center">{message}</p>
        <div className="flex flex-col space-y-4">
          <button 
            onClick={() => navigate("/login")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition duration-300"
          >
            Login
          </button>
          <button 
            onClick={() => navigate("/home")}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 rounded-lg transition duration-300"
          >
            Continue Browsing Anonymously
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPrompt;
