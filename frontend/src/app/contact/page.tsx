// Premium contact page with branded form, business details, and map location for The CalmTable.
'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import styles from './page.module.css';

interface ContactFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const initialForm: ContactFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
};

export default function ContactPage() {
  const [form, setForm] = useState<ContactFormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const isValid = useMemo(() => {
    return (
      form.firstName.trim() &&
      form.lastName.trim() &&
      form.email.trim() &&
      form.phone.trim() &&
      form.subject.trim() &&
      form.message.trim()
    );
  }, [form]);

  function updateField<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit() {
    if (!isValid) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSent(true);
      toast.success('Message sent successfully.');
      setForm(initialForm);
    }, 900);
  }

  return (
    <div className={styles.pageWrap}>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionEyebrow}>Contact Us</p>
        <h1 className={styles.sectionTitle}>
          Get in Touch <em>with Us</em>
        </h1>
      </div>

      <div className={styles.contactGrid}>
        <div className={styles.formCard}>
          {!sent ? (
            <div>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="first-name" className={styles.formLabel}>
                    First Name <span className={styles.req}>*</span>
                  </label>
                  <input
                    id="first-name"
                    className={styles.formInput}
                    type="text"
                    placeholder="Ex. John"
                    value={form.firstName}
                    onChange={(event) => updateField('firstName', event.target.value)}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="last-name" className={styles.formLabel}>
                    Last Name <span className={styles.req}>*</span>
                  </label>
                  <input
                    id="last-name"
                    className={styles.formInput}
                    type="text"
                    placeholder="Ex. Doe"
                    value={form.lastName}
                    onChange={(event) => updateField('lastName', event.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="email" className={styles.formLabel}>
                    Email <span className={styles.req}>*</span>
                  </label>
                  <input
                    id="email"
                    className={styles.formInput}
                    type="email"
                    placeholder="example@gmail.com"
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="phone" className={styles.formLabel}>
                    Phone <span className={styles.req}>*</span>
                  </label>
                  <input
                    id="phone"
                    className={styles.formInput}
                    type="tel"
                    placeholder="Enter phone number"
                    value={form.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formFieldFull}>
                <label htmlFor="subject" className={styles.formLabel}>
                  Subject <span className={styles.req}>*</span>
                </label>
                <input
                  id="subject"
                  className={styles.formInput}
                  type="text"
                  placeholder="Enter here..."
                  value={form.subject}
                  onChange={(event) => updateField('subject', event.target.value)}
                />
              </div>

              <div className={styles.formFieldFull}>
                <label htmlFor="message" className={styles.formLabel}>
                  Your Message <span className={styles.req}>*</span>
                </label>
                <textarea
                  id="message"
                  className={styles.formTextarea}
                  placeholder="Enter here..."
                  value={form.message}
                  onChange={(event) => updateField('message', event.target.value)}
                />
              </div>

              <button
                type="button"
                className={styles.formSubmit}
                onClick={handleSubmit}
                disabled={submitting}
                aria-label="Send contact message"
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          ) : (
            <div className={styles.formSuccess}>
              <div className={styles.successIcon}>✓</div>
              <p>Message Sent!</p>
              <span>Thank you for reaching out. We&apos;ll get back to you within 24 hours.</span>
              <button
                type="button"
                className={styles.formSubmit}
                onClick={() => setSent(false)}
                aria-label="Send another message"
              >
                Send Another Message
              </button>
            </div>
          )}
        </div>

        <aside className={styles.infoCard}>
          <div className={styles.infoSection}>
            <h3 className={styles.infoSectionTitle}>Address</h3>
            <p className={styles.infoLine}>Near Simso Filling Station</p>
            <p className={styles.infoLine}>Luwinga, Mzuzu, Malawi</p>
          </div>

          <div className={styles.infoDivider} />

          <div className={styles.infoSection}>
            <h3 className={styles.infoSectionTitle}>Contact</h3>
            <p className={styles.infoLine}>
              <strong>Phone:</strong> +265 999 000 000
            </p>
            <p className={styles.infoLine}>
              <strong>Email:</strong> hello@calmtable.mw
            </p>
            <p className={styles.infoLine}>
              <strong>WhatsApp:</strong> +265 888 000 000
            </p>
          </div>

          <div className={styles.infoDivider} />

          <div className={styles.infoSection}>
            <h3 className={styles.infoSectionTitle}>Opening Hours</h3>
            <div className={styles.hoursRow}>
              <span className={styles.day}>Monday - Friday</span>
              <span>07:00 - 21:00</span>
            </div>
            <div className={styles.hoursRow}>
              <span className={styles.day}>Saturday</span>
              <span>08:00 - 22:00</span>
            </div>
            <div className={styles.hoursRow}>
              <span className={styles.day}>Sunday</span>
              <span className={styles.closed}>Closed</span>
            </div>
          </div>

          <div className={styles.infoDivider} />

          <div className={styles.infoSection}>
            <h3 className={styles.infoSectionTitle}>Stay Connected</h3>
            <div className={styles.socialRow}>
              <Link href="#" className={styles.socialIcon} aria-label="Facebook">
                f
              </Link>
              <Link href="#" className={styles.socialIcon} aria-label="Instagram">
                i
              </Link>
              <Link href="#" className={styles.socialIcon} aria-label="Twitter">
                x
              </Link>
              <Link href="#" className={styles.socialIcon} aria-label="WhatsApp">
                w
              </Link>
              <Link href="#" className={styles.socialIcon} aria-label="TikTok">
                t
              </Link>
            </div>
          </div>
        </aside>
      </div>

      <section className={styles.mapSection}>
        <iframe
          src="https://maps.google.com/maps?q=Simso%20Filling%20Station%2C%20Luwinga%2C%20Mzuzu%2C%20Malawi&t=&z=15&ie=UTF8&iwloc=&output=embed"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="The CalmTable location map"
        />
        <div className={styles.mapLabel}>The CalmTable - Near Simso Filling Station, Luwinga</div>
      </section>

      <footer className={styles.footer}>
        <p className={styles.footerCopy}>© 2026 THE CALMTABLE. DINE WITH DIGNITY.</p>
        <div className={styles.footerSocials}>
          <Link href="#" aria-label="Instagram">
            ◆
          </Link>
          <Link href="#" aria-label="Twitter">
            ◆
          </Link>
          <Link href="#" aria-label="Facebook">
            ◆
          </Link>
          <Link href="#" aria-label="TikTok">
            ◆
          </Link>
        </div>
      </footer>
    </div>
  );
}
