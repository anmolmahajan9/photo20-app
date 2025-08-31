
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Upload, Wand2, Star, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/home">
                <h1 className="text-2xl font-bold font-headline text-primary">Photo20</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost">
                <Link href={user ? '/dashboard' : '/login'}>
                  {user ? 'Dashboard' : 'Sign In'}
                </Link>
              </Button>
              <Button asChild>
                <Link href={user ? '/dashboard' : '/login'}>
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 text-center">
          <div className="container mx-auto px-4 z-10 relative">
            <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tight">
              Create Stunning Product Photos with AI
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground">
              Transform your simple product images into professional, studio-quality shots in seconds. No photographer needed.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button asChild size="lg" className="text-lg py-7 px-8">
                <Link href={user ? '/dashboard' : '/login'}>
                  Try Photo20 Now <Wand2 className="ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Before & After Section */}
        <section className="py-16 bg-card border-y">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl md:text-4xl font-bold font-headline mb-2">See The Magic</h2>
                <p className="text-muted-foreground text-lg mb-10">From bland to brilliant, instantly.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
                    <div className="text-center">
                        <h3 className="text-2xl font-semibold mb-4 text-muted-foreground font-headline">Before</h3>
                        <div className="relative aspect-square w-full max-w-md mx-auto rounded-xl shadow-lg overflow-hidden border">
                            <Image src="https://picsum.photos/id/1062/600/600" alt="Before - a camera on a plain background" width={600} height={600} className="object-cover" data-ai-hint="product camera" />
                        </div>
                    </div>
                    <div className="text-center">
                        <h3 className="text-2xl font-semibold mb-4 text-primary font-headline">After</h3>
                         <div className="relative aspect-square w-full max-w-md mx-auto rounded-xl shadow-2xl overflow-hidden border-2 border-primary">
                            <Image src="https://picsum.photos/id/250/600/600" alt="After - a professionally shot camera" width={600} height={600} className="object-cover" data-ai-hint="professional camera" />
                        </div>
                    </div>
                </div>
            </div>
        </section>


        {/* How It Works Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-headline mb-12">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-3xl mx-auto">
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 text-primary mb-4">
                  <Upload className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">1. Upload Photo</h3>
                <p className="text-muted-foreground">Start with any picture of your product. A simple phone photo works perfectly.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 text-primary mb-4">
                  <Star className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">2. Refine &amp; Download</h3>
                <p className="text-muted-foreground">Select your favorite, refine it with simple text prompts, and download.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-card border-y">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl md:text-4xl font-bold font-headline text-center mb-12">The Perfect Shot, Every Time</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
                    {features.map(feature => (
                        <div key={feature.title} className="flex items-start space-x-4">
                            <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-accent/20 text-accent mt-1">
                                <CheckCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">{feature.title}</h3>
                                <p className="text-muted-foreground mt-1">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>


        {/* CTA Section */}
        <section className="py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-headline">Ready to Elevate Your Product Photos?</h2>
            <p className="mt-4 max-w-xl mx-auto text-lg text-muted-foreground">
              Stop settling for mediocre images. Start creating professional product photography today.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="text-lg py-7 px-8">
                <Link href={user ? '/dashboard' : '/login'}>
                  Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t">
        <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Photo20. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

const features = [
    {
        title: "AI-Powered Scenes",
        description: "Generate backgrounds and lighting that make your product shine.",
    },
    {
        title: "Instant Results",
        description: "Go from upload to amazing photos in under a minute.",
    },
    {
        title: "Cost-Effective",
        description: "Save thousands on photographers and professional studios.",
    },
    {
        title: "Easy to Use",
        description: "No special skills needed. If you can click a button, you can use Photo20."
    }
];
