/**
 * Fixed class block structure from the HiLow manual (Cap. 3, pág. 15-16).
 * Every class is ~45min and always includes Core/oblicuos regardless of the
 * day's rotating focus. The leg blocks ("Pierna Izquierda"/"Pierna Derecha")
 * touch all four lower sub-groups each class — the day's rotating lowerFocus
 * (see lib/rotation.ts) is the "eje principal" that should dominate those
 * blocks, with the other three sub-groups appearing in a complementary,
 * lighter role. Same idea for upperFocus within the "Tren superior" block
 * when it's a single-muscle day rather than "Full Upper".
 */
export interface ClassBlock {
  key: string;
  label: string;
  durationMinutes: number;
  focusDescription: string;
  notes: string;
}

export const CLASS_TEMPLATE: ClassBlock[] = [
  {
    key: "core",
    label: "Core",
    durationMinutes: 5,
    focusDescription: "Core",
    notes: "Calentamiento y activación de músculos centrales.",
  },
  {
    key: "pierna_izquierda",
    label: "Pierna Izquierda",
    durationMinutes: 10,
    focusDescription: "Center Glutes, Outer Glutes, Isquios, Aductores (pierna izquierda)",
    notes:
      "Fatiga la pierna antes de pasar a la siguiente. El enfoque principal del día domina este bloque; los otros sub-grupos aparecen de forma complementaria.",
  },
  {
    key: "oblicuos",
    label: "Oblicuos",
    durationMinutes: 5,
    focusDescription: "Core lateral",
    notes: "Activación de oblicuos.",
  },
  {
    key: "pierna_derecha",
    label: "Pierna Derecha",
    durationMinutes: 10,
    focusDescription: "Center Glutes, Outer Glutes, Isquios, Aductores (pierna derecha)",
    notes: "Mantener tiempo bajo tensión mínimo. Mismo enfoque principal que Pierna Izquierda.",
  },
  {
    key: "tren_superior",
    label: "Tren Superior",
    durationMinutes: 10,
    focusDescription: "Bíceps, Tríceps, Pecho, Espalda, Hombros",
    notes: "Secuencia completa para todo el tren superior, dominada por el enfoque del día.",
  },
  {
    key: "finisher",
    label: "Finisher",
    durationMinutes: 2,
    focusDescription: "Cardio + frecuencia cardíaca",
    notes: "Solo 2 movimientos sencillos que todos puedan realizar; sensación de logro.",
  },
  {
    key: "shavasana",
    label: "Shavasana",
    durationMinutes: 2,
    focusDescription: "Relajación",
    notes: "Recuperación y respiración.",
  },
  {
    key: "estiramiento",
    label: "Estiramiento",
    durationMinutes: 3,
    focusDescription: "Full body",
    notes: "Estiramiento de todos los grupos musculares trabajados.",
  },
];
