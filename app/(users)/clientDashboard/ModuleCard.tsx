import Link from "next/link";
import ModuleIcons from "./ModuleIcons";
import styles from "./ModuleCard.module.css";
import type { FXModule } from "./lib/types";

interface ModuleCardProps {
  module: FXModule;
  propertyModuleId?: number;
}

export default function ModuleCard({
  module,
  propertyModuleId,
}: ModuleCardProps) {
  // If PropertyModule ID exists,
  // pass it through the URL.
  const href = propertyModuleId
    ? `/property-module/${propertyModuleId}`
    : module.href;

  return (
    <Link href={href} className={styles.card}>
      {module.badge && (
        <span className={styles.badge}>
          {module.badge}
        </span>
      )}

      <div className={styles.iconWrap}>
        <ModuleIcons id={module.id} />
      </div>

      <span className={styles.label}>
        {module.label}
      </span>
    </Link>
  );
}