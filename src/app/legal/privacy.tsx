import { LegalScreen } from "@/components/legal/legal-screen";
import { env } from "@/config/env";

export default function PrivacyScreen() {
  return <LegalScreen title="Privacy Policy" version="draft-1" canonicalUrl={env.privacyUrl} updated="August 17, 2026" sections={[
    { heading: "Information we process", body: "FixLens processes account details, appliance information, problem descriptions, diagnostic images, repair progress, subscription state, and reliability records needed to provide the service." },
    { heading: "Images", body: "Diagnostic images are treated as private. Production delivery uses authenticated ownership checks; image metadata and temporary originals are removed during processing." },
    { heading: "AI processing", body: "Images and descriptions may be sent to configured AI providers to generate an assessment. Outputs are validated and safety-filtered before display." },
    { heading: "Your choices", body: "You can change notification preferences, request support, or delete your FixLens account and associated application data from Profile." },
  ]} />;
}
