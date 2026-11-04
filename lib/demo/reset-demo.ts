import { DEMO_RESET_KEYS } from '@/lib/demo/storage-keys'

const SESSION_KEYS = ['bikesuite_workspace_unlocked', 'bikesuite_last_activity']

export function clearDemoData() {
  for (const key of DEMO_RESET_KEYS) window.localStorage.removeItem(key)
  for (const key of SESSION_KEYS) window.sessionStorage.removeItem(key)
}

export function resetDemoData(reload: () => void = () => window.location.reload()) {
  clearDemoData()
  reload()
}
