// Formatação única de números para telas e PDFs, no padrão brasileiro (1.234,56).
// Nas telas, o pipe "number" do Angular já usa pt-BR; isto é para o código TypeScript (PDFs, textos montados).

export function formatarNumero(valor: number | null | undefined, casas = 1): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '-';
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function formatarMoeda(valor: number | null | undefined): string {
  const numero = formatarNumero(valor, 2);
  return numero === '-' ? '-' : `R$ ${numero}`;
}

// "horimetro" mede horas de trabalho (máquinas); o resto mede km.
export function unidadeMedidor(tipoMedidor: string | null | undefined): 'h' | 'km' {
  return tipoMedidor === 'horimetro' ? 'h' : 'km';
}

// Medidor com até 1 casa decimal e a unidade: "12.345,5 km" / "1.200 h".
export function formatarMedidor(valor: number | null | undefined, tipoMedidor: string | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '-';
  const numero = valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  return `${numero} ${unidadeMedidor(tipoMedidor)}`;
}
