import { useState } from 'react'
import Home from './pages/Home.jsx'
import Map from './components/Map.jsx'
import './styles/index.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

function App() {
  const [count, setCount] = useState(0)

  return (  
    <>
    <Router>
      <Routes>
        <Route path="/" element={<Map />} />
      </Routes>
    </Router>
    </>
  )
}

export default App
