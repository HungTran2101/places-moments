'use client'

import { useViewport } from "@/hooks/useViewport"
import { useSystemStore } from "@/store/systemStore"
import { motion } from "framer-motion"
import { ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"
import SubmissionForm from "../SubmissionForm"

const Sidebar = () => {
  const sw = useSystemStore((state) => state.sidebarWidth)
  const [open, setOpen] = useState(false)
  const viewport = useViewport();
  const vh = viewport?.height;

  // memoized motion path
  const path = useMemo(() => {
    if (!vh) return undefined;
    return `path('M 20 0 C ${sw / 2.5} -300 ${sw - 25} ${vh / 4} ${sw - 25} ${(vh / 2) - 45}')`
  }, [sw, vh])

  const asideAnim = open
    ? { width: "100%" }
    : { width: "0px" }

  const panelAnim = open
    ? {
      clipPath: "circle(150% at calc(100% - 20px) calc(100% - 20px))",
      opacity: 1
    }
    : {
      clipPath: "circle(1px at calc(100% - 20px) calc(100% - 20px))",
      opacity: 0.5
    }

  const buttonAnim = open
    ? { rotate: 90, offsetDistance: "100%" }
    : { rotate: 70, offsetDistance: "0%" }

  return (
    <motion.aside
      className="sidebar"
      initial={{ width: "0px" }}
      animate={asideAnim}
      transition={{
        duration: open ? 0 : 0.1,
        delay: open ? 0 : 0.6
      }}
    >
      <motion.div
        className="sidebar-content glass-style"
        initial={{
          clipPath: "circle(1px at calc(100% - 20px) calc(100% - 20px))",
          opacity: 0.5
        }}
        animate={panelAnim}
        transition={{
          duration: 0.6,
          delay: open ? 0.7 : 0
        }}
      >
        <SubmissionForm />
      </motion.div>

      <motion.span
        className="sidebar-button"
        onClick={() => setOpen((v) => !v)}
        animate={buttonAnim}
        transition={{
          duration: 0.7,
          delay: open ? 0 : 0.5,
          ease: open
            ? [0.1, 0.27, 1, -0.14]
            : [0.14, 0.95, 1, 0.84]
        }}
        style={{ offsetPath: path }}
      >
        <motion.div
          className="glass-round-style"
          animate={{ opacity: open ? 0 : 1 }}
          transition={{ delay: open ? 0.7 : 0.4 }}
        />

        <ChevronRight
          className="icon"
          color={open ? "#eaa6ff" : "#fff"}
          style={{ transition: "stroke 1.5s ease" }}
        />
      </motion.span>
    </motion.aside>
  )
}

export default Sidebar