import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/navigation/Navbar';
import TopBar from './components/TopBar';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Footer from './components/Footer';
import Collection from './pages/Collection';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <TopBar />
        <Navbar />
        {/* alleen padding voor de TopBar (40px hoogte) */}
        <main className="!flex-grow !pt-[40px]">
          <Routes>
            <Route path="/" element={<Home />} />
             <Route path="/collection" element={<Collection />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
