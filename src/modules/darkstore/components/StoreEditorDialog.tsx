import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, FieldLabel } from "@/components/ui/Input";
import { StoreLocationPicker } from "./StoreLocationPicker";
import {
  useCreateStore,
  useUpdateStore,
  type DarkStoreInput,
  type DarkStoreRecord,
} from "@/modules/darkstore/hooks/useStores";

interface StoreEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog is in edit mode. */
  existing?: DarkStoreRecord | null;
}

// Chennai as sane default center (project is India-based).
const DEFAULT_LAT = 13.0067;
const DEFAULT_LNG = 80.2571;

function emptyInput(): DarkStoreInput {
  return {
    name: "",
    code: "",
    location: { type: "Point", coordinates: [DEFAULT_LNG, DEFAULT_LAT] },
    address: { line1: "", line2: "", city: "", state: "", pincode: "" },
    serviceRadius: 5,
    isActive: true,
    operatingHours: { open: "06:00", close: "23:00" },
    avgPickPackTime: 5,
    contactPhone: "",
  };
}

function fromRecord(r: DarkStoreRecord): DarkStoreInput {
  return {
    name: r.name,
    code: r.code,
    location: r.location,
    address: r.address,
    serviceRadius: r.serviceRadius,
    isActive: r.isActive,
    operatingHours: r.operatingHours,
    avgPickPackTime: r.avgPickPackTime,
    contactPhone: r.contactPhone,
  };
}

export function StoreEditorDialog({ open, onOpenChange, existing }: StoreEditorDialogProps) {
  const [form, setForm] = useState<DarkStoreInput>(emptyInput);
  const [error, setError] = useState<string>("");
  const createMut = useCreateStore();
  const updateMut = useUpdateStore();
  const busy = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (open) {
      setForm(existing ? fromRecord(existing) : emptyInput());
      setError("");
    }
  }, [open, existing]);

  const [lng, lat] = form.location.coordinates;

  async function handleSave() {
    setError("");
    if (!form.name.trim() || !form.code.trim()) {
      setError("Name and code are required");
      return;
    }
    try {
      if (existing) {
        await updateMut.mutateAsync({ id: existing._id, patch: form });
      } else {
        await createMut.mutateAsync(form);
      }
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={existing ? `Edit dark store — ${existing.name}` : "Create dark store"}
      description="Set location, service radius, and operating details"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? "Saving…" : existing ? "Save changes" : "Create store"}
          </Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FieldLabel>Store name</FieldLabel>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Adyar Dark Store"
            />
          </div>
          <div>
            <FieldLabel>Store code</FieldLabel>
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="DS-Adyar-01"
              disabled={!!existing}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Location (click map or drag pin)</FieldLabel>
          <StoreLocationPicker
            latitude={lat}
            longitude={lng}
            radiusKm={form.serviceRadius}
            onChange={({ latitude, longitude }) =>
              setForm({ ...form, location: { type: "Point", coordinates: [longitude, latitude] } })
            }
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 8 }}>
            <div>
              <FieldLabel>Latitude</FieldLabel>
              <Input
                type="number"
                step="0.000001"
                value={lat}
                onChange={(e) =>
                  setForm({
                    ...form,
                    location: { type: "Point", coordinates: [lng, Number(e.target.value)] },
                  })
                }
              />
            </div>
            <div>
              <FieldLabel>Longitude</FieldLabel>
              <Input
                type="number"
                step="0.000001"
                value={lng}
                onChange={(e) =>
                  setForm({
                    ...form,
                    location: { type: "Point", coordinates: [Number(e.target.value), lat] },
                  })
                }
              />
            </div>
            <div>
              <FieldLabel>Service radius (km)</FieldLabel>
              <Input
                type="number"
                min={1}
                max={50}
                step={0.5}
                value={form.serviceRadius}
                onChange={(e) => setForm({ ...form, serviceRadius: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FieldLabel>Address line 1</FieldLabel>
            <Input
              value={form.address.line1}
              onChange={(e) => setForm({ ...form, address: { ...form.address, line1: e.target.value } })}
            />
          </div>
          <div>
            <FieldLabel>Address line 2</FieldLabel>
            <Input
              value={form.address.line2}
              onChange={(e) => setForm({ ...form, address: { ...form.address, line2: e.target.value } })}
            />
          </div>
          <div>
            <FieldLabel>City</FieldLabel>
            <Input
              value={form.address.city}
              onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })}
            />
          </div>
          <div>
            <FieldLabel>State</FieldLabel>
            <Input
              value={form.address.state}
              onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })}
            />
          </div>
          <div>
            <FieldLabel>Pincode</FieldLabel>
            <Input
              value={form.address.pincode}
              onChange={(e) => setForm({ ...form, address: { ...form.address, pincode: e.target.value } })}
            />
          </div>
          <div>
            <FieldLabel>Contact phone</FieldLabel>
            <Input
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
          <div>
            <FieldLabel>Opens</FieldLabel>
            <Input
              type="time"
              value={form.operatingHours.open}
              onChange={(e) =>
                setForm({ ...form, operatingHours: { ...form.operatingHours, open: e.target.value } })
              }
            />
          </div>
          <div>
            <FieldLabel>Closes</FieldLabel>
            <Input
              type="time"
              value={form.operatingHours.close}
              onChange={(e) =>
                setForm({ ...form, operatingHours: { ...form.operatingHours, close: e.target.value } })
              }
            />
          </div>
          <div>
            <FieldLabel>Avg pick/pack (min)</FieldLabel>
            <Input
              type="number"
              min={1}
              value={form.avgPickPackTime}
              onChange={(e) => setForm({ ...form, avgPickPackTime: Number(e.target.value) })}
            />
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <label style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 8 }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <span>Active (accepts orders)</span>
            </label>
          </div>
        </div>

        {error ? <div style={{ color: "#dc2626", fontSize: 13 }}>{error}</div> : null}
      </div>
    </Dialog>
  );
}
