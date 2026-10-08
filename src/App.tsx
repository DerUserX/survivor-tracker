import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { SeasonPage } from './pages/Season'
import { Rankings } from './pages/Rankings'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="season/:n" element={<SeasonPage />} />
          <Route path="rankings" element={<Rankings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
