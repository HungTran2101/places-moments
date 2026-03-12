import { useEffect, useState } from "react"

type Viewport = {
  width: number
  height: number
} | null

export function useViewport(delay = 150): Viewport {
  const [viewport, setViewport] = useState<Viewport>(null)

  useEffect(() => {
    let timeout: NodeJS.Timeout
    let raf: number

    const getViewport = () => {
      const vv = window.visualViewport

      return {
        width: vv?.width ?? window.innerWidth,
        height: vv?.height ?? window.innerHeight
      }
    }

    const update = () => {
      cancelAnimationFrame(raf)

      raf = requestAnimationFrame(() => {
        clearTimeout(timeout)

        timeout = setTimeout(() => {
          setViewport(getViewport())
        }, delay)
      })
    }

    update()

    window.addEventListener("resize", update)
    window.visualViewport?.addEventListener("resize", update)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timeout)

      window.removeEventListener("resize", update)
      window.visualViewport?.removeEventListener("resize", update)
    }
  }, [delay])

  return viewport
}