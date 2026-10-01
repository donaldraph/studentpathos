import { useState, useEffect } from 'react';
import { JourneyTimeline } from './components/journey/JourneyTimeline';
import { ChatInterface } from './components/twin/ChatInterface';
import { CelebrationAnimation } from './components/celebration/CelebrationAnimation';
import { useJourneyStore } from './stores/journeyStore';
import { Sparkles, MessageCircle, BarChart3 } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'journey' | 'chat' | 'analytics'>('journey');
  const [celebration, setCelebration] = useState<{
    milestone: string;
    message: string;
  } | null>(null);

  const { journey, fetchJourney, runVerification } = useJourneyStore();

  useEffect(() => {
    // Mock user ID for demo - would come from auth in production
    const mockUserId = 'demo-user-123';
    fetchJourney(mockUserId);
  }, []);

  const handleRunVerification = async () => {
    const mockUserId = 'demo-user-123';
    await runVerification(mockUserId);

    // Trigger celebration if milestone hit
    if (journey?.account_exists && !journey?.edu_email_verified) {
      setCelebration({
        milestone: 'account_created',
        message: 'Nice! Your AWS account is ready. Welcome to the builder community!'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">StudentPathOS</h1>
                <p className="text-xs text-gray-500">Your AI Twin for AWS Onboarding</p>
              </div>
            </div>

            <button
              onClick={handleRunVerification}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-shadow"
            >
              Run Verification
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200 w-fit">
          <button
            onClick={() => setActiveTab('journey')}
            className={`px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'journey'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Journey
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            AI Twin
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'journey' && <JourneyTimeline />}
        {activeTab === 'chat' && <ChatInterface />}
        {activeTab === 'analytics' && (
          <div className="bg-white rounded-lg p-8 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Community Analytics
            </h3>
            <p className="text-gray-600">
              Coming soon: Insights from your AWS Student Builder Group
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-600">
          <p>
            Built with Claude Code (via Kiro) • Powered by Amazon Bedrock • For
            AWS Student Builders at Unizik
          </p>
        </div>
      </footer>

      {/* Celebration Overlay */}
      {celebration && (
        <CelebrationAnimation
          milestone={celebration.milestone}
          message={celebration.message}
          onComplete={() => setCelebration(null)}
        />
      )}
    </div>
  );
}

export default App;
