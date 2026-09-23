import * as RadixDropdown from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import styles from "./DropdownMenu.module.css";

export interface DropdownItem {
  label: string;
  sub?: string;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function DropdownMenu({
  trigger,
  items,
  header,
}: {
  trigger: ReactNode;
  items: DropdownItem[];
  /** Optional block rendered above the items — e.g. name/email/role for an account menu. */
  header?: ReactNode;
}) {
  return (
    <RadixDropdown.Root>
      <RadixDropdown.Trigger asChild>{trigger}</RadixDropdown.Trigger>
      <RadixDropdown.Portal>
        <RadixDropdown.Content className={styles.content} sideOffset={6} align="end">
          {header ? <div className={styles.header}>{header}</div> : null}
          {items.map((item) => (
            <RadixDropdown.Item
              key={item.label}
              className={[styles.item, item.destructive && styles.destructive]
                .filter(Boolean)
                .join(" ")}
              disabled={item.disabled}
              onSelect={item.onSelect}
            >
              <div className={styles.itemLabel}>{item.label}</div>
              {item.sub ? <div className={styles.itemSub}>{item.sub}</div> : null}
            </RadixDropdown.Item>
          ))}
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  );
}
