import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/login");
    } else {
      setUser(JSON.parse(userData));
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white p-8">
      <nav className="flex justify-between items-center max-w-7xl mx-auto mb-12">
        <h1 className="text-2xl font-bold tracking-tight">🚀 Dashboard</h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLogout}
          className="px-6 py-2 bg-red-500 hover:bg-red-600 rounded-xl transition shadow-lg text-sm font-semibold"
        >
          Logout
        </motion.button>
      </nav>

      <main className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-10 rounded-3xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-2xl"
        >
          <h2 className="text-4xl font-bold mb-4">Welcome back, {user.name}! 👋</h2>
          <p className="text-gray-400 text-lg mb-8 italic">Your email: {user.email}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-blue-400 mb-2">Account Status</h3>
              <p className="text-sm text-gray-300">Your account is active and verified.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-blue-400 mb-2">Projects</h3>
              <p className="text-sm text-gray-300">You have no active projects yet.</p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
