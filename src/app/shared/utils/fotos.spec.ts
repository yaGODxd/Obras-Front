import { comRecebidoEm, formatarTamanhoFoto, rotuloTipoFoto } from './fotos';
import { FotoDiario } from '../../interfaces/foto';

describe('fotos do diário', () => {
  it('rótulos dos 6 tipos; desconhecido aparece como veio', () => {
    expect(rotuloTipoFoto('medidor_abertura')).toBe('Medidor na abertura');
    expect(rotuloTipoFoto('medidor_fechamento')).toBe('Medidor no fechamento');
    expect(rotuloTipoFoto('ocorrencia')).toBe('Ocorrência');
    expect(rotuloTipoFoto('livre')).toBe('Foto livre');
    expect(rotuloTipoFoto('cupom_fiscal')).toBe('Cupom fiscal');
    expect(rotuloTipoFoto('bomba_comboio')).toBe('Bomba do comboio');
    expect(rotuloTipoFoto('painel')).toBe('painel');
  });

  it('tamanho em KB ou MB', () => {
    expect(formatarTamanhoFoto(200)).toBe('1 KB');
    expect(formatarTamanhoFoto(850 * 1024)).toBe('850 KB');
    expect(formatarTamanhoFoto(1.25 * 1024 * 1024)).toBe('1,3 MB');
  });

  it('comRecebidoEm: copia recebidaEm para recebidoEm (quadro de horário suspeito), sem mexer no original', () => {
    const f = { id: 'f1', recebidaEm: '2026-10-18T12:05:00Z' } as FotoDiario;
    const copia = comRecebidoEm(f);
    expect(copia.recebidoEm).toBe('2026-10-18T12:05:00Z');
    expect(copia.recebidaEm).toBe('2026-10-18T12:05:00Z');
    expect('recebidoEm' in f).toBe(false);
  });
});
