import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Reader from './pages/Reader'
import Audio from './pages/Audio'
import Timeline from './pages/Timeline'
import Settings from './pages/Settings'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="read/:id" element={<Reader />} />
        <Route path="audio" element={<Audio />} />
        <Route path="timeline" element={<Timeline />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
