// Premium contact page with branded form, business details, and map location for The CalmTable.
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { z } from 'zod';

import styles from './page.module.css';
import { defaultFrontendSettings } from '@/lib/frontend-settings';
import { fetchFrontendSettings } from '@/lib/services';
import type { FrontendContentPayload } from '@/lib/types';

const contactSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(100, 'First name is too long.'),
  lastName: z.string().trim().min(1, 'Last name is required.').max(100, 'Last name is too long.'),
  email: z.string().trim().min(1, 'Email is required.').email('Please enter a valid email address.'),
  phone: z.string().trim().min(7, 'Please enter a valid phone number.').max(30, 'Phone number is too long.'),
  subject: z.string().trim().min(1, 'Subject is required.').max(200, 'Subject is too long.'),
  message: z.string().trim().min(10, 'Message must be at least 10 characters.').max(2000, 'Message must be 2000 characters or less.'),
});

type ContactForm = z.infer<typeof contactSchema>;

/** Empty form state - used for initial state and reset after submission */
const emptyContactForm: ContactForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
};

export default function ContactPage() {
  const [settings, setSettings] = useState<FrontendContentPayload>(defaultFrontendSettings);
  const [form, setForm] = useState<ContactForm>(emptyContactForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  function updateField<K extends keyof ContactForm>(key: K, value: ContactForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  }

  function handleSubmit() {
    const validated = contactSchema.safeParse(form);
    if (!validated.success) {
      const fieldErrors: Partial<Record<keyof ContactForm, string>> = {};
      validated.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof ContactForm;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);
      toast.error('Please fix the form errors.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSent(true);
      toast.success('Message sent successfully.');
      setForm(emptyContactForm);
    }, 900);
  }

  const contactContent = settings.contact;

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      try {
        const data = await fetchFrontendSettings();
        if (active) {
          setSettings(data);
        }
      } catch (_error) {
        // Keep fallback content.
      }
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

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
            <p className={styles.infoLine}>{contactContent.address_line_1}</p>
            <p className={styles.infoLine}>{contactContent.address_line_2}</p>
          </div>

          <div className={styles.infoDivider} />

          <div className={styles.infoSection}>
            <h3 className={styles.infoSectionTitle}>Contact</h3>
            <p className={styles.infoLine}>
              <strong>Phone:</strong> {contactContent.phone}
            </p>
            <p className={styles.infoLine}>
              <strong>Email:</strong> {contactContent.email}
            </p>
            <p className={styles.infoLine}>
              <strong>WhatsApp:</strong> {contactContent.whatsapp}
            </p>
          </div>

          <div className={styles.infoDivider} />

          <div className={styles.infoSection}>
            <h3 className={styles.infoSectionTitle}>Opening Hours</h3>
            {contactContent.opening_hours.map((row) => (
              <div key={row.day} className={styles.hoursRow}>
                <span className={styles.day}>{row.day}</span>
                <span className={row.hours.toLowerCase().includes('closed') ? styles.closed : undefined}>
                  {row.hours}
                </span>
              </div>
            ))}
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
          src={contactContent.map_embed_url}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="The CalmTable location map"
        />
        <div className={styles.mapLabel}>
          {settings.brand_name} - {contactContent.address_line_1}
        </div>
      </section>

      <footer className={styles.footer}>
        <p className={styles.footerCopy}>© 2026 {settings.brand_name}. {settings.brand_tagline}.</p>
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
