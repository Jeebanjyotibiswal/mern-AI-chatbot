import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Chatbot from "./Chatbot";

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-br from-black via-gray-900 to-gray-800 text-white">
      
      {/* Navbar */}
      <nav className="fixed w-full top-0 left-0 z-50 backdrop-blur-md bg-white/10 border-b border-white/20">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
          
          {/* Logo */}
          <Link to="/">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold tracking-wide cursor-pointer"
            >
              🚀 MyApp
            </motion.h1>
          </Link>

          {/* Nav Buttons */}
          <div className="space-x-4">
            <Link to="/login">
              <button className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
                Login
              </button>
            </Link>
            <Link to="/register">
              <button className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 transition shadow-lg">
                Register
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex items-center justify-center h-screen px-4 text-center">
        
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Welcome Home 🚀
          </h1>

          <p className="text-lg text-gray-300 mb-8">
            Build modern apps with React, Tailwind & Framer Motion
          </p>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-blue-500 rounded-xl shadow-xl hover:bg-blue-600 transition"
          >
            Get Started
          </motion.button>
        </motion.div>
         <Chatbot />
      </div>
    </div>
  );
}