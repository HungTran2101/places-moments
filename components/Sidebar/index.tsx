'use client'

import { useViewport } from "@/hooks/useViewport"
import { useSystemStore } from "@/store/systemStore"
import { motion } from "framer-motion"
import { ChevronRight } from "lucide-react"
import { useMemo } from "react"
import SubmissionForm from "../SubmissionForm"

const Sidebar = () => {
  const sw = useSystemStore((state) => state.sidebarWidth)
  const glassPrimaryColor = useSystemStore(state => state.primaryColor)
  const mapReady = useSystemStore((state) => state.mapReady);
  const sidebarOpen = useSystemStore((state) => state.sidebarOpen);
  const setSidebarOpen = useSystemStore((state) => state.setSidebarOpen);

  const viewport = useViewport();
  const vh = viewport?.height;
  const vw = viewport?.width;

  // memoized motion path
  const path = useMemo(() => {
    if (!vh || !vw) return undefined;
    const w = Math.min(vw, sw)
    const leftEnd = vw <= sw ? 65 : 50;
    return `path('M 20 0 C ${w / 2.5} -300 ${w - 25} ${vh / 4} ${w - leftEnd} ${(vh / 2) - 50}')`
  }, [sw, vh, vw])

  const asideAnim = sidebarOpen
    ? { width: "100%" }
    : { width: "0px" }

  const panelAnim = sidebarOpen
    ? {
      clipPath: "circle(150% at calc(100% - 20px) calc(100% - 20px))",
      opacity: 1
    }
    : {
      clipPath: "circle(1px at calc(100% - 20px) calc(100% - 20px))",
      opacity: 0.5
    }

  const buttonAnim = sidebarOpen
    ? { rotate: 90, offsetDistance: "100%" }
    : { rotate: 70, offsetDistance: "0%" }

  return (
    <motion.aside
      className="sidebar"
      initial={{ width: "0px", opacity: 0 }}
      animate={mapReady ? { ...asideAnim, opacity: 1 } : {
        width: "0px",
        opacity: 0
      }}
      transition={{
        duration: mapReady && !sidebarOpen ? 2 : sidebarOpen ? 0 : 0.1,
        delay: sidebarOpen ? 0 : 0.6
      }}
    >
      {/* <motion.div
        className="liquid-glass absolute inset-[0_0_0_20px] rounded-lg"
        animate={{
          opacity: open ? 1 : 0
        }}
        transition={{
          delay: open ? 1.3 : 0
        }}
      > */}
      <motion.div
        className="sidebar-content liquid-glass2"
        initial={{
          clipPath: "circle(1px at calc(100% - 20px) calc(100% - 20px))",
          opacity: 0.5
        }}
        animate={panelAnim}
        transition={{
          duration: 0.6,
          delay: sidebarOpen ? 0.7 : 0
        }}
      >
        <SubmissionForm />
      </motion.div>
      {/* </motion.div> */}

      <motion.span
        className="sidebar-button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        animate={buttonAnim}
        transition={{
          duration: 0.7,
          delay: sidebarOpen ? 0 : 0.5,
          ease: sidebarOpen
            ? [0.1, 0.27, 1, -0.14]
            : [0.14, 0.95, 1, 0.84]
        }}
        style={{ offsetPath: path }}
      >
        <motion.div
          style={{
            '--glass-color': glassPrimaryColor
          } as React.CSSProperties}
          className="liquid-glass"
          animate={{ scale: sidebarOpen ? 0.8 : 1 }}
          transition={{ delay: sidebarOpen ? 0.7 : 0.4 }}
        />

        <ChevronRight
          className="icon"
          color="#fff"
          // color={open ? "#eaa6ff" : "#fff"}
          style={{ transition: "stroke 1.5s ease" }}
        />
      </motion.span>
    </motion.aside>
  )
}

export default Sidebar