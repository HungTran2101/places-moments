'use client'

import { useSystemStore } from "@/store/systemStore";
import { motion } from "framer-motion";
import { Earth, Mail, Map, MessageCircleMore } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const secondaryColor = useSystemStore(state => state.secondaryColor)
  const mapState = useSystemStore(state => state.mapState)
  const feature = useSystemStore(state => state.feature)
  const setMapState = useSystemStore(state => state.setMapState)
  const setFeature = useSystemStore(state => state.setFeature)

  return (
    <div className="title fixed z-10 left-1/2 -translate-x-1/2 top-6">
      <div className="liquid-glass w-fit px-4 py-2 rounded-[30px] flex flex-col justify-center items-center gap-2">
        <div className="gradient-text font-mitr text-[24px] md:text-[30px] lg:text-[40px] font-semibold uppercase">{t('title')}</div>
        <div className="flex items-center gap-2">
          <div className="liquid-glass2 flex items-center p-2 md:p-4 rounded-[20px] gap-3">
            {
              mapStates.map(ms => (
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
                      className="absolute inset-0 bg-[rgba(var(--primary-color-var),_0.3)] rounded-full z-[-1]"
                    />
                  }
                  <ms.icon
                    className="cursor-pointer"
                    onClick={() => setMapState(ms.value as typeof mapState)}
                  />
                </motion.div>
              ))
            }
            <motion.div
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
            </motion.span>
          </div>
          <div className="liquid-glass2 flex items-center p-2 md:p-4 rounded-[20px] gap-3">
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default Title;