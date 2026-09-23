import * as RadixTabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import styles from "./Tabs.module.css";

export function Tabs({
  value,
  onValueChange,
  tabs,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  tabs: string[];
  children?: ReactNode;
}) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange}>
      <RadixTabs.List className={styles.list}>
        {tabs.map((t) => (
          <RadixTabs.Trigger key={t} value={t} className={styles.trigger}>
            {t}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  );
}
