import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Chatbot from './pages/Chatbot';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import GithubAnalyzer from './pages/GithubAnalyzer';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/chatbot" element={<Chatbot />} />
                <Route path="/resume-analyzer" element={<ResumeAnalyzer />} />
                <Route path="/github-analyzer" element={<GithubAnalyzer />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;