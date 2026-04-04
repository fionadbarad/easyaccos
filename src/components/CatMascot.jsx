'use client';
import { motion } from 'framer-motion';
export default function CatMascot({ src = '/cat-mascot.png', size = 120, className = '' }) {
  return (
    <motion.div className={className}
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 3.5, ease: 'easeInOut', repeat: Infinity, repeatType: 'loop' }}
      style={{ display:'inline-block', borderRadius:'50%', boxShadow:'0 0 24px rgba(253,185,49,0.4),0 0 48px rgba(253,185,49,0.15)', width:size, height:size }}>
      <motion.img src={src} alt="EasyAcco mascot" width={size} height={size}
        style={{ borderRadius:'50%', objectFit:'cover', display:'block', width:'100%', height:'100%' }}
        whileHover={{ scale: 1.08 }} transition={{ type:'spring', stiffness:300, damping:20 }} />
    </motion.div>
  );
}
