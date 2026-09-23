import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Input, FieldLabel } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { Category, CategoryFormInput } from "@/types/category";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  editing?: Category;
  defaultParentId?: string | null;
  onSubmit: (input: CategoryFormInput) => void;
  isLoading: boolean;
}

export function CategoryFormModal({ open, onOpenChange, categories, editing, defaultParentId, onSubmit, isLoading }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [sortOrder, setSortOrder] = useState("0");

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setDescription("");
      setImageUrl(editing?.imageUrl ?? "");
      setParentId(editing?.parentId ?? defaultParentId ?? "");
      setSortOrder(String(editing?.sortOrder ?? 0));
    }
  }, [open, editing, defaultParentId]);

  const topLevel = categories.filter((c) => c.parentId === null && c.id !== editing?.id);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      parentId: parentId || null,
      sortOrder: parseInt(sortOrder, 10) || 0,
      isActive: true,
    });
  }

  const isEdit = Boolean(editing);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit category" : defaultParentId ? "Add subcategory" : "New category"}
      footer={
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button size="sm" variant="secondary" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" isLoading={isLoading} onClick={handleSubmit as never}>
            {isEdit ? "Save changes" : "Create"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <FieldLabel>Name *</FieldLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fruits & Vegetables" required />
        </div>
        <div>
          <FieldLabel>Description</FieldLabel>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
        </div>
        <div>
          <FieldLabel>Image URL</FieldLabel>
          <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." type="url" />
        </div>
        <div>
          <FieldLabel>Parent category</FieldLabel>
          <Select
            value={parentId}
            onValueChange={setParentId}
            placeholder="— Top level —"
            options={[{ value: "", label: "— Top level —" }, ...topLevel.map((c) => ({ value: c.id, label: c.name }))]}
            aria-label="Parent category"
          />
        </div>
        <div>
          <FieldLabel>Sort order</FieldLabel>
          <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} type="number" min="0" />
        </div>
      </form>
    </Dialog>
  );
}
