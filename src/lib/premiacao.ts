export type Premiacao = {
  totalCents: number;
  atual: { cents: number; label: string } | null;
  proximo: { cents: number; label: string } | null;
  progresso: number;
  conquistados: number;
  totalMarcos: number;
};
