import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import CurosrTest from './CurosrTest.tsx'
import PositionTest from './PositionTest.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* <App /> */}
    {/* <CurosrTest /> */}
    <PositionTest />
  </StrictMode>,
)
