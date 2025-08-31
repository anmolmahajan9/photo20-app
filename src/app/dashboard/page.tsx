
'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { handleGenerateImageIdeas, handleRefineImage } from '../actions';
import { Upload, Download, Wand2, Camera, RefreshCw, Sparkles, Image as ImageIcon, X, Copy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-mobile';
import withAuth from '@/components/with-auth';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';


function DashboardPage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [activeCarouselImage, setActiveCarouselImage] = useState<string | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mode, setMode] = useState<'upload' | 'capture'>('upload');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
 
  useEffect(() => {
    if (!carouselApi || !generatedImages.length) return
 
    const handleSelect = () => {
      const selectedIndex = carouselApi.selectedScrollSnap();
      setActiveCarouselImage(generatedImages[selectedIndex]);
    }

    carouselApi.on("select", handleSelect)
    handleSelect(); // Set initial active image
 
    return () => {
      carouselApi.off("select", handleSelect)
    }
  }, [carouselApi, generatedImages])

  useEffect(() => {
    const getCameraPermission = async () => {
      if (mode === 'capture') {
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: cameraFacingMode 
            } 
          });
          setHasCameraPermission(true);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings to use this feature.',
          });
        }
      } else {
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
      }
    };

    getCameraPermission();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mode, cameraFacingMode, toast]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setOriginalImage(result);
        setDisplayImage(result);
        setGeneratedImages([]);
        setActiveCarouselImage(null);
        setRefinementPrompt('');
      };
      reader.readAsDataURL(file);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/png');
        setOriginalImage(dataUrl);
        setDisplayImage(dataUrl);
        setGeneratedImages([]);
        setActiveCarouselImage(null);
        setRefinementPrompt('');
        setMode('upload');
      }
    }
  };
  
  const switchCamera = () => {
    setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleRemoveImage = () => {
    setOriginalImage(null);
    setDisplayImage(null);
    setGeneratedImages([]);
    setActiveCarouselImage(null);
    setRefinementPrompt('');
  };

  const handleInitialGeneration = async () => {
    if (!originalImage) {
      toast({ title: 'Error', description: 'Please upload or capture an image first.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setGeneratedImages([]);
    setActiveCarouselImage(null);

    try {
      const result = await handleGenerateImageIdeas(originalImage);
      if (result.error) {
        throw new Error(result.error);
      }
      const validImages = (result.generatedImages || []).filter(img => !!img);
      if (validImages.length === 0) {
        throw new Error('The AI failed to generate any images. Please try again.');
      }
      setGeneratedImages(validImages);
      setActiveCarouselImage(validImages[0]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({ title: 'Generation Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRefinementGeneration = async () => {
    if (!activeCarouselImage) {
      toast({ title: 'Error', description: 'No image selected to refine.', variant: 'destructive' });
      return;
    }
    if (!refinementPrompt) {
      toast({ title: 'Error', description: 'Please enter your desired changes.', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    // Refinement only generates one image. We'll show just that one.
    setGeneratedImages([]); 

    try {
      const result = await handleRefineImage(activeCarouselImage, refinementPrompt);
       if (result.error) {
        throw new Error(result.error);
      }
      if (result.generatedPhotoDataUri) {
          setGeneratedImages([result.generatedPhotoDataUri]);
          setActiveCarouselImage(result.generatedPhotoDataUri);
      } else {
          throw new Error('Refinement failed to produce an image.');
      }
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
       toast({ title: 'Refinement Failed', description: errorMessage, variant: 'destructive' });
       // Restore previous images if refinement fails
       setGeneratedImages(generatedImages);
    } finally {
      setIsLoading(false);
      setRefinementPrompt('');
    }
  }

  const downloadImage = () => {
    if (!activeCarouselImage) return;
    const link = document.createElement('a');
    link.href = activeCarouselImage;
    link.download = 'photo20-product.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyImage = async () => {
    if (!activeCarouselImage) return;
    try {
      const response = await fetch(activeCarouselImage);
      const blob = await response.blob();
      const clipboardItem = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([clipboardItem]);
      toast({
        title: 'Image Copied',
        description: 'The generated image has been copied to your clipboard.',
      });
    } catch (error) {
      console.error('Failed to copy image:', error);
      toast({
        title: 'Copy Failed',
        description: 'Could not copy the image to the clipboard. Your browser may not support this feature.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start max-w-6xl mx-auto">
      <Card className="shadow-lg w-full">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <Wand2 className="text-accent" />
            Create Your Perfect Shot
          </CardTitle>
          <CardDescription>Upload an image and let our AI create professional product shots for you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="image-upload" className="text-lg font-semibold font-headline">1. Provide a Photo</Label>
            <Tabs value={mode} onValueChange={(value) => setMode(value as 'upload' | 'capture')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload"><Upload className="mr-2 h-4 w-4" />Upload</TabsTrigger>
                <TabsTrigger value="capture"><Camera className="mr-2 h-4 w-4" />Capture</TabsTrigger>
              </TabsList>
              <TabsContent value="upload">
                <div className="relative border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent transition-colors mt-2">
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {displayImage ? (
                    <div className="relative w-full h-48 group">
                      <Image src={displayImage} alt="Uploaded product" fill sizes="50vw" className="object-contain rounded-md"/>
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 z-10 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4"/>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                      <Upload className="w-10 h-10" />
                      <p>Drag &amp; drop or click to upload</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="capture">
                <div className="mt-2 space-y-4">
                  <div className="relative w-full aspect-video bg-muted/20 rounded-lg flex items-center justify-center border">
                    <video ref={videoRef} className="w-full aspect-video rounded-md" autoPlay muted playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  {hasCameraPermission === false && (
                      <Alert variant="destructive">
                        <AlertTitle>Camera Access Required</AlertTitle>
                        <AlertDescription>
                          Please allow camera access in your browser to use this feature.
                        </AlertDescription>
                      </Alert>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={capturePhoto} disabled={!hasCameraPermission} className="w-full">
                      <Camera className="mr-2" />
                      Take Photo
                    </Button>
                    {isMobile && (
                      <Button onClick={switchCamera} disabled={!hasCameraPermission} variant="outline" size="icon">
                          <RefreshCw className="h-4 w-4" />
                          <span className="sr-only">Switch Camera</span>
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleInitialGeneration} disabled={isLoading || !originalImage} className="w-full text-lg py-6">
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Ideas...
              </>
            ) : (
              <>
                <Wand2 className="mr-2" />
                Generate Images
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card className="shadow-lg w-full">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Generated Images</CardTitle>
          <CardDescription>Your AI-powered product photos will appear here. Refine them further below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative w-full aspect-square bg-muted/20 rounded-lg flex items-center justify-center border">
            {isLoading ? (
              <div className="flex flex-col items-center gap-4 text-muted-foreground p-8 text-center">
                <Wand2 className="w-12 h-12 animate-pulse text-accent"/>
                <p className="text-lg font-medium">AI is crafting your images...<br/>This can take a moment.</p>
                <Skeleton className="absolute inset-0 w-full h-full" />
              </div>
            ) : generatedImages.length > 0 ? (
                <Carousel setApi={setCarouselApi} className="w-full h-full">
                  <CarouselContent>
                    {generatedImages.map((image, index) => (
                      <CarouselItem key={index}>
                        <div className="relative w-full h-full aspect-square">
                           <Image src={image} alt={`Generated product ${index + 1}`} fill sizes="50vw" className="object-contain rounded-md" />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
            ) : (
                <div className="flex flex-col items-center gap-4 text-muted-foreground p-8 text-center">
                    <ImageIcon className="w-12 h-12"/>
                    <p>Your results will be shown here.</p>
                </div>
            )}
          </div>

          {activeCarouselImage && !isLoading && (
            <div className="space-y-3 pt-4 border-t">
              <Label htmlFor="refinement-prompt" className="text-lg font-semibold font-headline flex items-center gap-2">
                <Sparkles className="text-accent" />
                Refine Selected Image
              </Label>
              <Textarea
                id="refinement-prompt"
                placeholder="e.g., 'make it brighter', 'change the background to a beach'..."
                value={refinementPrompt}
                onChange={(e) => setRefinementPrompt(e.target.value)}
                className="min-h-[80px]"
              />
              <Button onClick={handleRefinementGeneration} disabled={isLoading || !refinementPrompt} className="w-full">
                 {isLoading ? (
                    'Regenerating...'
                 ) : (
                    'Regenerate with Changes'
                 )}
              </Button>
            </div>
          )}
        </CardContent>
        {activeCarouselImage && !isLoading && (
          <CardFooter className="flex gap-2">
            <Button onClick={copyImage} className="w-full" variant="secondary">
              <Copy className="mr-2" />
              Copy Image
            </Button>
            <Button onClick={downloadImage} className="w-full" variant="secondary">
              <Download className="mr-2" />
              Download Image
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

export default withAuth(DashboardPage);
