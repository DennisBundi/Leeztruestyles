const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function uploadProductImages(files: File[]): Promise<string[]> {
  if (!files.length) return [];

  // Client-side validation to fail fast before upload
  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error("Invalid file type. Only JPEG, PNG, and WEBP are allowed.");
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error("File size exceeds 10MB limit.");
    }
  }

  const uploadPromises = files.map(async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload/image", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to upload image");
    }

    const { url } = await response.json();
    return url as string;
  });

  return Promise.all(uploadPromises);
}
