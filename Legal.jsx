import React from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

const LEGAL_DOCS = {
  terms: {
    title: "Terms of Service",
    body: `Effective Date: 2026

Loré is a creative storytelling platform intended for users aged 18 and over. By using this app, you confirm that you meet this requirement.

Loré provides AI-generated conversations and tools for users to create and interact with fictional characters. These interactions are not real and should not be treated as communication with real individuals.

You are responsible for all content you create, upload, or share within the app. This includes text, images, audio, and any other media.

You must not upload or share content that is illegal, harmful, exploitative, or infringes on the rights of others. This includes impersonation, misuse of copyrighted material, and any prohibited content.

Loré allows mature storytelling, including strong language and emotional themes. However, content that promotes harm, exploitation, or illegal activity is not permitted.

Loré reserves the right to remove content, restrict features, or suspend accounts where necessary to maintain safety and compliance.

AI-generated responses may be inaccurate, fictional, or unpredictable. They should not be relied on for professional advice, including medical, legal, financial, or mental health matters.

To the extent permitted by law, Loré is not liable for user-generated content, AI-generated responses, or interactions within the app.

These Terms are governed by the laws of New Zealand. Users in other regions may have additional rights under their local laws.`,
  },
  privacy: {
    title: "Privacy Policy",
    body: `Effective Date: 2026

Loré collects and uses data to operate the app and improve user experience.

We may collect:
• Account information
• Profile data
• Chat content
• Uploaded media (images and audio)
• Usage data
• Device information

This data is used to:
• Operate the app
• Generate AI responses
• Improve performance
• Support safety and moderation systems

Loré does not sell personal data.

Uploaded media and audio are used only for in-app functionality and are not used for biometric identification or verification.

Users may:
• Access their data
• Delete their data
• Delete their account

Some data may be retained temporarily for legal compliance, safety enforcement, or system integrity.

Data may be processed or stored in countries outside your location, with reasonable safeguards in place.`,
  },
  community: {
    title: "Community Guidelines",
    body: `Loré is a creative and respectful environment.

Allowed:
• Fictional storytelling
• Character-based interaction
• Emotional and narrative content

Not allowed:
• Harassment or threats
• Hate speech
• Graphic violence
• Illegal activity
• Exploitative content

Public content rules (Social Loré, when launched):
• No minors under any circumstances
• No nudity or explicit content
• No harmful or offensive material

Users can report violations at any time.`,
  },
  media: {
    title: "Media Upload Policy",
    body: `Users may upload images and media within the app.

Private content:
Allowed if it is non-exploitative and used within a safe context.

Public content:
• Must not include minors
• Must not include nudity
• Must not include harmful material

Accepted formats: JPG, PNG, WEBP
Max size: 10MB per file`,
  },
  voice: {
    title: "Voice & Audio Policy",
    body: `Users may upload or record audio for creative use.

By uploading audio, you confirm that you own the content or have permission to use it.

You must not use audio to impersonate real individuals in a misleading or harmful way.

Loré does not verify voice identity.

Audio is used for playback only.

Loré does NOT use:
• Voice cloning
• Biometric identification
• External voice processing services

Accepted formats: MP3, M4A, WAV
Max duration: 60 seconds
Max file size: 10MB`,
  },
  ai: {
    title: "AI Disclaimer",
    body: `Loré uses artificial intelligence to generate responses.

AI-generated content may be fictional, inaccurate, or unpredictable.

Interactions within the app are not real and should not be treated as communication with real individuals.

Loré should not be used for real-world decision-making or professional advice.`,
  },
};

export const LEGAL_NAV = [
  { id: "terms", label: "Terms of Service" },
  { id: "privacy", label: "Privacy Policy" },
  { id: "community", label: "Community Guidelines" },
  { id: "media", label: "Media Policy" },
  { id: "voice", label: "Voice Policy" },
  { id: "ai", label: "AI Disclaimer" },
];

export default function Legal() {
  const { doc } = useParams();
  const nav = useNavigate();
  const d = LEGAL_DOCS[doc];
  if (!d) {
    return (
      <div className="min-h-screen bg-lore p-6">
        <p className="lore-taupe">Document not found.</p>
        <Link to="/legal/terms" className="lore-gold underline">Read Terms</Link>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-lore" data-testid={`legal-${doc}`}>
      <div className="sticky top-0 z-10 bg-lore/90 backdrop-blur-md border-b border-lore">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={() => nav(-1)} className="p-2 -ml-2 lore-taupe hover:lore-cream rounded-lg" data-testid="legal-back" aria-label="Back">
            <ChevronLeft className="w-5 h-5"/>
          </button>
          <h1 className="text-xl font-semibold lore-cream">{d.title}</h1>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-6 sm:px-8 py-8 pb-24">
        <article className="lore-cream/90 leading-[1.8] text-[15px] whitespace-pre-wrap">{d.body}</article>
      </div>
    </div>
  );
}
