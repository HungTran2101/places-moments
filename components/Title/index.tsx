'use client'

import { useSystemStore } from "@/store/systemStore";
import { motion } from "framer-motion";
import { Earth, Map } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

const mapStates = [
  {
    value: '2d',
    icon: Map
  },
  {
    value: '3d',
    icon: Earth
  }
]

const Title = () => {

  const t = useTranslations('meta');

  const primaryColor = useSystemStore(state => state.primaryColor)
  const mapState = useSystemStore(state => state.mapState)
  const mapReady = useSystemStore((state) => state.mapReady);
  const sidebarOpen = useSystemStore((state) => state.sidebarOpen);

  const setMapState = useSystemStore(state => state.setMapState)

  const titleAnimate = useMemo(() => {
    if (mapReady && !sidebarOpen) return { opacity: 1 }
    return { opacity: 0 }
  }, [sidebarOpen, mapReady])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={titleAnimate}
      transition={{ duration: 1 }}
      className="title fixed z-10 left-1/2 -translate-x-1/2 top-6"
    >
      <div className="liquid-glass w-fit px-4 py-2 rounded-[30px] flex flex-col justify-center items-center">
        <div className="gradient-text font-mitr text-[22px] text-nowrap md:text-[30px] lg:text-[40px] font-semibold uppercase">{t('title')}</div>
        <div className="flex items-center p-1 md:p-2 rounded-[20px] gap-3">
          {mapStates.map(ms => (
            <motion.div
              key={ms.value}
              className="relative p-1 rounded-full"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.5 }}
              animate={{ color: mapState === ms.value ? 'white' : `rgb(${primaryColor})` }}
            >
              {
                mapState === ms.value && <motion.div
                  layoutId="mapState-active"
                  className="absolute inset-0 bg-[rgba(var(--primary-color-var),_0.3)] rounded-full"
                />
              }
              <ms.icon
                className="cursor-pointer z-10 relative"
                onClick={() => setMapState(ms.value as typeof mapState)}
              />
            </motion.div>
          ))}
          {/* <motion.div
              className="relative p-1 rounded-full"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.5 }}
              animate={{ color: mapState === '2d' ? 'white' : `rgb(${primaryColor})` }}
            >
              {
                mapState === '2d' && <motion.div
                  layoutId="mapState-active"
                  className="absolute inset-0 bg-[rgba(var(--primary-color-var),_0.3)] rounded-full z-[-1]"
                />
              }
              <Map
                className="cursor-pointer"
                onClick={() => setMapState('2d')}
              />
            </motion.div>
            <motion.span
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.5 }}
            >
              <Earth
                className="cursor-pointer"
                color={`rgb(${mapState === '3d' ? secondaryColor : primaryColor})`}
                onClick={() => setMapState('3d')}
              />
            </motion.span> */}
        </div>
        {/* <div className="liquid-glass2 flex items-center p-2 md:p-4 rounded-[20px] gap-3">
            <motion.span
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.5 }}
            >
              <MessageCircleMore
                className="cursor-pointer"
                color={`rgb(${feature === 'moment' ? secondaryColor : primaryColor})`}
                onClick={() => setFeature('moment')}
              />
            </motion.span>
            <motion.span
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.5 }}
            >
              <Mail
                className="cursor-pointer"
                color={`rgb(${feature === 'message' ? secondaryColor : primaryColor})`}
                onClick={() => setFeature('message')}
              />
            </motion.span>
          </div> */}
      </div>
    </motion.div>
  );
}

export default Title;