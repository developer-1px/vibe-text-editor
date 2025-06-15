import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// import App from './App.tsx'
// import CurosrTest from './CurosrTest.tsx'
// import PositionTest from './PositionTest.tsx'
import SelectionTest from './SelectionTest.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* <App /> */}
    {/* <CurosrTest /> */}
    {/* <PositionTest /> */}
    <SelectionTest />
  </StrictMode>,
)
