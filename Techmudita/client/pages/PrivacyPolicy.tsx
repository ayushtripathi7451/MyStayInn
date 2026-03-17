import { Layout } from '@/components/Layout';

export default function PrivacyPolicy() {
  return (
    <Layout>
      <div className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              Privacy <span className="text-accent">Policy</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              MyStayinn – TechMudita Pvt Ltd
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-invert max-w-none space-y-8">
            {/* Intro */}
            <section>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Your privacy is important to us. This Privacy Policy explains how we collect, use, 
                and protect your information.
              </p>
            </section>

            {/* Section 1 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Information We Collect
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We may collect basic personal information such as name, contact details, ID information 
                (if required), and usage data to provide our services.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Use of Information
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                Collected data is used only for:
              </p>
              <ul className="space-y-3 text-lg text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-accent mt-1">•</span>
                  <span>Account creation and management</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent mt-1">•</span>
                  <span>Booking communication</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent mt-1">•</span>
                  <span>Safety, verification, and legal compliance</span>
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Data Protection
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                TechMudita Pvt Ltd follows reasonable security practices in accordance with the 
                Information Technology Act, 2000 and applicable rules.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Data Sharing
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                We do not sell or misuse personal data. Information may be shared only with:
              </p>
              <ul className="space-y-3 text-lg text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-accent mt-1">•</span>
                  <span>PG/Hostel owners for booking purposes</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent mt-1">•</span>
                  <span>Government or legal authorities when required by law</span>
                </li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                User Consent
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                By using MyStay, you consent to the collection and use of your information as 
                described in this Privacy Policy.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Policy Updates
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                This Privacy Policy may be updated from time to time. Continued use of the platform 
                implies acceptance of the updated policy.
              </p>
            </section>

            {/* Divider */}
            <div className="border-t border-border py-8" />

            {/* Footer Note */}
            <p className="text-muted-foreground text-base">
              Last Updated: 2025 | © TechMudita Pvt Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
