'use client';

import { useState } from 'react';
import type { ChangeEvent } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { handleGenerateImage } from './actions';
import { Upload, Download, Wand2, Image as ImageIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const themes = [
  {
    name: 'Studio Lighting',
    prompt: 'A professional studio product shot with clean, soft lighting, a neutral background, and a sharp focus on the product. The image should look like it belongs in a high-end catalog.',
  },
  {
    name: 'Outdoor',
    prompt: 'The product placed in a natural outdoor setting, with beautiful natural light (e.g., golden hour). The background should be slightly blurred to emphasize the product. The scene should feel authentic and aspirational.',
  },
  {
    name: 'Minimalist',
    prompt: 'A minimalist composition with the product as the single focal point. Use a solid, light-colored background, simple geometric shadows, and a clean, uncluttered aesthetic.',
  },
  {
    name: 'Vibrant & Colorful',
    prompt: 'A dynamic and energetic shot. Place the product against a brightly colored background or amidst colorful props. The lighting should be bright and make the colors pop. The mood should be playful and eye-catching.',
  },
  {
    name: 'Luxury & Elegant',
    prompt: 'Create a luxurious and elegant scene for the product. Use dark, moody lighting, rich textures like silk or marble, and a sense of sophistication and exclusivity.',
  },
];

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>(themes[0].prompt);
  const [customDescription, setCustomDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setOriginalImage(event.target?.result as string);
        setGeneratedImage(null); // Reset generated image on new upload
      };
      reader.readAsDataURL(file);
    }
  };

  const generateImage = async () => {
    if (!originalImage) {
      toast({
        title: 'Error',
        description: 'Please upload an image first.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setGeneratedImage(null);

    const finalPrompt = `${selectedTheme} ${customDescription}`;

    try {
      const result = await handleGenerateImage(originalImage, finalPrompt);
      if (result.error) {
        throw new Error(result.error);
      }
      setGeneratedImage(result.generatedPhotoDataUri || null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        title: 'Generation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = 'picperfect-product.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background text-foreground w-full">
      <header className="py-6 px-4 md:px-8 border-b border-border">
        <div className="container mx-auto">
          <h1 className="text-4xl font-headline font-bold text-primary">PicPerfect Products</h1>
          <p className="text-muted-foreground mt-1">AI-powered product photography, simplified.</p>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <Card className="shadow-lg sticky top-8">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <Wand2 className="text-accent" />
                Create Your Perfect Shot
              </CardTitle>
              <CardDescription>Upload an image and choose a style to transform your product photo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="image-upload" className="text-lg font-semibold font-headline">1. Upload Photo</Label>
                <div className="relative border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent transition-colors">
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {originalImage ? (
                    <div className="relative w-full h-48">
                      <Image src={originalImage} alt="Uploaded product" fill sizes="50vw" className="object-contain rounded-md"/>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                      <Upload className="w-10 h-10" />
                      <p>Drag &amp; drop or click to upload</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-lg font-semibold font-headline">2. Choose a Theme</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {themes.map((theme) => (
                    <Button
                      key={theme.name}
                      variant={selectedTheme === theme.prompt ? 'default' : 'outline'}
                      onClick={() => setSelectedTheme(theme.prompt)}
                      className="h-auto py-2 text-wrap"
                    >
                      {theme.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-description" className="text-lg font-semibold font-headline">3. Add Your Touch (Optional)</Label>
                <Textarea
                  id="custom-description"
                  placeholder="e.g., 'with a backdrop of cherry blossoms', 'on a wooden table'..."
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={generateImage} disabled={isLoading || !originalImage} className="w-full text-lg py-6">
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2" />
                    Generate Image
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Generated Image</CardTitle>
              <CardDescription>Your AI-powered product photo will appear here.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative w-full aspect-square bg-muted/20 rounded-lg flex items-center justify-center border">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-4 text-muted-foreground p-8 text-center">
                    <Wand2 className="w-12 h-12 animate-pulse text-accent"/>
                    <p className="text-lg font-medium">AI is crafting your image...<br/>This can take a moment.</p>
                    <Skeleton className="absolute inset-0 w-full h-full" />
                  </div>
                ) : generatedImage ? (
                  <Image src={generatedImage} alt="Generated product" fill sizes="50vw" className="object-contain rounded-md" />
                ) : (
                  <div className="text-center text-muted-foreground space-y-2 p-8">
                    <ImageIcon className="w-16 h-16 mx-auto" />
                    <p>Your image will be displayed here once generated.</p>
                  </div>
                )}
              </div>
            </CardContent>
            {generatedImage && !isLoading && (
              <CardFooter>
                <Button onClick={downloadImage} className="w-full" variant="secondary">
                  <Download className="mr-2" />
                  Download Image
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
