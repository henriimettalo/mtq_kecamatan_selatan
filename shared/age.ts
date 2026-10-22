export interface Age {
  years: number;
  months: number;
  days: number;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function calculateAge(birthDate: string, referenceDate: string): Age {
  const birth = new Date(birthDate + "T00:00:00");
  const ref = new Date(referenceDate + "T00:00:00");

  let years = ref.getFullYear() - birth.getFullYear();
  let months = ref.getMonth() - birth.getMonth();
  let days = ref.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = ref.getMonth() === 0 ? 12 : ref.getMonth();
    const prevYear = ref.getMonth() === 0 ? ref.getFullYear() - 1 : ref.getFullYear();
    const dim = daysInMonth(prevYear, prevMonth);
    const effectiveBirthDay = Math.min(birth.getDate(), dim);
    days = ref.getDate() + (dim - effectiveBirthDay);
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days };
}
