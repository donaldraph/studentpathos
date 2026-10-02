import { motion } from 'framer-motion';
import { Users, TrendingUp, MessageCircle, AlertCircle, Lightbulb } from 'lucide-react';
import { useEffect, useState } from 'react';
import { twinApi } from '../../services/api';

interface InsightData {
  total_students: number;
  total_conversations: number;
  total_questions: number;
  avg_questions_per_student: number;
  trending_topics: Array<{ topic: string; count: number }>;
  confusion_points: string[];
  recommendations_for_aws: string[];
}

export function CommunityInsights() {
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setIsLoading(true);
    try {
      const response = await twinApi.getCommunityInsights('7d');
      const data = response.data?.body ? JSON.parse(response.data.body) : response.data;
      setInsights(data);
    } catch (error) {
      console.error('Failed to fetch insights from API, loading from conversations:', error);
      // Query real conversation count from agent endpoint
      try {
        const API_URL = 'https://iqs70qndul.execute-api.us-east-1.amazonaws.com/prod';
        const resp = await fetch(`${API_URL}/twin/insights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ time_period: '7d' })
        });
        if (resp.ok) {
          const raw = await resp.json();
          const data = raw?.body ? JSON.parse(raw.body) : raw;
          setInsights(data);
          return;
        }
      } catch (e) {
        console.error('Direct fetch also failed:', e);
      }
      // Last resort: show zeros with honest messaging
      setInsights({
        total_students: 0,
        total_conversations: 0,
        total_questions: 0,
        avg_questions_per_student: 0,
        trending_topics: [],
        confusion_points: [
          'Analytics will populate as students use the AI Twin chat'
        ],
        recommendations_for_aws: [
          'Start chatting with the AI Twin to generate real analytics data'
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Community Insights</h2>
        <p className="text-gray-600">
          What AWS Student Builders are asking about (last 7 days)
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white"
        >
          <Users className="w-8 h-8 mb-3 opacity-80" />
          <div className="text-3xl font-bold mb-1">{insights.total_students}</div>
          <div className="text-sm opacity-90">Active Students</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white"
        >
          <MessageCircle className="w-8 h-8 mb-3 opacity-80" />
          <div className="text-3xl font-bold mb-1">{insights.total_conversations}</div>
          <div className="text-sm opacity-90">Conversations</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white"
        >
          <TrendingUp className="w-8 h-8 mb-3 opacity-80" />
          <div className="text-3xl font-bold mb-1">{insights.total_questions}</div>
          <div className="text-sm opacity-90">Questions Answered</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white"
        >
          <AlertCircle className="w-8 h-8 mb-3 opacity-80" />
          <div className="text-3xl font-bold mb-1">{insights.avg_questions_per_student}</div>
          <div className="text-sm opacity-90">Avg Questions/Student</div>
        </motion.div>
      </div>

      {/* Content Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Trending Topics */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 shadow-lg border border-gray-200"
        >
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">Trending Topics</h3>
          </div>

          <div className="space-y-4">
            {insights.trending_topics.map((topic, index) => {
              const percentage = (topic.count / insights.total_questions) * 100;
              return (
                <div key={topic.topic}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {topic.topic}
                    </span>
                    <span className="text-xs text-gray-500">{topic.count} questions</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.6 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Confusion Points */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-6 shadow-lg border border-gray-200"
        >
          <div className="flex items-center gap-2 mb-6">
            <AlertCircle className="w-6 h-6 text-orange-600" />
            <h3 className="text-xl font-bold text-gray-900">Common Confusion Points</h3>
          </div>

          <div className="space-y-3">
            {insights.confusion_points.map((point, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="p-3 bg-orange-50 rounded-lg border border-orange-200"
              >
                <p className="text-sm text-gray-700">{point}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recommendations for AWS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200"
      >
        <div className="flex items-center gap-3 mb-4">
          <Lightbulb className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-bold text-gray-900">Recommendations for AWS</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Based on student questions, here's what would help improve the onboarding experience:
        </p>

        <div className="space-y-3">
          {insights.recommendations_for_aws.map((rec, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 + index * 0.1 }}
              className="flex items-start gap-3 p-4 bg-white rounded-lg border border-purple-200"
            >
              <div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>
              <p className="text-sm text-gray-700 flex-1">{rec}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Impact Statement */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-6 p-6 bg-green-50 border-2 border-green-200 rounded-xl text-center"
      >
        <p className="text-gray-700">
          <strong className="text-green-700">StudentPathOS Impact:</strong> AI-guided onboarding helps
          students navigate the AWS Builder Center, Skill Builder, and Console setup faster.
          Analytics update in real-time as students interact with the AI Twin.
        </p>
      </motion.div>
    </div>
  );
}
