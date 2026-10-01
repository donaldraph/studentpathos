import { CheckCircle2, Circle, Clock, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useJourneyStore } from '../../stores/journeyStore';

interface Step {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
  estimatedTime: string;
}

export function JourneyTimeline() {
  const { journey, isLoading } = useJourneyStore();

  const steps: Step[] = [
    {
      id: 1,
      title: 'Create AWS Account',
      description: 'Sign up with your .edu email',
      completed: journey?.account_exists || false,
      current: journey?.current_step === 1,
      estimatedTime: '3 min'
    },
    {
      id: 2,
      title: 'Verify Student Email',
      description: 'Check your inbox and confirm',
      completed: journey?.edu_email_verified || false,
      current: journey?.current_step === 2,
      estimatedTime: '2 min'
    },
    {
      id: 3,
      title: 'Create Builder Profile',
      description: 'Complete your Builder Center profile',
      completed: journey?.profile_exists || false,
      current: journey?.current_step === 3,
      estimatedTime: '5 min'
    },
    {
      id: 4,
      title: 'Claim AWS Credits',
      description: 'Get your $100 promotional credits',
      completed: journey?.has_credits || false,
      current: journey?.current_step === 4,
      estimatedTime: '2 min'
    },
    {
      id: 5,
      title: 'Fully Verified',
      description: 'Start building amazing things!',
      completed: journey?.verified || false,
      current: journey?.current_step === 5,
      estimatedTime: '1 min'
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercentage = (completedCount / steps.length) * 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-6">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900">Your AWS Journey</h2>
          <span className="text-sm font-medium text-blue-600">
            {completedCount} of {steps.length} complete
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="absolute h-full bg-gradient-to-r from-blue-500 to-purple-600"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Timeline Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative flex items-start p-4 rounded-lg border-2 transition-all ${
              step.current
                ? 'border-blue-500 bg-blue-50 shadow-lg'
                : step.completed
                ? 'border-green-300 bg-green-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`absolute left-8 top-16 w-0.5 h-8 ${
                  step.completed ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            )}

            {/* Step Icon */}
            <div className="flex-shrink-0 mr-4">
              {step.completed ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </motion.div>
              ) : step.current ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Clock className="w-8 h-8 text-blue-600" />
                </motion.div>
              ) : (
                <Circle className="w-8 h-8 text-gray-400" />
              )}
            </div>

            {/* Step Content */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className={`text-lg font-semibold ${
                  step.completed ? 'text-green-800' :
                  step.current ? 'text-blue-800' :
                  'text-gray-600'
                }`}>
                  {step.title}
                </h3>
                <span className="text-xs text-gray-500">{step.estimatedTime}</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{step.description}</p>

              {/* Current Step Action */}
              {step.current && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Start This Step
                </motion.button>
              )}

              {/* Completed Badge */}
              {step.completed && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-green-700"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Completed
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Completion Message */}
      {completedCount === steps.length && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8 p-6 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg text-white text-center"
        >
          <Sparkles className="w-12 h-12 mx-auto mb-3" />
          <h3 className="text-2xl font-bold mb-2">You're All Set!</h3>
          <p className="text-purple-100">
            Your AWS student account is fully verified. Time to build something amazing!
          </p>
        </motion.div>
      )}
    </div>
  );
}
