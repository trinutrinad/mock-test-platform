import Sidebar from './Sidebar'
import TopBar from './TopBar'
import './Layout.css'

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <TopBar />
      <main className="main-content">
        <div className="content-wrapper">
          {children}
        </div>
      </main>
    </div>
  )
}
