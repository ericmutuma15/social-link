import React from "react";
import BG from './../../assets/Olivia1.gif'; // Import the background image

const LoadingPage = () => {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white">
      {/* Background Image */}
      <img 
        src={BG} 
        alt="Loading Background" 
        className="mb-4" 
        style={{ width: 'auto', height: 'auto', maxWidth: '500px', maxHeight: '500px' }} 
      />
      
      {/* Spinning Circle */}
      <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mb-4"></div>
      
      {/* Loading Text */}
      <h1 className="text-3xl font-bold">Loading...</h1>
    </div>
  );
};

export default LoadingPage;
