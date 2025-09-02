// src/services/storage.ts
'use server';

import { v4 as uuidv4 } from 'uuid';
import admin from '@/lib/firebaseAdmin';

interface SaveImagesParams {
    userId: string;
    imageURIs: string[];
    originalImageURI: string;
    context: Record<string, any>;
}

interface SaveImagesResult {
    generatedImageUrls: string[];
    recordId: string;
}

const BUCKET_NAME = `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;

export async function saveImagesAndCreateGenerationRecord({
    userId,
    imageURIs,
    originalImageURI,
    context,
}: SaveImagesParams): Promise<SaveImagesResult> {
    const bucket = admin.storage().bucket(BUCKET_NAME);
    const generationId = uuidv4();

    try {
        const uploadPromises = imageURIs.map(async (uri, index) => {
            const imageBuffer = Buffer.from(uri.split('base64,')[1], 'base64');
            const fileType = uri.substring(uri.indexOf('image/'), uri.indexOf(';base64'));
            const extension = fileType.split('/')[1];
            const fileName = `generations/${userId}/${generationId}_${index}.${extension}`;
            const file = bucket.file(fileName);

            await file.save(imageBuffer, {
                metadata: {
                    contentType: fileType,
                    metadata: {
                        firebaseStorageDownloadTokens: uuidv4(), // Required for public access
                    },
                },
                public: true, // Make the file publicly readable
            });
            
            // Return the public URL
            return file.publicUrl();
        });

        const generatedImageUrls = await Promise.all(uploadPromises);

        const recordRef = admin.firestore().collection('generations').doc(generationId);
        await recordRef.set({
            userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            originalImageURI, // In a real app, you'd upload this too and store the URL
            generatedImageUrls,
            context,
        });

        return { generatedImageUrls, recordId: generationId };

    } catch (error) {
        console.error("Error saving images or creating record:", error);
        throw new Error("Failed to save generated images.");
    }
}
