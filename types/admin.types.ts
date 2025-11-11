export interface Provider {
  providerId: string;
  userId: string;
  name: string;
  phoneNumber: string;
  providerType: string;
  specialization?: string;
  licenseNumber?: string;
  documentCount: number;
  profilePhotoUrl?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  submittedAt?: string;
  createdAt: string;
}

export interface ProviderDocument {
  type: string;
  filename: string;
  s3Key: string;
  uploadedAt: string;
  signedUrl?: string;
  error?: string;
}

export interface ProviderDetails {
  providerId: string;
  userId: string;
  name: string;
  phoneNumber: string;
  email?: string;
  providerType: string;
  specialization?: string;
  experience?: number;
  licenseNumber?: string;
  qualification?: string;
  documents?: ProviderDocument[];
  profilePhotoUrl?: string;
  profilePhotoSignedUrl?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  isAvailable: number;
  consultationFee?: number;
  homeVisitFee?: number;
  submittedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserProfile {
  userId: string;
  phoneNumber: string;
  name: string;
  email?: string;
  userType: 'patient' | 'provider';
  providerId?: string;
  providerType?: string;
  verificationStatus?: string;
  onboardingCompleted?: boolean;
  createdAt: string;
}
