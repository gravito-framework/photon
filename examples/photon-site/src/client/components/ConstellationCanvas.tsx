import type React from 'react'
import { useEffect, useRef } from 'react'

interface Props {
  className?: string
}

export const ConstellationCanvas: React.FC<Props> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    let animationFrameId: number
    let particles: Particle[] = []

    // Configuration
    // const particleCount = 100 // Density // Removed static config
    const connectionDistance = 150
    const mouseDistance = 200

    // Dynamic Colors based on Theme
    const getThemeColors = () => {
      const isLight = document.documentElement.classList.contains('light')
      return {
        particle: isLight ? 'rgba(255, 184, 0, 0.6)' : 'rgba(255, 184, 0, 0.3)', // Higher opacity in light
        line: isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(209, 213, 219, 0.1)', // Darker lines in light
        mouseLineBase: isLight ? 'rgba(255, 184, 0, ' : 'rgba(255, 184, 0, ',
        nodeLineBase: isLight ? 'rgba(50, 50, 50, ' : 'rgba(150, 150, 150, ',
      }
    }

    let colors = getThemeColors()

    let w = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth)
    let h = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight)

    class Particle {
      x: number
      y: number
      vx: number
      vy: number
      size: number

      constructor() {
        this.x = Math.random() * w
        this.y = Math.random() * h
        this.vx = (Math.random() - 0.5) * 0.5 // Slow movement
        this.vy = (Math.random() - 0.5) * 0.5
        this.size = Math.random() * 2 + 1
      }

      update() {
        this.x += this.vx
        this.y += this.vy

        // Bounce
        if (this.x < 0 || this.x > w) {
          this.vx *= -1
        }
        if (this.y < 0 || this.y > h) {
          this.vy *= -1
        }
      }

      draw() {
        if (!ctx) {
          return
        }
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = colors.particle
        ctx.fill()
      }
    }

    const init = () => {
      // Responsive particle count
      // Desktop: 100, Tablet: 70, Mobile: 40
      // This reduces calculation load from ~5000 checks to ~800 checks on mobile
      let particleCount = 100
      if (w < 768) {
        particleCount = 40
      } else if (w < 1024) {
        particleCount = 70
      }

      particles = []
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle())
      }
    }

    // Mouse interaction
    const mouse = { x: -9999, y: -9999 }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }

    const handleResize = () => {
      w = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth
      h = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight
      init()
    }

    // Watch for class changes on HTML element to switch theme dynamically
    const observer = new MutationObserver(() => {
      colors = getThemeColors()
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)

    const animate = () => {
      ctx.clearRect(0, 0, w, h)

      // Update and draw particles
      particles.forEach((p) => {
        p.update()
        p.draw()
      })

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i]

        // Connect to mouse
        const dxMouse = p1.x - mouse.x
        const dyMouse = p1.y - mouse.y
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse)

        if (distMouse < mouseDistance) {
          ctx.beginPath()
          // Dynamic alpha
          const alpha = 0.4 * (1 - distMouse / mouseDistance)
          ctx.strokeStyle = `${colors.mouseLineBase}${alpha})`
          ctx.lineWidth = 1
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(mouse.x, mouse.y)
          ctx.stroke()
        }

        // Connect to other particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < connectionDistance) {
            ctx.beginPath()
            // Dynamic alpha for lines
            const alpha =
              (colors.line.includes('0.15') ? 0.3 : 0.1) * (1 - dist / connectionDistance)
            ctx.strokeStyle = `${colors.nodeLineBase}${alpha})`
            ctx.lineWidth = 0.5
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    init()
    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      observer.disconnect()
    }
  }, [])

  return (
    <canvas ref={canvasRef} className={`absolute inset-0 pointer-events-none z-0 ${className}`} />
  )
}
