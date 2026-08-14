import type { MotionProps } from "motion/react";

export const premiumEase = [
  0.22,
  1,
  0.36,
  1,
] as const;

export function enterMotion(
  reduceMotion: boolean | null,
  delay = 0,
  distance = 24
): MotionProps {
  if (reduceMotion) {
    return {
      initial: false,
    };
  }

  return {
    initial: {
      opacity: 0,
      y: distance,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
    transition: {
      duration: 0.65,
      delay,
      ease: premiumEase,
    },
  };
}

export function revealMotion(
  reduceMotion: boolean | null,
  delay = 0,
  distance = 28
): MotionProps {
  if (reduceMotion) {
    return {
      initial: false,
    };
  }

  return {
    initial: {
      opacity: 0,
      y: distance,
    },
    whileInView: {
      opacity: 1,
      y: 0,
    },
    viewport: {
      once: true,
      amount: 0.16,
    },
    transition: {
      duration: 0.62,
      delay,
      ease: premiumEase,
    },
  };
}
