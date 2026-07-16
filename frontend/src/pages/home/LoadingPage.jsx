import React from "react";

import {
  motion
} from "framer-motion";

import BG from "./../../assets/Designer(1).png";

import {
  useTheme
} from "../../context/ThemeContext";
const LoadingPage = () => {


  const {
    theme
  } = useTheme();
    const pageClass =
    theme === "dark"

      ? "bg-[#0b1120] text-white"

      : "bg-slate-100 text-slate-900";



  const cardClass =
    theme === "dark"

      ? "bg-slate-900/70 border-slate-800"

      : "bg-white/80 border-slate-200";



  const secondaryText =
    theme === "dark"

      ? "text-slate-400"

      : "text-slate-500";
  return (

  <motion.div

    initial={{
      opacity: 0
    }}

    animate={{
      opacity: 1
    }}

    transition={{
      duration: 0.4
    }}

    className={`
      min-h-screen
      w-full
      flex
      items-center
      justify-center
      px-4
      ${pageClass}
    `}

  >


    <motion.div

      initial={{
        scale: 0.9,
        opacity: 0
      }}

      animate={{
        scale: 1,
        opacity: 1
      }}

      transition={{
        duration: 0.4
      }}

      className={`
        w-full
        max-w-md
        rounded-3xl
        border
        p-8
        flex
        flex-col
        items-center
        justify-center
        text-center
        backdrop-blur-xl
        shadow-2xl
        ${cardClass}
      `}

    >



      {/* Loading Image */}


      <motion.img

        src={BG}

        alt="Loading"

        animate={{
          y:[
            0,
            -12,
            0
          ]
        }}

        transition={{
          duration:2,
          repeat:Infinity,
          ease:"easeInOut"
        }}

        className="
          w-52
          h-52
          object-contain
          mb-6
        "

      />




      {/* Loader */}


      <div
        className="
          relative
          w-14
          h-14
          mb-6
        "
      >


        <div

          className="
            absolute
            inset-0
            rounded-full
            border-4
            border-slate-400/20
          "

        />


        <div

          className="
            absolute
            inset-0
            rounded-full
            border-4
            border-transparent
            border-t-cyan-500
            animate-spin
          "

        />


      </div>




      <h1

        className="
          text-2xl
          font-bold
          tracking-tight
        "

      >

        Loading...

      </h1>




      <p

        className={`
          mt-2
          text-sm
          ${secondaryText}
        `}

      >

        Preparing your experience

      </p>



    </motion.div>


  </motion.div>

);
};

export default LoadingPage;
