
'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import type { ChangeEvent } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { handleGenerateImageIdeas, handleRefineImage, handleGenerateVariations } from '../actions';
import { Upload, Download, Wand2, Camera, RefreshCw, Sparkles, Image as ImageIcon, X, Copy, ImagePlus, Crop, Square, RectangleVertical } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-mobile';
import withAuth from '@/components/with-auth';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';


type AspectRatio = 'original' | 'square' | 'story';

const aspectRatios: Record<AspectRatio, { ratio: number; className: string }> = {
  original: { ratio: 1/1, className: 'aspect-square' }, // default, will be updated
  square: { ratio: 1 / 1, className: 'aspect-square' },
  story: { ratio: 9 / 16, className: 'aspect-[9/16]' },
};

function DashboardPage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isVarying, setIsVarying] = useState<boolean>(false);
  const [mode, setMode] = useState<'upload' | 'capture'>('upload');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [activeAspectRatio, setActiveAspectRatio] = useState<AspectRatio>('original');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();
 
  useEffect(() => {
    // Whenever generatedImages changes, select the first one as active by default
    if (generatedImages.length > 0 && !generatedImages.includes(activeImage || '')) {
      setActiveImage(generatedImages[0]);
    } else if (generatedImages.length === 0) {
      setActiveImage(null);
    }
  }, [generatedImages, activeImage]);


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
        setActiveImage(null);
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
        setActiveImage(null);
        setRefinementPrompt('');
        setMode('upload');
      }
    }
  };
  
  const switchCamera = () => {
    setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleRemoveImage = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setOriginalImage(null);
    setDisplayImage(null);
    setGeneratedImages([]);
    setActiveImage(null);
    setRefinementPrompt('');
    // Also reset the file input so the same file can be re-uploaded
    const input = document.getElementById('image-upload') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  };

  const handleInitialGeneration = async () => {
    if (!originalImage) {
      toast({ title: 'Error', description: 'Please upload or capture an image first.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setGeneratedImages([]);
    setActiveImage(null);
    setActiveAspectRatio('original');

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({ title: 'Generation Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRefinementGeneration = async () => {
    if (!activeImage) {
      toast({ title: 'Error', description: 'No image selected to refine.', variant: 'destructive' });
      return;
    }
    if (!refinementPrompt) {
      toast({ title: 'Error', description: 'Please enter your desired changes.', variant: 'destructive' });
      return;
    }
    
    setIsRefining(true);

    try {
      const result = await handleRefineImage(activeImage, refinementPrompt);
       if (result.error) {
        throw new Error(result.error);
      }
      if (result.generatedPhotoDataUri) {
          // Replace the active image with the new refined one
          const newImages = generatedImages.map(img => img === activeImage ? result.generatedPhotoDataUri! : img);
          setGeneratedImages(newImages);
          setActiveImage(result.generatedPhotoDataUri); // Keep the new one active
          setActiveAspectRatio('original');
      } else {
          throw new Error('Refinement failed to produce an image.');
      }
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
       toast({ title: 'Refinement Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsRefining(false);
      setRefinementPrompt('');
    }
  }

  const handleVariationGeneration = async () => {
    if (!activeImage) {
      toast({ title: 'Error', description: 'No image selected to generate variations from.', variant: 'destructive' });
      return;
    }
    setIsVarying(true);
    setGeneratedImages([]);
    setActiveImage(null);
    setActiveAspectRatio('original');

    try {
      const result = await handleGenerateVariations(activeImage);
      if (result.error) {
        throw new Error(result.error);
      }
      const validImages = (result.generatedImages || []).filter(img => !!img);
      if (validImages.length === 0) {
        throw new Error('The AI failed to generate any variations. Please try again.');
      }
      setGeneratedImages(validImages);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({ title: 'Variation Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsVarying(false);
    }
  }

  const handleRefinementKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isRefining && refinementPrompt) {
            handleRefinementGeneration();
        }
    }
  };

  const handleInitialKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          if (!isLoading && originalImage) {
              handleInitialGeneration();
          }
      }
  };

  const getCroppedImage = async (imageSrc: string, aspect: AspectRatio): Promise<string> => {
    if (aspect === 'original') return imageSrc;

    const image = document.createElement('img');
    image.src = imageSrc;
    await new Promise((resolve) => { image.onload = resolve; });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return imageSrc;

    const targetAspectRatio = aspectRatios[aspect].ratio;
    
    let srcX = 0, srcY = 0, srcWidth = image.width, srcHeight = image.height;
    const currentAspectRatio = image.width / image.height;

    if (currentAspectRatio > targetAspectRatio) {
        // Image is wider than target
        srcWidth = image.height * targetAspectRatio;
        srcX = (image.width - srcWidth) / 2;
    } else {
        // Image is taller than target
        srcHeight = image.width / targetAspectRatio;
        srcY = (image.height - srcHeight) / 2;
    }

    canvas.width = srcWidth;
    canvas.height = srcHeight;
    ctx.drawImage(image, srcX, srcY, srcWidth, srcHeight, 0, 0, srcWidth, srcHeight);
    
    return canvas.toDataURL('image/png');
  };

  const downloadImage = async (image: string | null) => {
    if (!image) return;
    const imageToDownload = await getCroppedImage(image, activeAspectRatio);
    const link = document.createElement('a');
    link.href = imageToDownload;
    link.download = `photo20-product-${activeAspectRatio}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyImage = async (image: string | null) => {
    if (!image) return;
    try {
      const imageToCopy = await getCroppedImage(image, activeAspectRatio);
      const response = await fetch(imageToCopy);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
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
          <Button onKeyDown={handleInitialKeyDown} onClick={handleInitialGeneration} disabled={isLoading || isVarying || !originalImage} className="w-full text-lg py-6">
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Ideas...
              </>
            ) : isVarying ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Variations...
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
          <CardDescription>Your AI-powered product photos. Click to select, refine, or generate variations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative w-full bg-muted/20 rounded-lg flex items-center justify-center border p-4">
            {isLoading || isVarying ? (
              <div className="flex flex-col items-center gap-4 text-muted-foreground p-8 text-center aspect-square w-full">
                <Wand2 className="w-12 h-12 animate-pulse text-accent"/>
                <p className="text-lg font-medium">AI is crafting your images...<br/>This can take a moment.</p>
                <Skeleton className="absolute inset-0 w-full h-full" />
              </div>
            ) : generatedImages.length > 0 ? (
                 <div className="flex flex-col gap-4 w-full">
                  {generatedImages.map((image, index) => (
                    <div 
                      key={index}
                      onClick={() => { setActiveImage(image); setActiveAspectRatio('original'); }}
                      className={cn(
                        "relative w-full aspect-square rounded-md overflow-hidden border-2 transition-all cursor-pointer group",
                        activeImage === image ? "border-primary shadow-lg" : "border-transparent hover:border-primary/50"
                      )}
                    >
                       <Image src={image} alt={`Generated product ${index + 1}`} fill sizes="50vw" className="object-contain" />
                    </div>
                  ))}
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4 text-muted-foreground p-8 text-center aspect-square w-full">
                    <ImageIcon className="w-12 h-12"/>
                    <p>Your results will be shown here.</p>
                </div>
            )}
          </div>

          {activeImage && !isLoading && !isVarying && (
            <>
              <div className="space-y-3 pt-4 border-t">
                  <Label className="text-lg font-semibold font-headline flex items-center gap-2">
                      <Crop className="text-accent" />
                      Aspect Ratio
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <ToggleGroup type="single" value={activeAspectRatio} onValueChange={(value: AspectRatio) => {if(value) setActiveAspectRatio(value)}} className="w-full sm:w-auto">
                        <ToggleGroupItem value="original" aria-label="Original aspect ratio" className="flex-1">
                            <ImageIcon className="h-4 w-4 mr-2"/> Original
                        </ToggleGroupItem>
                        <ToggleGroupItem value="square" aria-label="Square 1:1" className="flex-1">
                            <Square className="h-4 w-4 mr-2"/> Square
                        </ToggleGroupItem>
                        <ToggleGroupItem value="story" aria-label="Story 9:16" className="flex-1">
                            <RectangleVertical className="h-4 w-4 mr-2"/> Story
                        </ToggleGroupItem>
                    </ToggleGroup>
                     <div className="flex-1 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyImage(activeImage)} className="w-full"><Copy className="h-4 w-4 mr-2" />Copy</Button>
                      <Button size="sm" variant="outline" onClick={() => downloadImage(activeImage)} className="w-full"><Download className="h-4 w-4 mr-2" />Download</Button>
                    </div>
                  </div>
                  <div className={cn("relative w-full rounded-md overflow-hidden bg-muted/20 border transition-all", aspectRatios[activeAspectRatio]?.className)}>
                      <Image src={activeImage} alt="Active preview" fill className="object-cover" />
                  </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label htmlFor="refinement-prompt" className="text-lg font-semibold font-headline flex items-center gap-2">
                  <Sparkles className="text-accent" />
                  Refine or Vary Image
                </Label>
                <Textarea
                  id="refinement-prompt"
                  placeholder="e.g., 'make it brighter', 'change the background to a beach'..."
                  value={refinementPrompt}
                  onChange={(e) => setRefinementPrompt(e.target.value)}
                  onKeyDown={handleRefinementKeyDown}
                  className="min-h-[80px]"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button onClick={handleRefinementGeneration} disabled={isRefining || !refinementPrompt} className="w-full">
                    {isRefining ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Refining...
                        </>
                    ) : (
                        'Refine with Prompt'
                    )}
                  </Button>
                  <Button onClick={handleVariationGeneration} disabled={isVarying || isRefining || isLoading} variant="outline" className="w-full">
                      {isVarying ? (
                          <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                           Generating...
                          </>
                      ) : (
                          <><ImagePlus className="mr-2 h-4 w-4" /> Generate Variations</>
                      )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuth(DashboardPage);
