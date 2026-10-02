import { motion } from 'framer-motion';
import { Upload, Sparkles, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface Portal {
  name: string;
  purpose: string;
  url: string;
  color: string;
  features: string[];
}

const portals: Portal[] = [
  {
    name: 'AWS Builder Center',
    purpose: 'Community, Hackathons, Events',
    url: 'https://builder.aws.com',
    color: 'from-blue-500 to-blue-700',
    features: [
      'Join AWS Student Builder Groups',
      'Participate in hackathons',
      'Earn badges and certificates',
      'Connect with other builders',
      'Access exclusive events'
    ]
  },
  {
    name: 'AWS Skill Builder',
    purpose: 'Courses, Labs, Certifications',
    url: 'https://skillbuilder.aws',
    color: 'from-purple-500 to-purple-700',
    features: [
      'Free AWS training courses',
      'Hands-on labs (500+ labs)',
      'Certification exam prep',
      'Learning paths for roles',
      'Gamified learning experience'
    ]
  },
  {
    name: 'AWS Console',
    purpose: 'Build & Deploy Services',
    url: 'https://console.aws.amazon.com',
    color: 'from-orange-500 to-orange-700',
    features: [
      'Deploy actual AWS services',
      'Manage your cloud resources',
      'Monitor usage and costs',
      'Set up IAM permissions',
      'Access 200+ services'
    ]
  }
];

export function PortalComparison() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setUploadedImage(dataUrl);
      setIsAnalyzing(true);
      setAnalysisResult(null);

      try {
        const base64 = dataUrl.split(',')[1];
        const API_URL = 'https://iqs70qndul.execute-api.us-east-1.amazonaws.com/prod';
        const resp = await fetch(`${API_URL}/twin/screenshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: base64 })
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const raw = await resp.json();
        const data = raw?.body ? JSON.parse(raw.body) : raw;

        const portal = data.portal_type || 'Unknown';
        const confidence = data.confidence || 0;
        const guide = data.guide;

        let summary = `${portal}`;
        if (confidence > 0) summary += ` (${confidence}% confidence)`;

        if (guide) {
          if (guide.what_this_is) summary += `\n\n${guide.what_this_is}`;
          if (guide.what_you_see) summary += `\n\nWhat you're looking at:\n${guide.what_you_see}`;
          if (guide.what_you_can_do?.length) {
            summary += '\n\nWhat you can do here:';
            guide.what_you_can_do.forEach((step: string, i: number) => {
              summary += `\n${i + 1}. ${step}`;
            });
          }
          if (guide.next_step) summary += `\n\nRecommended next step: ${guide.next_step}`;
        } else {
          const texts = (data.detected_text || []).slice(0, 5).join(', ');
          if (texts) summary += `\n\nDetected text: ${texts}`;
        }

        setAnalysisResult(summary);
      } catch (err) {
        console.error('Screenshot analysis error:', err);
        setAnalysisResult('Could not analyze the screenshot right now. Please try again in a moment.');
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Upload Screenshot Section */}
      <div className="mb-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 border-2 border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Confused Which Portal You're On?</h2>
        </div>
        <p className="text-gray-600 mb-6">
          Upload a screenshot and I'll tell you which AWS portal you're looking at and what you can do there.
        </p>

        <label className="block">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="cursor-pointer border-2 border-dashed border-blue-300 rounded-xl p-8 bg-white hover:bg-blue-50 transition-colors flex flex-col items-center justify-center"
          >
            <Upload className="w-12 h-12 text-blue-600 mb-3" />
            <span className="text-blue-600 font-medium">Click to upload screenshot</span>
            <span className="text-sm text-gray-500 mt-1">PNG, JPG up to 10MB</span>
          </motion.div>
        </label>

        {/* Analysis Result */}
        {uploadedImage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-white rounded-xl p-6 border border-gray-200"
          >
            <div className="flex gap-6">
              <img
                src={uploadedImage}
                alt="Uploaded screenshot"
                className="w-48 h-32 object-cover rounded-lg border border-gray-200"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Analysis Result</h3>
                {isAnalyzing ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Analyzing your screenshot...</span>
                  </div>
                ) : (
                  <p className="text-gray-700 whitespace-pre-line text-sm leading-relaxed">{analysisResult}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Portal Comparison Grid */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">The 3 Main AWS Portals</h2>
        <p className="text-gray-600 mb-8">
          AWS has different portals for different purposes. Here's what each one does:
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {portals.map((portal, index) => (
          <motion.div
            key={portal.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow"
          >
            {/* Portal Header */}
            <div className={`bg-gradient-to-r ${portal.color} p-6 text-white`}>
              <h3 className="text-xl font-bold mb-2">{portal.name}</h3>
              <p className="text-sm opacity-90">{portal.purpose}</p>
            </div>

            {/* Features List */}
            <div className="p-6">
              <ul className="space-y-3 mb-6">
                {portal.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Visit Link */}
              <a
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800 font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Visit Portal
              </a>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Tip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Quick Tip</h4>
            <p className="text-gray-700 text-sm">
              Start with <strong>Builder Center</strong> to join your university's student group and find hackathons.
              Use <strong>Skill Builder</strong> to learn AWS basics with free courses.
              Then use the <strong>Console</strong> to actually build projects!
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
