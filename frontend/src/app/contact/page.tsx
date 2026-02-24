// Contact page for location, hours, and direct reservation support channels.
import { Card } from '@/components/card';
import { SectionHeading } from '@/components/section-heading';

export default function ContactPage() {
  return (
    <section className="page-shell py-10 sm:py-14">
      <SectionHeading
        eyebrow="Contact"
        title="Get In Touch"
        description="Visit us near Simso Filling Station, Luwinga, Mzuzu, Malawi for reservations and events."
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card elevated className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Location</p>
          <p className="text-sm text-ink/85">Near Simso Filling Station, Luwinga, Mzuzu, Malawi</p>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Hours</p>
          <p className="text-sm text-ink/85">Monday to Sunday: 5:00 PM - 10:00 PM</p>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Phone</p>
          <p className="text-sm text-ink/85">+265 000 000 000</p>
        </Card>

        <div className="overflow-hidden rounded-2xl border border-woodAccent/30 shadow-soft">
          <iframe
            title="The CalmTable map location"
            src="https://maps.google.com/maps?q=Simso%20Filling%20Station%2C%20Luwinga%2C%20Mzuzu%2C%20Malawi&t=&z=15&ie=UTF8&iwloc=&output=embed"
            className="h-[340px] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
}
