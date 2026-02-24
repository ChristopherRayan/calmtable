// Profile settings page allowing avatar upload and editable name/phone fields.
'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { SectionHeading } from '@/components/section-heading';
import { shouldSkipImageOptimization } from '@/lib/image';

const schema = z.object({
  first_name: z.string().trim().max(150, 'First name is too long.'),
  last_name: z.string().trim().max(150, 'Last name is too long.'),
  phone: z.string().trim().max(30, 'Phone number is too long.'),
});

type ProfileForm = z.infer<typeof schema>;

export default function ProfilePage() {
  const { user, loading, updateProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [clearAvatar, setClearAvatar] = useState(false);

  const currentImageUrl = useMemo(() => {
    if (selectedImage) {
      return URL.createObjectURL(selectedImage);
    }
    if (clearAvatar) {
      return '';
    }
    return user?.profile_image_url ?? '';
  }, [clearAvatar, selectedImage, user?.profile_image_url]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileForm>({
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
    },
  });

  useEffect(() => {
    if (!user) {
      return;
    }
    reset({
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      phone: user.phone ?? '',
    });
  }, [reset, user]);

  useEffect(() => {
    return () => {
      if (selectedImage) {
        URL.revokeObjectURL(currentImageUrl);
      }
    };
  }, [currentImageUrl, selectedImage]);

  const onSubmit = handleSubmit(async (values) => {
    const validated = schema.safeParse(values);
    if (!validated.success) {
      toast.error(validated.error.issues[0]?.message ?? 'Invalid profile details.');
      return;
    }

    try {
      setSubmitting(true);
      const updated = await updateProfile({
        ...validated.data,
        profile_image: selectedImage,
        clear_profile_image: clearAvatar,
      });

      reset({
        first_name: updated.first_name ?? '',
        last_name: updated.last_name ?? '',
        phone: updated.phone ?? '',
      });
      setSelectedImage(null);
      setClearAvatar(false);
      toast.success('Profile updated successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update profile.');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="page-shell py-10">
      <SectionHeading
        eyebrow="Account Settings"
        title="Your Profile"
        description="Update your name, phone number, and profile image. Email is locked for account security."
      />

      <Card elevated className="mt-6 space-y-6">
        {loading ? (
          <p className="text-sm text-muted">Loading profile...</p>
        ) : (
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border border-woodAccent/40 bg-cream">
                {currentImageUrl ? (
                  <Image
                    src={currentImageUrl}
                    alt="Profile avatar preview"
                    fill
                    className="object-cover"
                    sizes="96px"
                    unoptimized={shouldSkipImageOptimization(currentImageUrl)}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.14em] text-muted">
                    No image
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="profile-image"
                  className="inline-flex cursor-pointer rounded-full border border-woodAccent/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-tableBrown hover:bg-woodAccent/10"
                >
                  Upload Profile Image
                </label>
                <input
                  id="profile-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setSelectedImage(file);
                    if (file) {
                      setClearAvatar(false);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setClearAvatar(true);
                  }}
                  className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#E07065]"
                >
                  Remove Current Image
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="first_name" className="text-sm font-medium text-tableBrown">
                  First Name
                </label>
                <input
                  id="first_name"
                  {...register('first_name')}
                  className="h-11 w-full rounded-xl border border-woodAccent bg-cream px-3 text-sm text-ink"
                />
                {errors.first_name && <p className="text-xs text-[#E07065]">{errors.first_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="last_name" className="text-sm font-medium text-tableBrown">
                  Last Name
                </label>
                <input
                  id="last_name"
                  {...register('last_name')}
                  className="h-11 w-full rounded-xl border border-woodAccent bg-cream px-3 text-sm text-ink"
                />
                {errors.last_name && <p className="text-xs text-[#E07065]">{errors.last_name.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="phone" className="text-sm font-medium text-tableBrown">
                  Phone Number
                </label>
                <input
                  id="phone"
                  {...register('phone')}
                  className="h-11 w-full rounded-xl border border-woodAccent bg-cream px-3 text-sm text-ink"
                />
                {errors.phone && <p className="text-xs text-[#E07065]">{errors.phone.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="email_locked" className="text-sm font-medium text-tableBrown">
                  Email (Locked)
                </label>
                <input
                  id="email_locked"
                  value={user?.email ?? ''}
                  readOnly
                  className="h-11 w-full cursor-not-allowed rounded-xl border border-woodAccent/40 bg-warmGray px-3 text-sm text-muted"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting} aria-label="Save profile changes">
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
