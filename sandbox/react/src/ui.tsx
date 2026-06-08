/**
 * Sandbox UI kit — built on the React target's style engine (Stitches via
 * @render-experiment/style-engine-react). Minimal + premium: a centered
 * container on a soft light-gray → white gradient. Kept separate from app.tsx
 * so the demo file stays about the components.
 */
import { styled, globalCss } from '@render-experiment/style-engine-react'

export const globalStyles = globalCss({
  '*': { boxSizing: 'border-box' },
  'html, body, #root': { height: '100%' },
  body: {
    margin: 0,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    color: '#1c1e26',
    // Soft light-gray → white, fixed so it covers the viewport on scroll.
    background: 'linear-gradient(180deg, #eef1f6 0%, #ffffff 60%)',
    backgroundAttachment: 'fixed',
    WebkitFontSmoothing: 'antialiased',
  },
})

/** Centered, max-width content column. */
export const Container = styled('main', {
  maxWidth: 640,
  margin: '0 auto',
  padding: '88px 24px 120px',
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
})

export const Hero = styled('header', {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  marginBottom: 8,
})

export const Title = styled('h1', {
  margin: 0,
  fontSize: 36,
  lineHeight: 1.1,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: '#0d0f16',
})

export const Lead = styled('p', {
  margin: 0,
  fontSize: 16,
  lineHeight: 1.6,
  color: '#5b6172',
  maxWidth: 520,
})

/** A clean white card with a soft shadow — holds one demo group. */
export const Card = styled('section', {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  padding: 24,
  borderRadius: 16,
  background: '#ffffff',
  border: '1px solid rgba(13, 15, 22, 0.06)',
  boxShadow: '0 1px 2px rgba(13,15,22,0.04), 0 12px 32px rgba(13,15,22,0.06)',
})

export const CardTitle = styled('h2', {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: '#0d0f16',
})

export const CardHint = styled('p', {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.5,
  color: '#8990a0',
})

export const Row = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  alignItems: 'center',
})

/** Trigger button used across the demos. */
export const Button = styled('button', {
  appearance: 'none',
  border: '1px solid rgba(13,15,22,0.1)',
  borderRadius: 10,
  padding: '9px 15px',
  fontSize: 14,
  fontWeight: 600,
  color: '#1c1e26',
  cursor: 'pointer',
  background: '#ffffff',
  boxShadow: '0 1px 2px rgba(13,15,22,0.05)',
  transition: 'transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    borderColor: 'rgba(13,15,22,0.18)',
    boxShadow: '0 4px 12px rgba(13,15,22,0.08)',
  },
  '&:active': { transform: 'translateY(0)' },
  '&:focus-visible': { outline: '2px solid #5b73ff', outlineOffset: 2 },
  variants: {
    tone: {
      primary: {
        border: '1px solid transparent',
        color: '#ffffff',
        background: 'linear-gradient(180deg, #5b73ff 0%, #4658e0 100%)',
        boxShadow: '0 2px 8px rgba(70,88,224,0.35)',
        '&:hover': {
          transform: 'translateY(-1px)',
          borderColor: 'transparent',
          background: 'linear-gradient(180deg, #6b81ff 0%, #5161e8 100%)',
          boxShadow: '0 6px 16px rgba(70,88,224,0.4)',
        },
      },
    },
  },
})
