import { useState } from 'react'
import './ActivityTracker.css'

export default function ActivityTracker() {
  const [year] = useState(2026)

  // Generate mock activity data (0-4 intensity levels)
  const generateActivityData = () => {
    const data = {}
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31)

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0]
      data[key] = Math.floor(Math.random() * 5) // 0-4 intensity
    }
    return data
  }

  const activityData = generateActivityData()

  // Group days by weeks
  const getWeekData = () => {
    const weeks = []
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31)

    let currentWeek = []
    const firstDayOffset = startDate.getDay() // 0 = Sunday

    // Fill first week with empty days
    for (let i = 0; i < firstDayOffset; i++) {
      currentWeek.push(null)
    }

    // Fill all days
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
      const dateStr = d.toISOString().split('T')[0]
      currentWeek.push({ date: dateStr, intensity: activityData[dateStr] || 0 })
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return weeks
  }

  const weeks = getWeekData()
  const levelLabels = ['None', 'Low', 'Medium', 'High', 'Very High']
  const levelColors = ['#f3f4f6', '#dbeafe', '#60a5fa', '#3b82f6', '#1e40af']

  return (
    <div className="activity-tracker-section">
      <div className="activity-header">
        <h3 className="section-title">📅 Your Activity Tracker</h3>
        <div className="year-selector">
          <select value={year} className="year-dropdown">
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
        </div>
      </div>

      <div className="activity-heatmap">
        <div className="heatmap-days">
          <div className="day-label">Mon</div>
          <div className="day-label">Wed</div>
          <div className="day-label">Fri</div>
          <div className="day-label">Sun</div>
        </div>

        <div className="heatmap-grid">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="heatmap-week">
              {week.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  className="heatmap-day"
                  style={{
                    backgroundColor: day ? levelColors[day.intensity] : '#f9fafb',
                    cursor: day ? 'pointer' : 'default',
                  }}
                  title={day ? `${day.date}: ${levelLabels[day.intensity]}` : ''}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="activity-legend">
        <span className="legend-label">Less</span>
        {levelColors.map((color, idx) => (
          <div
            key={idx}
            className="legend-cell"
            style={{ backgroundColor: color }}
            title={levelLabels[idx]}
          />
        ))}
        <span className="legend-label">More</span>
      </div>

      <div className="activity-stats">
        <div className="stat-item">
          <span className="stat-value">
            {Object.values(activityData).filter((v) => v > 0).length}
          </span>
          <span className="stat-label">Days Active</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {Math.max(...Object.values(activityData))}
          </span>
          <span className="stat-label">Max Streak</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {(
              (Object.values(activityData).reduce((a, b) => a + b, 0) /
                Object.keys(activityData).length) *
              20
            ).toFixed(0)}
          </span>
          <span className="stat-label">Avg Score</span>
        </div>
      </div>
    </div>
  )
}
