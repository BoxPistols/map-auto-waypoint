import { DroneDataProvider } from './contexts/DroneDataContext'
import MainLayout from './components/MainLayout/MainLayout'
import './App.scss'

function App() {
  return (
    <DroneDataProvider>
      <MainLayout />
    </DroneDataProvider>
  )
}

export default App