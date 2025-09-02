
'use server';

import { v4 as uuidv4 } from 'uuid';
import admin, { bucket } from '@/lib/firebaseAdmin';

interface SaveImagesParams {
    userId: string;
    imageURIs: string[];
    originalImageURI: string; // Can be data URI or public URL
    context: Record<string, any>;
}

interface SaveImagesResult {
    urls: string[];
    recordId: string;
}

export async function saveImagesAndCreateGenerationRecord({
    userId,
    imageURIs,
    originalImageURI,
    context,
}: SaveImagesParams): Promise<SaveImagesResult> {
    console.log('[storage.ts] Starting saveImagesAndCreateGenerationRecord for user:', userId);
    const generationId = uuidv4();
    const storagePaths: string[] = [];

    try {
        console.log('[storage.ts] Processing imageURIs:', imageURIs.map(uri => uri.substring(0, 50) + '...'));

        const uploadPromises = imageURIs.map(async (uri, index) => {
            if (!uri.startsWith('data:image')) {
                console.warn(`[storage.ts] Skipping upload for an invalid image URI at index ${index}.`);
                return null;
            }

            const imageBuffer = Buffer.from(uri.split('base64,')[1], 'base64');
            const fileType = uri.substring(uri.indexOf('image/'), uri.indexOf(';base64'));
            const extension = fileType.split('/')[1] || 'png';
            const fileName = `generations/${userId}/${generationId}/output_${index}.${extension}`;
            storagePaths.push(fileName);

            console.log(`[storage.ts] Preparing to upload. FileName: ${fileName}, FileType: ${fileType}`);
            
            const file = bucket.file(fileName);

            console.log(`[storage.ts] Attempting to save file: ${fileName}`);
            await file.save(imageBuffer, {
                metadata: {
                    contentType: fileType,
                    metadata: {
                        firebaseStorageDownloadTokens: uuidv4(),
                    },
                },
                public: true, 
            });
            console.log(`[storage.ts] Successfully saved file: ${fileName}`);
            
            return file.publicUrl();
        });

        const publicUrls = (await Promise.all(uploadPromises)).filter((url): url is string => url !== null);

        console.log('[storage.ts] Generated public URLs:', publicUrls);

        if (publicUrls.length === 0) {
            throw new Error('No images were successfully uploaded.');
        }

        const recordRef = admin.firestore().collection('generations').doc(generationId);
        await recordRef.set({
            userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            originalImageURI,
            urls: publicUrls,
            storagePaths: storagePaths, 
            status: 'success',
            context,
        });

        console.log(`[storage.ts] Successfully created Firestore record: ${generationId}`);
        return { urls: publicUrls, recordId: generationId };

    } catch (error) {
        console.error("[storage.ts] CRITICAL ERROR in saveImagesAndCreateGenerationRecord:", error);
        throw new Error("Failed to save generated images.");
    }
}
