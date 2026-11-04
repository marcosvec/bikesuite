import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
afterEach(() => cleanup())
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = class {
  observe() {} unobserve() {} disconnect() {}
}
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false
if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => {}
if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {}
Element.prototype.scrollIntoView = () => {}
