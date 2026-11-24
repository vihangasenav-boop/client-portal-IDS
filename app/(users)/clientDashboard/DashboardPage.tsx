"use client"

import { useEffect, useState } from "react";
import ModuleGrid from "./ModuleGrid";
import styles from "./DashboardPage.module.css";



export default function DashboardPage() {

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <ModuleGrid />
      </main>
    </div>
  );
}
