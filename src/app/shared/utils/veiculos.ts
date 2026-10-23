import { StatusVeiculo } from '../../interfaces/veiculo';

// Rótulos e cores dos status do veículo (o tipo StatusVeiculo fica em interfaces/veiculo.ts).
export const STATUS_VEICULO: readonly { valor: StatusVeiculo; rotulo: string; badge: string }[] = [
  { valor: 'disponivel', rotulo: 'Disponível', badge: 'badge-success' },
  { valor: 'em_uso', rotulo: 'Em uso', badge: 'badge-warning' },
  { valor: 'em_manutencao', rotulo: 'Em manutenção', badge: 'badge-error' },
  { valor: 'inativo', rotulo: 'Inativo', badge: 'badge-ghost' },
];

// Status desconhecido aparece como veio, em cinza.
export function rotuloStatusVeiculo(status: string): string {
  return STATUS_VEICULO.find(s => s.valor === status)?.rotulo ?? status;
}

export function badgeStatusVeiculo(status: string): string {
  return STATUS_VEICULO.find(s => s.valor === status)?.badge ?? 'badge-ghost';
}
