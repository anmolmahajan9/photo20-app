
'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import type { ChangeEvent } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { handleGenerateFromTemplate, handleRefineImage, handleGenerateVariations } from '../actions';
import { Upload, Download, Wand2, Camera, RefreshCw, Sparkles, Image as ImageIcon, X, Copy, Orbit, Diamond, Leaf, Palette, Star, Zap, CheckSquare, Square } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-mobile';
import withAuth from '@/components/with-auth';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';


type GenerationStep = 'initial' | 'templates' | 'generating' | 'refining' | 'angles' | 'final';

const templates = [
  { name: 'Minimalist', icon: Zap, description: "Clean, simple, and focused on the product." },
  { name: 'Luxury', icon: Diamond, description: "Elegant, sophisticated, and high-end feel." },
  { name: 'Earthy', icon: Leaf, description: "Natural, organic, and rustic settings." },
  { name: 'Vibrant', icon: Palette, description: "Bold, colorful, and energetic scenes." },
  { name: 'Surprise Me', icon: Star, description: "Wildly creative, unexpected, and mind-blowing concepts." },
];

const angleOptions = [
    { id: 'top-down', label: 'Top-Down View' },
    { id: 'side-view', label: 'Side View' },
    { id: '45-degree', label: '45-Degree View' },
];

