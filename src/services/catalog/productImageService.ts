export async function uploadProductImageToS3(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);

  const token = localStorage.getItem("selorg-admin-token");
  const baseUrl = import.meta.env["VITE_API_BASE_URL"] || import.meta.env["VITE_API_URL"] || "http://localhost:3333";

  const res = await fetch(`${baseUrl}/api/v1/admin/products/upload-image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string }).message || "Image upload failed");
  }
  const body = data as { success?: boolean; data?: { url: string } };
  const url = body.data?.url;
  if (!url) throw new Error("No URL returned from upload");
  return url;
}
