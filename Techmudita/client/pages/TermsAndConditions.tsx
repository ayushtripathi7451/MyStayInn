import { Layout } from '@/components/Layout';

export default function TermsAndConditions() {
  return (
    <Layout>
      <div className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              Terms & <span className="text-accent">Conditions</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              MyStayinn – Operated by TechMudita Pvt Ltd
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-invert max-w-none space-y-8">
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Platform Role
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                MyStayInnis a technology-based intermediary platform operated by TechMudita Pvt Ltd, 
                connecting PG/Hostel owners ("Admins") with customers ("Users"). MyStayInndoes not own, 
                manage, or operate any PG or hostel property.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Eligibility
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Users must be 18 years or above and provide accurate and lawful information during 
                registration and use of the platform.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Listings & Bookings
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                All property details, pricing, availability, and rules are provided by the respective 
                PG/Hostel owners. MyStayInnis not responsible for inaccuracies, service quality, or 
                changes made by owners.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Payments & Refunds
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Payments, if enabled, are processed through RBI-approved third-party payment gateways. 
                Refunds, cancellations, deposits, and notice periods are governed by the respective 
                property's policies.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                User Conduct
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Users must comply with property rules, local laws, and safety regulations. Any misuse, 
                false information, or illegal activity may lead to account suspension or termination.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Limitation of Liability
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                MyStayInnand TechMudita Pvt Ltd shall not be liable for disputes, losses, damages, injuries, 
                or incidents occurring between Users and PG/Hostel owners.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Governing Law
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                These Terms are governed by the laws of India.
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
