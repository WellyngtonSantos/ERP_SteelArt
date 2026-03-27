// Motor de calculo do ERP MetalGestao

export function calcCustoEmpresaDia(custoFixoMensal: number, folhaSalarial: number): number {
  const diasUteis = 22
  return (custoFixoMensal + folhaSalarial) / diasUteis
}

export function calcValorHora(custoMensal: number): number {
  return custoMensal / 220
}

export function calcOrcamento(params: {
  custoMateriais: number
  custoMaoDeObra: number
  custoPintura: number
  margemLucro: number      // percentual
  margemCausalidade: number // percentual
  aliquotaImposto: number  // percentual
}): {
  custoBase: number
  custoComCausalidade: number
  imposto: number
  lucro: number
  precoFinal: number
} {
  const { custoMateriais, custoMaoDeObra, custoPintura, margemLucro, margemCausalidade, aliquotaImposto } = params

  const custoBase = custoMateriais + custoMaoDeObra + custoPintura
  const custoComCausalidade = custoBase * (1 + margemCausalidade / 100)
  const lucro = custoComCausalidade * (margemLucro / 100)
  const subtotal = custoComCausalidade + lucro
  const imposto = subtotal * (aliquotaImposto / 100)
  const precoFinal = subtotal + imposto

  return {
    custoBase,
    custoComCausalidade,
    imposto,
    lucro,
    precoFinal,
  }
}

export function calcDRE(params: {
  receitaBruta: number
  impostos: number
  insumos: number
  maoDeObra: number
  custosFixos: number
}): {
  receitaBruta: number
  impostos: number
  receitaLiquida: number
  custoTotal: number
  lucroLiquido: number
  margemLiquida: number
} {
  const { receitaBruta, impostos, insumos, maoDeObra, custosFixos } = params
  const receitaLiquida = receitaBruta - impostos
  const custoTotal = insumos + maoDeObra + custosFixos
  const lucroLiquido = receitaLiquida - custoTotal
  const margemLiquida = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0

  return {
    receitaBruta,
    impostos,
    receitaLiquida,
    custoTotal,
    lucroLiquido,
    margemLiquida,
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}
