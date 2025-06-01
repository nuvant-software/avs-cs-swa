import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/navigation/Navbar";
import Home from "./pages/Home";
import Collectie from "./pages/Collection";

const App = () => {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/collectie" element={<Collectie />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
