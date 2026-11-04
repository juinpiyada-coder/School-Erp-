import { createContext, useState, useEffect, useContext } from 'react'
import axios from '../lib/axios'

const WhitelabelContext = createContext()

export function WhitelabelProvider({ children }) {
  const [settings, setSettings] = useState(null)

  const fetchSettings = async () => {
    try {
      const userStr = sessionStorage.getItem('e_school_user')
      let bmnId = ''
      let brnId = ''
      if (userStr) {
        const user = JSON.parse(userStr)
        const role = (user.user_role || user.role || user.role_id || '').toLowerCase()
        
        bmnId = user.school_id || user.MAS_bmn_id || user.SCHL_MN_ID || user.bmn_id || user.center_id || ''
        brnId = user.branch_id || user.MAS_brn_id || user.SCHL_BR_ID || user.brn_id || ''

        // Fallbacks for school or branch admins if IDs weren't explicit
        if (!bmnId && (role.includes('school') || role.includes('s_admin'))) {
          bmnId = user.id || user.user_id || user.userId || ''
        }
        if (!brnId && (role.includes('branch') || role.includes('b_admin'))) {
          brnId = user.id || user.user_id || user.userId || ''
        }
      }
      
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/settings/whitelabel`, {
        params: { bmn_id: bmnId, brn_id: brnId }
      })
      
      const data = res.data?.data
      if (data) {
        setSettings(data)
        
        // Inject all Theme and Design System CSS Variables
        if (data.WL_DESC?.primaryColor) {
          const prim = data.WL_DESC.primaryColor
          document.documentElement.style.setProperty('--primary-color', prim)
          document.documentElement.style.setProperty('--clr-primary', prim)
          document.documentElement.style.setProperty('--clr-primary-hover', prim)
          document.documentElement.style.setProperty('--clr-sidebar-active', `${prim}88`)
        }
        if (data.WL_DESC?.secondaryColor) {
          const sec = data.WL_DESC.secondaryColor
          document.documentElement.style.setProperty('--secondary-color', sec)
          document.documentElement.style.setProperty('--clr-secondary', sec)
          document.documentElement.style.setProperty('--clr-tertiary', sec)
        }
      }
    } catch (err) {
      console.error('Failed to load whitelabel settings', err)
    }
  }

  useEffect(() => {
    fetchSettings()
    
    // Listen for custom event to refresh settings after saving in Settings.jsx
    const handleRefresh = () => fetchSettings()
    window.addEventListener('refreshWhitelabel', handleRefresh)
    return () => window.removeEventListener('refreshWhitelabel', handleRefresh)
  }, [])

  return (
    <WhitelabelContext.Provider value={{ settings, fetchSettings }}>
      {children}
    </WhitelabelContext.Provider>
  )
}

export const useWhitelabel = () => useContext(WhitelabelContext)
