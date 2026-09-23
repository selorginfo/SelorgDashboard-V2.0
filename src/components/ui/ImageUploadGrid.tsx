import { useRef, useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { uploadProductImageToS3 } from "@/services/catalog/productImageService";
import styles from "./ImageUploadGrid.module.css";

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  max?: number;
  disabled?: boolean;
}

export function ImageUploadGrid({ images, onChange, max = 5, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAdd = images.length < max && !disabled;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const allowed = Math.min(files.length, max - images.length);
    if (allowed <= 0) return;
    setUploading(true);
    setError(null);
    const newUrls: string[] = [];
    for (let i = 0; i < allowed; i++) {
      try {
        const url = await uploadProductImageToS3(files[i]!);
        newUrls.push(url);
      } catch (e) {
        setError((e as Error).message ?? "Upload failed");
        break;
      }
    }
    setUploading(false);
    if (newUrls.length > 0) onChange([...images, ...newUrls]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(idx: number) {
    onChange(images.filter((_, i) => i !== idx));
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>
        {images.map((url, idx) => (
          <div key={idx} className={styles.slot}>
            <img src={url} alt={`Product image ${idx + 1}`} className={styles.thumb} />
            {!disabled && (
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => remove(idx)}
                title="Remove image"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}

        {canAdd && (
          <button
            type="button"
            className={styles.addSlot}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            title="Upload image"
          >
            {uploading ? (
              <Loader2 size={20} className={styles.spinner} />
            ) : (
              <>
                <Plus size={18} />
                <span>Upload</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}
      <p className={styles.hint}>
        Max {max} images · JPG/PNG/WEBP · 5MB each
        {images.length > 0 ? ` · ${images.length}/${max} uploaded` : ""}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
