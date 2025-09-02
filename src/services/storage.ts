// src/services/storage.ts
'use server';

import { v4 as uuidv4 } from 'uuid';
import admin from '@/lib/firebaseAdmin';

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

// Hardcode the bucket name for reliability in the serverless environment.
const BUCKET_NAME = 'photo20-xx189.firebasestorage.app';

export async function saveImagesAndCreateGenerationRecord({
    userId,
    imageURIs,
    originalImageURI,
    context,
}: SaveImagesParams): Promise<SaveImagesResult> {
    const bucket = admin.storage().bucket(BUCKET_NAME);
    const generationId = uuidv4();
    const storagePaths: string[] = [];

    try {
        const uploadPromises = imageURIs.map(async (uri, index) => {
            if (!uri.startsWith('data:image')) {
                console.warn(`Skipping upload for an invalid image URI at index ${index}.`);
                return null;
            }

            const imageBuffer = Buffer.from(uri.split('base64,')[1], 'base64');
            const fileType = uri.substring(uri.indexOf('image/'), uri.indexOf(';base64'));
            const extension = fileType.split('/')[1] || 'png';
            const fileName = `generations/${userId}/${generationId}/output_${index}.${extension}`;
            storagePaths.push(fileName);
            
            const file = bucket.file(fileName);

            await file.save(imageBuffer, {
                metadata: {
                    contentType: fileType,
                    metadata: {
                        firebaseStorageDownloadTokens: uuidv4(),
                    },
                },
                public: true, 
            });
            
            return file.publicUrl();
        });

        const publicUrls = (await Promise.all(uploadPromises)).filter((url): url is string => url !== null);

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

        return { urls: publicUrls, recordId: generationId };

    } catch (error) {
        console.error("Error saving images or creating record:", error);
        throw new Error("Failed to save generated images.");
    }
}
