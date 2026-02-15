import { useAuth } from '../context/AuthContext'
import './TopBar.css'

export default function TopBar() {
  const { user } = useAuth()

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="course-selector">
          <label htmlFor="course">Course:</label>
          <select id="course" className="course-dropdown">
            <option value="appsc-group-2">APPSC Group 2</option>
            <option value="appsc-group-1">APPSC Group 1</option>
            <option value="upsc-ias">UPSC IAS</option>
            <option value="ssc-cgl">SSC CGL</option>
          </select>
        </div>
      </div>

      <div className="topbar-right">
        <button className="upgrade-btn">✨ Upgrade</button>
        <div className="user-info">
          <span className="user-email">{user?.email?.split('@')[0]}</span>
          <div className="user-avatar">{user?.email?.charAt(0).toUpperCase()}</div>
        </div>
      </div>
    </div>
  )
}
