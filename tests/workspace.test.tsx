import { act, fireEvent, render, screen } from '@testing-library/react'
import { createPortal } from 'react-dom'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { NavigationPreferencesProvider, NavigationSettings, ProtectedWorkspace, useNavigationPreferences } from '@/components/dashboard/navigation-preferences'
const route = vi.hoisted(() => ({ path: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => route.path }))
const KEY = 'bikesuite_navigation_preferences'
const SESSION = 'bikesuite_workspace_unlocked'
const ACTIVITY = 'bikesuite_last_activity'
function Controls() {
  const p = useNavigationPreferences()
  return <><button onClick={p.lockWorkspace}>Lock test</button><button onClick={p.toggleSidebar}>Toggle test</button><output data-testid="collapsed">{String(p.collapsed)}</output></>
}
function App({ portal = false }: { portal?: boolean }) {
  return <NavigationPreferencesProvider><Controls /><ProtectedWorkspace><h2>Financial dashboard</h2><NavigationSettings />{portal && createPortal(<div>Open sensitive dialog</div>, document.body)}</ProtectedWorkspace></NavigationPreferencesProvider>
}
function signIn() { fireEvent.click(screen.getByRole('button', { name: 'Sign in' })) }
function advance(ms: number) { act(() => vi.advanceTimersByTime(ms)) }
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-27T00:00:00Z')); localStorage.clear(); sessionStorage.clear(); route.path = '/' })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
describe('workspace session', () => {
  it('starts locked, permits blank sign-in and stays unlocked across page changes', () => {
    const app = render(<App />)
    expect(screen.queryByText('Financial dashboard')).toBeNull()
    signIn(); expect(screen.getByText('Financial dashboard')).toBeTruthy()
    route.path = '/inventory'; app.rerender(<App />)
    expect(screen.getByText('Financial dashboard')).toBeTruthy()
  })
  it('retains an unexpired session after remount and locks expired sessions before content mounts', () => {
    let app = render(<App />); signIn(); app.unmount()
    advance(60_000); app = render(<App />)
    expect(screen.getByText('Financial dashboard')).toBeTruthy(); app.unmount()
    advance(300_000); render(<App />)
    expect(screen.queryByText('Financial dashboard')).toBeNull()
  })
  it('removes open portals while confirming prompt disable', () => {
    render(<App portal />); signIn()
    fireEvent.click(screen.getByLabelText('Require sign-in'))
    expect(screen.queryByText('Open sensitive dialog')).toBeNull()
    expect(screen.queryByText('Financial dashboard')).toBeNull()
  })
  it('locks at five minutes and removes portals', () => {
    render(<App portal />); signIn()
    advance(299_000); expect(screen.getByText('Open sensitive dialog')).toBeTruthy()
    advance(1000); expect(screen.queryByText('Financial dashboard')).toBeNull()
    expect(screen.queryByText('Open sensitive dialog')).toBeNull()
  })
  it('resets the timer on activity and locks only after a full idle period', () => {
    render(<App />); signIn(); advance(240_000)
    fireEvent.keyDown(document.body, { key: 'a' }); advance(240_000)
    expect(screen.getByText('Financial dashboard')).toBeTruthy()
    advance(60_000); expect(screen.queryByText('Financial dashboard')).toBeNull()
  })
  it('checks elapsed time on return from a suspended tab before accepting activity', () => {
    render(<App />); signIn()
    vi.setSystemTime(Date.now() + 360_000)
    fireEvent.focus(window)
    expect(screen.queryByText('Financial dashboard')).toBeNull()
  })
  it('persists a custom timeout and rejects blank/out-of-range values', () => {
    render(<App />); signIn()
    const input = screen.getByLabelText('Lock after inactivity (minutes)') as HTMLInputElement
    expect(input.value).toBe('5')
    fireEvent.change(input, { target: { value: '1' } }); fireEvent.blur(input)
    expect(JSON.parse(localStorage.getItem(KEY)!).idleMinutes).toBe(1)
    fireEvent.change(input, { target: { value: '' } }); fireEvent.blur(input); expect(input.value).toBe('1')
    fireEvent.change(input, { target: { value: '121' } }); fireEvent.blur(input); expect(input.value).toBe('1')
    advance(60_000); expect(screen.queryByText('Financial dashboard')).toBeNull()
  })
  it('requires confirmation to disable, enables without confirmation, and manual lock always works', () => {
    render(<App />); signIn()
    fireEvent.click(screen.getByLabelText('Require sign-in'))
    expect(screen.getByRole('button', { name: 'Turn off prompts' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Turn off prompts' }))
    advance(600_000); expect(screen.getByText('Financial dashboard')).toBeTruthy()
    fireEvent.click(screen.getByText('Lock test')); expect(screen.queryByText('Financial dashboard')).toBeNull()
    signIn(); fireEvent.click(screen.getByLabelText('Require sign-in'))
    expect(screen.getByText('Financial dashboard')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(KEY)!).passwordPrompt).toBe(true)
  })
  it('persists manual lock across reload', () => {
    const app = render(<App />); signIn(); fireEvent.click(screen.getByText('Lock test')); app.unmount()
    render(<App />); expect(screen.queryByText('Financial dashboard')).toBeNull()
  })
  it('fails closed for malformed session activity', () => {
    sessionStorage.setItem(SESSION, 'yes'); sessionStorage.setItem(ACTIVITY, 'invalid')
    render(<App />); expect(screen.queryByText('Financial dashboard')).toBeNull()
  })
  it('restarts the collapse delay on navigation and cancels it on manual toggle', () => {
    const app = render(<App />); signIn()
    route.path = '/inventory'; app.rerender(<App />); advance(3000)
    route.path = '/customers'; app.rerender(<App />); advance(3000)
    expect(screen.getByTestId('collapsed').textContent).toBe('false')
    advance(1000); expect(screen.getByTestId('collapsed').textContent).toBe('true')
    fireEvent.click(screen.getByText('Toggle test'))
    route.path = '/pos'; app.rerender(<App />); advance(1000)
    fireEvent.click(screen.getByText('Toggle test')); fireEvent.click(screen.getByText('Toggle test'))
    advance(5000); expect(screen.getByTestId('collapsed').textContent).toBe('false')
  })
  it('Tab toggles outside fields, but leaves form navigation and Shift+Tab alone', () => {
    render(<App />)
    fireEvent.keyDown(screen.getByLabelText('Password'), { key: 'Tab' })
    expect(screen.getByTestId('collapsed').textContent).toBe('false')
    signIn(); fireEvent.keyDown(document.body, { key: 'Tab' })
    expect(screen.getByTestId('collapsed').textContent).toBe('true')
    fireEvent.keyDown(document.body, { key: 'Tab', shiftKey: true })
    expect(screen.getByTestId('collapsed').textContent).toBe('true')
  })
})
