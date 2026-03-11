'use client'

import { motion } from "framer-motion";
import SubmissionForm from "../SubmissionForm";
import { useState } from "react";

const Sidebar = () => {
  const [open, setOpen] = useState(false);

  return (
    <motion.aside
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="glass-style sidebar"
    >
      <SubmissionForm />
    </motion.aside>
  );
}

export default Sidebar;