function DashboardPage() {
  const { user } = useAuth();
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState<string>('');
  
  const [generationStep, setGenerationStep] = useState<GenerationStep>('initial');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedAngles, setSelectedAngles] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isGeneratingAngles, setIsGeneratingAngles] = useState<boolean>(false);

  const [mode, setMode] = useState<'upload' | 'capture'>('upload');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();
 
  useEffect(() => {
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

  const resetState = () => {
    setOriginalImage(null);
    setDisplayImage(null);
    setGeneratedImages([]);
    setActiveImage(null);
    setRefinementPrompt('');
    setGenerationStep('initial');
    setSelectedTemplate(null);
    setSelectedAngles([]);
    const input = document.getElementById('image-upload') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        resetState();
        setOriginalImage(result);
        setDisplayImage(result);
        setGenerationStep('templates');
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
        resetState();
        setOriginalImage(dataUrl);
        setDisplayImage(dataUrl);
        setGenerationStep('templates');
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
    resetState();
  };

  const handleTemplateSelection = async (template: string) => {
    if (!originalImage || !user) {
      toast({ title: 'Error', description: 'Please upload an image and sign in.', variant: 'destructive' });
      return;
    }
    setSelectedTemplate(template);
    setIsLoading(true);
    setGenerationStep('generating');
    setGeneratedImages([]);
    
    try {
      console.log("[dashboard] CLIENT: Calling handleGenerateFromTemplate with template:", template);
      console.log("[dashboard] CLIENT: Original image length:", originalImage.length);
      const idToken = await user.getIdToken();
      console.log("[dashboard] CLIENT: Got idToken.");
      const result = await handleGenerateFromTemplate(idToken, originalImage, template);
      
      console.log("[dashboard] CLIENT: Result from server action:", result);
      if (result.error) throw new Error(result.error);
      
      const validImages = (result.generatedImages || []).filter(img => !!img);
      if (validImages.length > 0) {
        setGeneratedImages(validImages);
        setGenerationStep('final');
      } else {
        throw new Error('The AI failed to generate an image.');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error("[dashboard] CLIENT: Error during template selection:", error);
      toast({ title: 'Image Generation Failed', description: errorMessage, variant: 'destructive' });
      setGenerationStep('templates'); // Go back to template selection
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRefinementGeneration = async () => {
    if (!activeImage || !user) {
      toast({ title: 'Error', description: 'No image selected to refine.', variant: 'destructive' });
      return;
    }
    if (!refinementPrompt) {
      toast({ title: 'Error', description: 'Please enter your desired changes.', variant: 'destructive' });
      return;
    }
    
    setIsRefining(true);
    setGenerationStep('refining');

    try {
      const idToken = await user.getIdToken();
      const result = await handleRefineImage(idToken, activeImage, refinementPrompt);
       if (result.error) {
        throw new Error(result.error);
      }
      const validImages = (result.generatedImages || []).filter(img => !!img);
      if (validImages.length > 0) {
          const newImage = validImages[0];
          const newImages = generatedImages.map(img => img === activeImage ? newImage : img);
          setGeneratedImages(newImages);
          setActiveImage(newImage);
          setGenerationStep('final');
      } else {
          throw new Error('Refinement failed to produce an image.');
      }
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
       toast({ title: 'Refinement Failed', description: errorMessage, variant: 'destructive' });
       setGenerationStep('final');
    } finally {
      setIsRefining(false);
      setRefinementPrompt('');
    }
  }

  const handleAngleGeneration = async () => {
    if (!activeImage || !user) {
      toast({ title: 'Error', description: 'No image selected to generate new angles from.', variant: 'destructive' });
      return;
    }
    if (selectedAngles.length === 0) {
      toast({ title: 'Error', description: 'Please select at least one angle to generate.', variant: 'destructive' });
      return;
    }
    setIsGeneratingAngles(true);
    setGenerationStep('angles');

    try {
      const idToken = await user.getIdToken();
      const result = await handleGenerateVariations(idToken, activeImage, selectedAngles);
      if (result.error) {
        throw new Error(result.error);
      }
      const validImages = (result.generatedImages || []).filter(img => !!img);
      if (validImages.length === 0) {
        throw new Error('The AI failed to generate any new angles. Please try again.');
      }
      setGeneratedImages(prev => [...prev, ...validImages]);
      setGenerationStep('final');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({ title: 'Angle Generation Failed', description: errorMessage, variant: 'destructive' });
      setGenerationStep('final');
    } finally {
      setIsGeneratingAngles(false);
      setSelectedAngles([]);
    }
  }

  const handleAngleSelection = (angleId: string) => {
    setSelectedAngles(prev => 
      prev.includes(angleId) 
        ? prev.filter(id => id !== angleId)
        : [...prev, angleId]
    );
  };
  
  useEffect(() => {
    if(refinementPrompt) setSelectedAngles([]);
  }, [refinementPrompt]);

  useEffect(() => {
    if(selectedAngles.length > 0) setRefinementPrompt('');
  }, [selectedAngles]);


  const handleRefinementKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isRefining && refinementPrompt) {
            handleRefinementGeneration();
        }
    }
  };

  const downloadImage = async (e: React.MouseEvent<HTMLButtonElement>, image: string | null) => {
    e.stopPropagation();
    if (!image) return;
    const link = document.createElement('a');
    link.href = image;
    link.download = `photo20-product-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyImage = async (e: React.MouseEvent<HTMLButtonElement>, image: string | null) => {
    e.stopPropagation();
    if (!image) return;
    try {
      const response = await fetch(image);
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

  const isLoadingState = ['generating', 'refining', 'angles'].includes(generationStep) || isLoading || isRefining || isGeneratingAngles;


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start max-w-6xl mx-auto">
      <Card className="shadow-lg w-full">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <Wand2 className="text-accent" />
            Create Your Perfect Shot
          </CardTitle>
          <CardDescription>
            {generationStep === 'initial' && "1. Start by providing a photo of your product."}
            {generationStep === 'templates' && "2. Choose a style template to guide the AI."}
            {generationStep !== 'initial' && generationStep !== 'templates' && "Follow the steps on the right to create your image."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Tabs value={mode} onValueChange={(value) => setMode(value as 'upload' | 'capture')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" disabled={isLoadingState}><Upload className="mr-2 h-4 w-4" />Upload</TabsTrigger>
                <TabsTrigger value="capture" disabled={isLoadingState}><Camera className="mr-2 h-4 w-4" />Capture</TabsTrigger>
              </TabsList>
              <TabsContent value="upload">
                <div className="relative border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent transition-colors mt-2">
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isLoadingState}
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
                        disabled={isLoadingState}
                      >
                        <X className="h-4 w-4"/>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                      <Upload className="w-10 h-10" />
                      <p>Drag & drop or click to upload</p>
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
                    <Button onClick={capturePhoto} disabled={!hasCameraPermission || isLoadingState} className="w-full">
                      <Camera className="mr-2" />
                      Take Photo
                    </Button>
                    {isMobile && (
                      <Button onClick={switchCamera} disabled={!hasCameraPermission || isLoadingState} variant="outline" size="icon">
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
      </Card>

      <Card className="shadow-lg w-full">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">
            {generationStep === 'initial' && 'Generation Panel'}
            {generationStep === 'templates' && '2. Choose a Template'}
            {(generationStep === 'generating' || isLoading) && 'Generating...'}
            {generationStep === 'refining' && 'Refining Your Image...'}
            {generationStep === 'angles' && 'Generating New Angles...'}
            {generationStep === 'final' && 'Your Generated Images'}
          </CardTitle>
          <CardDescription>
            {generationStep === 'initial' && 'Your AI-powered tools will appear here once you upload a photo.'}
            {generationStep === 'templates' && 'Select a style to generate your perfect shot.'}
            {(generationStep === 'generating' || isLoading) && 'The AI is working its magic. This can take a moment.'}
            {generationStep === 'refining' && 'Applying your changes to the image.'}
            {generationStep === 'angles' && 'Creating new perspectives of your product.'}
            {generationStep === 'final' && 'Your results. Click an image to select it, then refine or generate more angles.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative w-full bg-muted/20 rounded-lg flex items-center justify-center border p-4 min-h-[400px]">
            {isLoadingState ? (
              <div className="flex flex-col items-center gap-4 text-muted-foreground p-8 text-center aspect-square w-full">
                <Wand2 className="w-12 h-12 animate-pulse text-accent"/>
                <p className="text-lg font-medium">AI is crafting your vision...<br/>Please wait.</p>
                <Skeleton className="absolute inset-0 w-full h-full" />
              </div>
            ) : generationStep === 'templates' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  {templates.map((template) => (
                    <Card
                      key={template.name}
                      onClick={() => handleTemplateSelection(template.name)}
                      className="p-4 hover:bg-accent/10 hover:border-accent cursor-pointer transition-all flex flex-col items-center justify-center text-center"
                    >
                      <template.icon className="w-8 h-8 mb-2 text-accent" />
                      <p className="font-semibold text-lg">{template.name}</p>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </Card>
                  ))}
                </div>
            ) : generatedImages.length > 0 ? (
                 <div className="grid grid-cols-2 gap-4 w-full">
                  {generatedImages.map((image, index) => (
                    <div 
                      key={index}
                      onClick={() => setActiveImage(image)}
                      className={cn(
                        "relative w-full aspect-square rounded-md overflow-hidden border-2 transition-all cursor-pointer group",
                        activeImage === image ? "border-primary shadow-lg" : "border-transparent hover:border-primary/50"
                      )}
                    >
                       <Image src={image} alt={`Generated product ${index + 1}`} fill sizes="25vw" className="object-contain" />
                       <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="outline" className="h-8 w-8 bg-black/50 hover:bg-black/75" onClick={(e) => copyImage(e, image)}>
                                <Copy className="h-4 w-4 text-white" />
                                <span className="sr-only">Copy Image</span>
                            </Button>
                            <Button size="icon" variant="outline" className="h-8 w-8 bg-black/50 hover:bg-black/75" onClick={(e) => downloadImage(e, image)}>
                                <Download className="h-4 w-4 text-white" />
                                <span className="sr-only">Download Image</span>
                            </Button>
                        </div>
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

          {activeImage && generationStep === 'final' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t">
              {/* Refine with Prompt Section */}
              <div className="space-y-3">
                <Label htmlFor="refinement-prompt" className="text-lg font-semibold font-headline flex items-center gap-2">
                  <Sparkles className="text-accent" />
                  1. Refine with Prompt
                </Label>
                <Textarea
                  id="refinement-prompt"
                  placeholder="e.g., 'make it brighter', 'change background to a beach'..."
                  value={refinementPrompt}
                  onChange={(e) => setRefinementPrompt(e.target.value)}
                  onKeyDown={handleRefinementKeyDown}
                  disabled={isRefining || isGeneratingAngles || selectedAngles.length > 0}
                  className="min-h-[80px]"
                />
                <Button onClick={handleRefinementGeneration} disabled={isRefining || isGeneratingAngles || !refinementPrompt} className="w-full">
                  {isRefining ? 'Refining...' : 'Refine Image'}
                </Button>
              </div>

              {/* Generate New Angles Section */}
              <div className="space-y-3">
                 <Label className="text-lg font-semibold font-headline flex items-center gap-2">
                   <Orbit className="text-accent" />
                   2. Generate New Angles
                 </Label>
                 <div className="space-y-2">
                    {angleOptions.map((angle) => (
                        <div
                            key={angle.id}
                            onClick={() => handleAngleSelection(angle.id)}
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-md border transition-colors cursor-pointer",
                                selectedAngles.includes(angle.id) ? "bg-accent/10 border-accent" : "bg-muted/40 hover:bg-accent/5",
                                (isRefining || isGeneratingAngles || !!refinementPrompt) && "cursor-not-allowed opacity-50"
                            )}
                        >
                            {selectedAngles.includes(angle.id) ? <CheckSquare className="h-5 w-5 text-primary"/> : <Square className="h-5 w-5 text-muted-foreground" />}
                            <span className="font-medium">{angle.label}</span>
                        </div>
                    ))}
                 </div>
                <Button onClick={handleAngleGeneration} disabled={isGeneratingAngles || isRefining || selectedAngles.length === 0} className="w-full">
                    {isGeneratingAngles ? 'Generating...' : 'Generate Selected Angles'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuth(DashboardPage);
