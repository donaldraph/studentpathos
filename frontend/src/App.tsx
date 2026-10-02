import { useState } from 'react';
import { JourneyTimeline } from './components/journey/JourneyTimeline';
import { ChatInterface } from './components/twin/ChatInterface';
import { CelebrationAnimation } from './components/celebration/CelebrationAnimation';
import { PortalComparison } from './components/portal/PortalComparison';
import { CommunityInsights } from './components/analytics/CommunityInsights';
import { useJourneyStore } from './stores/journeyStore';
import { Sparkles, MessageCircle, BarChart3, Layers } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'journey' | 'chat' | 'portals' | 'analytics'>('journey');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [celebration, setCelebration] = useState<{
    milestone: string;
    message: string;
  } | null>(null);

  const { journey } = useJourneyStore();

  const handleStepComplete = (step: number) => {
    const updatedJourney = { ...(journey || {}), current_step: step + 1 } as any;
    switch (step) {
      case 1: updatedJourney.builder_profile_created = true; break;
      case 2: updatedJourney.student_verified = true; break;
      case 3: updatedJourney.skillbuilder_claimed = true; break;
      case 4: updatedJourney.console_account_created = true; break;
      case 5: updatedJourney.fully_onboarded = true; break;
    }
    useJourneyStore.setState({ journey: updatedJourney });
    setCelebration({
      milestone: `step_${step}`,
      message: step === 5
        ? 'You are fully onboarded! Time to build something amazing!'
        : `Step ${step} complete! Keep going!`
    });
    setShowVerifyModal(false);
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
              onClick={() => setShowVerifyModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-shadow"
            >
              Update Progress
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
            onClick={() => setActiveTab('portals')}
            className={`px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'portals'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            Portals
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
        {activeTab === 'portals' && <PortalComparison />}
        {activeTab === 'analytics' && <CommunityInsights />}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-600">
          <p>
            Built with Claude Code using Amazon Bedrock • For AWS Student Builders
          </p>
        </div>
      </footer>

      {/* Progress Update Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Update Your Progress</h3>
            <p className="text-sm text-gray-600 mb-4">
              Mark a step as complete when you've finished it. This tracks your journey through the AWS Student Builder onboarding.
            </p>
            <div className="space-y-3">
              {[
                { step: 1, label: 'I signed up on AWS Builder Center', done: journey?.builder_profile_created, url: 'https://builder.aws.com' },
                { step: 2, label: 'I verified my student status', done: journey?.student_verified },
                { step: 3, label: 'I claimed Skill Builder Premium', done: journey?.skillbuilder_claimed, url: 'https://builder.aws.com/student-rewards' },
                { step: 4, label: 'I created my AWS Console account', done: journey?.console_account_created, url: 'https://console.aws.amazon.com' },
                { step: 5, label: 'I am ready to build!', done: journey?.fully_onboarded },
              ].map(({ step, label, done, url }) => (
                <div key={step} className="flex items-center gap-3">
                  <button
                    onClick={() => !done && handleStepComplete(step)}
                    disabled={done}
                    className={`flex-1 text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      done
                        ? 'bg-green-100 text-green-800 cursor-default'
                        : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-800'
                    }`}
                  >
                    {done ? '✓ ' : ''}{label}
                  </button>
                  {url && !done && (
                    <a href={url} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-blue-600 hover:underline whitespace-nowrap">
                      Go
                    </a>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowVerifyModal(false)}
              className="mt-4 w-full py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

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
