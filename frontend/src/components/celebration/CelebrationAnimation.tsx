import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, Star, DollarSign } from 'lucide-react';

interface CelebrationProps {
  milestone: string;
  message: string;
  onComplete?: () => void;
}

export function CelebrationAnimation({ milestone, message, onComplete }: CelebrationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Trigger confetti based on milestone
    const triggerConfetti = () => {
      switch (milestone) {
        case 'account_created':
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#3B82F6', '#60A5FA', '#93C5FD']
          });
          break;

        case 'email_verified':
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#10B981', '#34D399', '#6EE7B7']
          });
          break;

        case 'profile_complete':
          confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#8B5CF6', '#A78BFA', '#C4B5FD']
          });
          break;

        case 'credits_claimed':
          // Money rain effect
          const end = Date.now() + 3 * 1000;
          const colors = ['#FFD700', '#FFA500', '#FFFF00'];

          (function frame() {
            confetti({
              particleCount: 5,
              angle: 60,
              spread: 55,
              origin: { x: 0 },
              colors
            });
            confetti({
              particleCount: 5,
              angle: 120,
              spread: 55,
              origin: { x: 1 },
              colors
            });

            if (Date.now() < end) {
              requestAnimationFrame(frame);
            }
          })();
          break;

        case 'fully_verified':
          // Ultimate celebration - fireworks
          const duration = 5 * 1000;
          const animationEnd = Date.now() + duration;

          (function frame() {
            confetti({
              particleCount: 7,
              angle: 60,
              spread: 55,
              origin: { x: 0 },
              colors: ['#FF0080', '#7928CA', '#FF0080', '#FF6B6B']
            });
            confetti({
              particleCount: 7,
              angle: 120,
              spread: 55,
              origin: { x: 1 },
              colors: ['#FF0080', '#7928CA', '#FF0080', '#FF6B6B']
            });

            if (Date.now() < animationEnd) {
              requestAnimationFrame(frame);
            }
          })();
          break;
      }
    };

    triggerConfetti();

    // Auto-hide after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 5000);

    return () => clearTimeout(timer);
  }, [milestone, onComplete]);

  const getIcon = () => {
    switch (milestone) {
      case 'credits_claimed':
        return <DollarSign className="w-16 h-16" />;
      case 'fully_verified':
        return <Trophy className="w-16 h-16" />;
      default:
        return <Star className="w-16 h-16" />;
    }
  };

  const getColors = () => {
    switch (milestone) {
      case 'account_created':
        return 'from-blue-500 to-blue-700';
      case 'email_verified':
        return 'from-green-500 to-green-700';
      case 'profile_complete':
        return 'from-purple-500 to-purple-700';
      case 'credits_claimed':
        return 'from-yellow-500 to-orange-600';
      case 'fully_verified':
        return 'from-pink-500 to-purple-700';
      default:
        return 'from-blue-500 to-purple-700';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setIsVisible(false)}
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative max-w-md w-full mx-4 p-8 bg-gradient-to-br ${getColors()} rounded-2xl shadow-2xl text-white text-center`}
          >
            {/* Sparkles Animation */}
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="absolute -top-6 -right-6"
            >
              <Sparkles className="w-12 h-12 text-yellow-300" />
            </motion.div>

            <motion.div
              animate={{
                rotate: [360, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 1
              }}
              className="absolute -bottom-6 -left-6"
            >
              <Sparkles className="w-12 h-12 text-yellow-300" />
            </motion.div>

            {/* Icon */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="inline-block mb-6"
            >
              {getIcon()}
            </motion.div>

            {/* Message */}
            <h2 className="text-3xl font-bold mb-4">
              {milestone === 'fully_verified' ? '🎉 Amazing! 🎉' : '✨ Awesome! ✨'}
            </h2>
            <p className="text-lg opacity-95 mb-6">{message}</p>

            {/* Progress Indicator */}
            {milestone !== 'fully_verified' && (
              <p className="text-sm opacity-80">
                Keep going! You're getting closer to full verification.
              </p>
            )}

            {/* Dismiss Hint */}
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-xs mt-6 opacity-70"
            >
              Tap anywhere to continue
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
