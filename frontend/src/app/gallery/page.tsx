// Gallery page showing restaurant and food images
'use client';

import Image from 'next/image';

const galleryImages = [
    { src: '/images/gallery-1.png', alt: 'Restaurant interior ambiance' },
    { src: '/images/gallery-2.png', alt: 'Delicious plated dish' },
    { src: '/images/gallery-3.png', alt: 'Fresh ingredients preparation' },
    { src: '/images/gallery-4.svg', alt: 'Elegant table setting' },
    { src: '/images/gallery-5.svg', alt: 'Chef preparing food' },
    { src: '/images/hero-placeholder.png', alt: 'Restaurant exterior' },
    { src: '/images/about-image.png', alt: 'Our team' },
    { src: '/images/dish-fish.png', alt: 'Fresh fish dish' },
    { src: '/images/dish-meat.png', alt: 'Premium meat selection' },
    { src: '/images/dish-snack.png', alt: 'Savory snacks' },
    { src: '/images/reservation-bg.png', alt: 'Cozy dining area' },
];

export default function GalleryPage() {
    return (
        <div className="min-h-screen bg-cream dark:bg-gray-900 pt-20">
            <div className="page-shell py-12">
                <header className="mb-12 text-center">
                    <h1 className="font-heading text-4xl font-bold uppercase tracking-[0.1em] text-woodAccent dark:text-gray-200">
                        Our Gallery
                    </h1>
                    <p className="mt-4 text-ink dark:text-gray-400 max-w-2xl mx-auto">
                        Experience the ambiance of The CalmTable through our curated collection of photos
                        showcasing our restaurant, dishes, and memorable moments.
                    </p>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {galleryImages.map((image, index) => (
                        <div
                            key={index}
                            className="relative aspect-[4/3] overflow-hidden rounded-lg bg-woodAccent/10 dark:bg-gray-800"
                        >
                            <Image
                                src={image.src}
                                alt={image.alt}
                                fill
                                className="object-cover transition-transform duration-500 hover:scale-105"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                        </div>
                    ))}
                </div>

                <footer className="mt-16 border-t border-woodAccent/20 py-6">
                    <div className="flex flex-col gap-3 text-[11px] uppercase tracking-[0.1em] text-muted md:flex-row md:items-center md:justify-between">
                        <p>© 2026 The CalmTable. Dine with Dignity.</p>
                        <div className="flex gap-5 text-woodAccent/60">
                            <span>Instagram</span>
                            <span>Facebook</span>
                            <span>TikTok</span>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
